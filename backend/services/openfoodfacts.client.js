import { canonicalGtin } from "./catalog-match.agent.js";

const DEFAULT_BASE_URL = "https://world.openfoodfacts.org";
const DEFAULT_USER_AGENT = "StockIA/1.0 (local development)";
const FIELDS = "code,product_name,product_name_es,product_name_en,brands";

// Sliding window shared by scans in this backend process; no product cache.
export function createProductReadLimiter({ now = Date.now } = {}) {
  let requests = [];
  let blockedUntil = 0;
  return {
    reserve() {
      const time = now();
      requests = requests.filter((started) => started > time - 60000);
      const next = Math.max(
        blockedUntil,
        requests.length >= 15 ? requests[0] + 60000 : 0,
      );
      if (next > time) return Math.ceil((next - time) / 1000);
      requests.push(time);
      return 0;
    },
    defer(seconds) {
      blockedUntil = Math.max(blockedUntil, now() + seconds * 1000);
    },
  };
}

const productReadLimiter = createProductReadLimiter();
const text = (value, length) =>
  typeof value === "string" ? value.trim().slice(0, length) || null : null;

export async function lookupOpenFoodFactsProduct(
  code,
  {
    baseUrl = process.env.OPENFOODFACTS_BASE_URL || DEFAULT_BASE_URL,
    userAgent = process.env.OPENFOODFACTS_USER_AGENT || DEFAULT_USER_AGENT,
    timeoutMs = Number(process.env.OPENFOODFACTS_TIMEOUT_MS) || 5000,
    fetchImpl = globalThis.fetch,
    limiter = productReadLimiter,
  } = {},
) {
  const provider = "openfoodfacts";
  if (typeof code !== "string" || !/^(?:\d{8}|\d{12,14})$/.test(code))
    return { provider, status: "invalid_response" };

  const retryAfterSeconds = limiter.reserve();
  if (retryAfterSeconds)
    return { provider, status: "rate_limited", retryAfterSeconds };

  const controller = new AbortController();
  const timeout = setTimeout(
    () => controller.abort(),
    Math.max(20, Math.min(timeoutMs, 8000)),
  );
  try {
    const url = new URL(
      `/api/v3.6/product/${encodeURIComponent(code)}.json`,
      baseUrl,
    );
    url.searchParams.set("fields", FIELDS);
    url.searchParams.set("lc", "es");
    const headers = { "User-Agent": userAgent, Accept: "application/json" };
    // OFF's public staging environment uses this documented Basic auth.
    if (url.hostname === "world.openfoodfacts.net")
      headers.Authorization = "Basic b2ZmOm9mZg==";
    const response = await fetchImpl(url, {
      headers,
      signal: controller.signal,
      redirect: "error",
    });
    if (!response.ok) {
      await response.body?.cancel().catch(() => undefined);
      if (response.status === 429) {
        const retry = response.headers.get("Retry-After");
        const seconds =
          Number(retry) || (Date.parse(retry) - Date.now()) / 1000;
        const wait =
          Number.isFinite(seconds) && seconds > 0 ? Math.ceil(seconds) : 60;
        limiter.defer(wait);
        return {
          provider,
          status: "rate_limited",
          httpStatus: 429,
          retryAfterSeconds: wait,
        };
      }
      return {
        provider,
        status: response.status === 404 ? "not_found" : "unavailable",
        httpStatus: response.status,
      };
    }
    const payload = await response.json();
    if (payload?.result?.id === "product_not_found")
      return { provider, status: "not_found", httpStatus: response.status };
    const product = payload?.product;
    if (
      payload?.status !== "success" ||
      payload?.result?.id !== "product_found" ||
      !product ||
      typeof product.code !== "string" ||
      canonicalGtin(product.code) !== canonicalGtin(code)
    )
      return {
        provider,
        status: "invalid_response",
        httpStatus: response.status,
      };

    return {
      provider,
      status: "found",
      httpStatus: response.status,
      product: {
        code: product.code,
        name:
          text(product.product_name_es, 160) ||
          text(product.product_name, 160) ||
          text(product.product_name_en, 160),
        brand: text(product.brands, 100),
        url: `https://world.openfoodfacts.org/product/${encodeURIComponent(product.code)}`,
      },
    };
  } catch {
    return {
      provider,
      status: controller.signal.aborted ? "timeout" : "unavailable",
    };
  } finally {
    clearTimeout(timeout);
  }
}
