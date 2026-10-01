import test from "node:test";
import assert from "node:assert/strict";
import {
  createProductReadLimiter,
  lookupOpenFoodFactsProduct,
} from "../services/openfoodfacts.client.js";

const CODE = "3017620422003";
const found = (product = {}) => ({
  status: "success",
  result: { id: "product_found" },
  product: {
    code: CODE,
    product_name: "Nutella",
    brands: "Ferrero",
    ...product,
  },
});
const lookup = (options) =>
  lookupOpenFoodFactsProduct(CODE, {
    limiter: createProductReadLimiter(),
    ...options,
  });

test("reads v3.6 without an API key, limits fields and prefers the Spanish name", async () => {
  const requests = [];
  const options = {
    baseUrl: "https://world.openfoodfacts.org/",
    userAgent: "StockIA/1.0 (developer@example.test)",
    fetchImpl: async (url, request) => {
      requests.push({ url, request });
      return Response.json(found({ product_name_es: "Crema de avellanas" }));
    },
  };
  for (let scan = 0; scan < 2; scan += 1) {
    const result = await lookup(options);
    assert.equal(result.provider, "openfoodfacts");
    assert.equal(result.product.name, "Crema de avellanas");
    assert.equal(result.product.brand, "Ferrero");
    assert.equal(
      result.product.url,
      `https://world.openfoodfacts.org/product/${CODE}`,
    );
  }
  assert.equal(requests.length, 2);
  const { url, request } = requests[0];
  assert.equal(url.pathname, `/api/v3.6/product/${CODE}.json`);
  assert.equal(url.searchParams.get("lc"), "es");
  assert.equal(
    url.searchParams.get("fields"),
    "code,product_name,product_name_es,product_name_en,brands",
  );
  assert.equal(request.headers["User-Agent"], options.userAgent);
  assert.equal(request.headers["x-api-key"], undefined);
  assert.equal(request.headers.Authorization, undefined);
});

test("uses documented public staging credentials only for the staging host", async () => {
  await lookup({
    baseUrl: "https://world.openfoodfacts.net",
    fetchImpl: async (_url, { headers }) => {
      assert.equal(headers.Authorization, "Basic b2ZmOm9mZg==");
      return Response.json(found());
    },
  });
});

test("preserves product records missing a name without inventing one", async () => {
  const result = await lookup({
    fetchImpl: async () =>
      Response.json(found({ product_name: " ", brands: null })),
  });
  assert.equal(result.status, "found");
  assert.equal(result.product.name, null);
  assert.equal(result.product.brand, null);
});

test("accepts normalized UPC/EAN aliases but rejects another product or missing identifiers", async () => {
  const alias = await lookupOpenFoodFactsProduct("042100005264", {
    limiter: createProductReadLimiter(),
    fetchImpl: async () => Response.json(found({ code: "0042100005264" })),
  });
  assert.equal(alias.status, "found");
  for (const code of ["7790070410115", undefined]) {
    const result = await lookup({
      fetchImpl: async () => Response.json(found({ code })),
    });
    assert.equal(result.status, "invalid_response");
    assert.equal(result.product, undefined);
  }
});

test("distinguishes product_not_found from malformed or failed successful responses", async () => {
  const result = await lookup({
    fetchImpl: async () =>
      Response.json({ status: "failure", result: { id: "product_not_found" } }),
  });
  assert.equal(result.status, "not_found");
  for (const body of [
    {},
    { product: found().product },
    { ...found(), status: "failure" },
  ]) {
    assert.equal(
      (await lookup({ fetchImpl: async () => Response.json(body) })).status,
      "invalid_response",
    );
  }
});

test("reports missing products and provider failures without losing recognition", async () => {
  for (const [http, expected] of [
    [404, "not_found"],
    [403, "unavailable"],
    [503, "unavailable"],
  ]) {
    const result = await lookup({
      fetchImpl: async () => new Response("upstream error", { status: http }),
    });
    assert.equal(result.status, expected);
    assert.equal(result.httpStatus, http);
    assert.equal(result.product, undefined);
  }
  const failure = await lookup({
    fetchImpl: async () => {
      throw new Error("private connection details");
    },
  });
  assert.deepEqual(failure, {
    provider: "openfoodfacts",
    status: "unavailable",
  });
});

test("limits concurrent scans to 15 reads in a sliding minute and recovers after the window", async () => {
  let time = 100000;
  const limiter = createProductReadLimiter({ now: () => time });
  let requests = 0;
  const options = {
    limiter,
    fetchImpl: async () => {
      requests += 1;
      return Response.json(found());
    },
  };
  const results = await Promise.all(
    Array.from({ length: 16 }, () => lookup(options)),
  );
  assert.equal(requests, 15);
  assert.equal(results[15].status, "rate_limited");
  assert.equal(results[15].retryAfterSeconds, 60);
  time += 59999;
  assert.equal((await lookup(options)).status, "rate_limited");
  time += 1;
  assert.equal((await lookup(options)).status, "found");
  assert.equal(requests, 16);
});

test("honors upstream Retry-After across scans instead of retrying immediately", async () => {
  let time = 100000;
  const limiter = createProductReadLimiter({ now: () => time });
  const first = await lookup({
    limiter,
    fetchImpl: async () =>
      new Response("", { status: 429, headers: { "Retry-After": "90" } }),
  });
  assert.equal(first.retryAfterSeconds, 90);
  const blocked = await lookup({
    limiter,
    fetchImpl: async () => assert.fail("must respect provider cooldown"),
  });
  assert.equal(blocked.status, "rate_limited");
  assert.equal(blocked.retryAfterSeconds, 90);
  time += 90000;
  assert.equal(
    (await lookup({ limiter, fetchImpl: async () => Response.json(found()) }))
      .status,
    "found",
  );
});

test("aborts stalled queries instead of blocking image recognition indefinitely", async () => {
  const result = await lookup({
    timeoutMs: 20,
    fetchImpl: async (_url, { signal }) =>
      new Promise((_resolve, reject) => {
        signal.addEventListener("abort", () => reject(signal.reason), {
          once: true,
        });
      }),
  });
  assert.deepEqual(result, { provider: "openfoodfacts", status: "timeout" });
});
