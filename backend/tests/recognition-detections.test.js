import test from "node:test";
import assert from "node:assert/strict";
import { buildRecognitionDetections } from "../services/recognition-detections.js";

const evidence = (value, source, checksum_valid = true) => ({
  value,
  source,
  checksum_valid,
});

test("distinguishes bars, printed numbers and both, even with no local catalog match", async () => {
  for (const [sources, expected] of [
    [["barcode"], "barcode"],
    [["ocr"], "ocr_code"],
    [["barcode", "ocr"], "barcode_ocr"],
  ]) {
    const requests = [];
    const [detection] = await buildRecognitionDetections(
      {
        status: sources.length > 1 ? "corroborated" : "needs_review",
        identifiers: sources.map((source) => evidence("7791337603615", source)),
      },
      {
        lookup: async (code) => {
          requests.push(code);
          return { status: "found", product: { name: "Yogur" } };
        },
      },
    );
    assert.equal(detection.matchMethod, expected);
    assert.equal(detection.reviewRequired, sources.length === 1);
    assert.deepEqual(requests, ["7791337603615"]);
    assert.equal(detection.catalogLookup.product.name, "Yogur");
  }
});

test("queries every distinct detection and preserves ambiguity when the external catalog is unavailable", async () => {
  const requests = [];
  const detections = await buildRecognitionDetections(
    {
      status: "ambiguous",
      identifiers: [
        evidence("7791337603615", "barcode"),
        evidence("7790070410115", "ocr"),
      ],
    },
    {
      lookup: async (code) => {
        requests.push(code);
        return {
          provider: "openfoodfacts",
          status: "rate_limited",
          httpStatus: 429,
        };
      },
    },
  );
  assert.equal(requests.length, 2);
  assert.equal(detections.length, 2);
  assert.ok(
    detections.every(
      (item) =>
        item.reviewRequired && item.catalogLookup.status === "rate_limited",
    ),
  );
});

test("deduplicates equivalent UPC/EAN evidence within a scan but queries again on the next scan", async () => {
  const requests = [];
  const analysis = {
    status: "corroborated",
    identifiers: [
      evidence("042100005264", "ocr"),
      evidence("0042100005264", "barcode"),
      evidence("0042100005264", "barcode"),
    ],
  };
  const options = {
    lookup: async (code) => {
      requests.push(code);
      return { status: "not_found" };
    },
  };
  for (let scan = 0; scan < 2; scan += 1) {
    const detections = await buildRecognitionDetections(analysis, options);
    assert.equal(detections.length, 1);
    assert.equal(detections[0].matchMethod, "barcode_ocr");
  }
  assert.deepEqual(requests, ["0042100005264", "0042100005264"]);
});

test("does not send invalid, malformed or untrusted identifier evidence to the external catalog", async () => {
  const result = await buildRecognitionDetections(
    {
      identifiers: [
        evidence("7791337603610", "barcode"),
        evidence("7791337603615", "ocr", false),
        evidence("not-a-code", "ocr"),
        evidence("7791337603615", "unknown"),
      ],
    },
    {
      lookup: async () =>
        assert.fail("invalid identifiers must not be queried"),
    },
  );
  assert.deepEqual(result, []);
});

test("keeps detection evidence when an unexpected lookup failure occurs", async () => {
  const [detection] = await buildRecognitionDetections(
    { identifiers: [evidence("7791337603615", "barcode")] },
    {
      lookup: async () => {
        throw new Error("unexpected provider failure");
      },
    },
  );
  assert.equal(detection.value, "7791337603615");
  assert.equal(detection.matchMethod, "barcode");
  assert.equal(detection.catalogLookup.status, "unavailable");
});
