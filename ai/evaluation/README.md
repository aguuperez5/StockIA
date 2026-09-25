# Recognition Evaluation

Do not tune thresholds on the same images used for reporting. The current PoC uses eight synthetic cases and stubbed OCR, so it cannot establish real-store accuracy.

## Dataset manifest

Keep images out of Git unless they are synthetic/public-domain and appropriately licensed. For consented real photos, store them in an access-controlled dataset outside this repository and commit only a manifest with relative paths, labels, and a stable sample ID. A JSONL row should contain:

```json
{"sample_id":"synthetic-001","image":"synthetic/barcode-clear.png","expected_gtins":["7791000000109"],"expected_products":["SKU-001"],"split":"test","source":"synthetic"}
```

Use `source: "consented_real"` only when documented consent and retention rules exist. Split by product/SKU and capture session, not randomly by near-duplicate image, to prevent leakage.

## Metrics and release gate

Report exact GTIN precision/recall, false accepted identifier rate, ambiguous/abstained rate, top-1 and top-5 catalog match, and p50/p95 latency. Break results down by barcode format, lighting, blur, distance, and device. Track barcode-only versus barcode+OCR corroboration separately; a valid checksum is not proof of a correct read.

Define acceptable thresholds with product owners before collecting the holdout set. A change that increases recall but materially increases false matches must not auto-promote; retain human review and server-side sale validation. Record commit, Python/dependency versions, OCR engine/model version, configuration, and dataset version with each report. Never treat the OCR score or catalog `matchScore` as a calibrated probability without calibration data.
