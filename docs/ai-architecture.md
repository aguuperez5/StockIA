# StockIA AI Architecture

## Objective and current gap

The repository had a product-recognition UI and `/api/recognition/analyze`, but the route only searched product text and returned hard-coded confidence values. The only vision implementation was `ai/StockIA_PoC_Identificacion_Productos.ipynb`. Its benchmark is synthetic and the PaddleOCR path was stubbed, so production accuracy is unknown.

The new design converts the notebook into an optional Python perception service. It is intentionally separate from the Express/Prisma business layer.

## Request path

```text
PhotoCapture
    │ authenticated JSON request with bounded image evidence
    ▼
Express recognition route ── no AI_SERVICE_URL ──► truthful 503 / manual search still works
    │ configured internal multipart call
    ▼
FastAPI image guard → Image Quality → ZXing Barcode → PaddleOCR → Consensus
    │ structured, non-persistent evidence (never a sale command)
    ▼
Express Catalog Match Agent → active products + warehouse stock
    ▼
Seller review → explicit cart action → existing server-side sale/stock validation
```

The perception service accepts JPEG, PNG, and WebP, caps bytes and decoded pixels, checks the claimed MIME type against the image contents, and returns no image data. It does not access the database. The backend sends only the captured image, not customer identity, prices, or inventory.

## Specialist agents

1. `ImageQualityAgent` measures resolution, brightness, and Laplacian sharpness; quality warnings are evidence, not claims that an image is good.
2. `BarcodeAgent` delegates decoding to zxing-cpp and validates EAN-8, UPC-A, EAN-13, and GTIN-14 check digits.
3. `OcrAgent` uses PaddleOCR's `predict()` pipeline to retain text and recognizer scores; it extracts candidate GTINs but does not trust OCR alone.
4. `ConsensusAgent` marks matching independent reads as corroborated, conflicting reads ambiguous, and single-source reads as requiring review. It never converts a checksum into certainty.
5. The Node `Catalog Match Agent` resolves valid identifiers against `Product.code`, then ranks bounded OCR-name candidates. Scores describe ranking, not probability.

The orchestrator is deterministic rather than an LLM-controlled multi-agent loop: this is a narrow perception workflow with known steps and safety-critical inventory writes. The OpenAI agent guide distinguishes autonomous LLM workflows from fixed workflows and recommends guardrails; StockIA keeps the fixed workflow and puts the human/backend checks at the write boundary. See the agent and library references in [`ai/README.md`](../ai/README.md).

## Scope boundary and evolution

The implemented agents cover the repository's existing photo-identification workflow. Do not label OCR or matching scores as reliable probabilities until real, consented holdout photos are evaluated. Candidate next agents are:

- **Demand forecast** (not implemented): predict units by product and warehouse over a chosen horizon, with seasonal-naive baselines and rolling-origin backtests before adopting a learned model.
- **Replenishment advisor** (not implemented): combine forecast, on-hand stock, supplier lead time, and safety-stock policy into an explainable suggestion; never create a purchase order automatically.
- **Conversational operations assistant** (not implemented): if requested, keep tools typed, permission-scoped, and read-only at first; never expose arbitrary SQL or direct stock writes.

These need explicit business targets, verified historical data, and acceptance thresholds; adding agent names without those inputs would create confident-looking but unvalidated outputs. Keep them as separate services/workflows so they cannot bypass sales or inventory invariants.

## Deployment and next decisions

The service listens on `127.0.0.1:8010` by default. Configure `AI_SERVICE_URL` in the backend; on shared deployments require the matching `AI_SERVICE_TOKEN` and `STOCKIA_AI_SHARED_TOKEN`, restrict network access, and set a timeout. The model runtime is lazy-loaded; OCR may be disabled or unavailable while barcode scanning remains operational. Pin model/dependency versions for releases.

Current schema has only unique `Product.code` (presented as SKU), not retail barcode aliases. Exact scans therefore work only when `code` is the GTIN. Before adding products with arbitrary SKUs or several package barcodes, add a separate barcode/identifier table with a unique normalized value and a migration. Do not silently overload SKU semantics.

Before production rollout, collect consented real photos and measure false accepts, exact-code recall, catalog top-k, ambiguity, and p95 latency using the protocol in [`ai/evaluation/README.md`](../ai/evaluation/README.md). The synthetic notebook set is a regression baseline only.
