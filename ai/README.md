# StockIA AI Service

This directory turns the product-identification notebook into a local, replaceable perception service. It does not connect to PostgreSQL, persist photos, set prices, or write inventory. The Express API remains the authority for catalog data and sales.

## Agent responsibilities

| Agent | Responsibility |
| --- | --- |
| Image quality | Decode-safe dimensions, brightness, and blur diagnostics; reject unusably small images. |
| Barcode | Read retail codes with `zxing-cpp`, normalize GTINs, and validate check digits. |
| OCR | Read package text and code-like text with PaddleOCR; preserve its raw score as evidence. |
| Consensus | Compare independent barcode/OCR readings; emit `corroborated`, `needs_review`, `ambiguous`, or `no_detection`. |
| Catalog matcher (backend) | Resolve identifiers against active `Product.code` values and rank OCR-name candidates. Its `matchScore` is heuristic, not a calibrated probability. |

The orchestrator is a deterministic pipeline, not a collection of autonomous LLMs. Product recognition has explicit inputs and auditable evidence; an LLM tool loop would add cost and uncertainty without improving barcode checks. Suggestions are never added to the cart or sold automatically.

## Flow and contract

`PhotoCapture` sends the existing JPEG evidence to Express. Express authenticates the user, enforces its request-size limit, and forwards only the image to `POST /v1/analyze` as multipart field `image`. The Python service checks the optional shared token and total multipart cap before parsing/spooling, then validates format, image byte size, and pixel count. It returns evidence, diagnostics, request ID, and per-agent timings, never the image. Express resolves evidence to catalog rows and stock by warehouse. The seller reviews a suggestion and explicitly adds it; the sale endpoint revalidates price and stock.

Run locally from the repository root:

```powershell
py -3.12 -m venv ai/.venv
ai/.venv/Scripts/python -m pip install -e "ai[ocr-local,test]"
npm run dev:ai
```

Set `AI_SERVICE_URL=http://127.0.0.1:8010` in `backend/.env`. For a shared secret, set the same value in backend `AI_SERVICE_TOKEN` and AI `STOCKIA_AI_SHARED_TOKEN`. Without `AI_SERVICE_URL`, photo recognition returns an honest 503; text/SKU search remains available.

The core install includes FastAPI, OpenCV, Pillow, and zxing-cpp. The recommended local extra, `ocr-local`, installs RapidOCR with bundled ONNX models and CPU inference, without downloading weights during the first scan. The service prefers this reader when installed. PaddleOCR remains an alternative: install a platform-appropriate PaddlePaddle engine, then `python -m pip install -e "ai[ocr]"`. Its adapter uses `predict()` and may download weights on first inference. Set `STOCKIA_OCR_ENABLED=false` to disable OCR deliberately. `npm run dev:ai` reads the private `backend/.env` and maps `AI_SERVICE_TOKEN` to the AI service token.

## Local scanner checks and Open Food Facts samples

`npm run samples:ai` queries Open Food Facts API v3.6 without an API key, downloads three product records, and generates barcode labels with printed numbers in `ai/samples/openfoodfacts/`. `products.json` records source links and data license. Optional `--codes` and `--count` select up to six valid GTINs. Requests are paced five seconds apart; do not run simultaneous downloads/scans on the same IP because Open Food Facts allows 15 product reads/minute/IP. Failed or missing records are reported; names are never invented. The old sample folders retain their original provenance and are no longer used by the default commands.

`npm run evaluate:ai` runs the real barcode and OCR readers against every manifest entry, including digits-only, a blank image and multiple codes. These synthetic checks do not establish real-photo accuracy. Express queries Open Food Facts for every distinct valid identifier within the provider limit and shows the source (bars, printed OCR number, or both), metadata/attribution, missing products and retry delays. Prices and stock remain in the local catalog.

To download PNG labels with numbers below for the same products, run
`ai/.venv/Scripts/python ai/scripts/download_barcode_labels.py` after downloading
the product records. They are saved in
`ai/samples/openfoodfacts/etiquetas_descargadas/`, verified with the real barcode
reader and accompanied by a provenance manifest. The generator is bwip-js;
Open Food Facts supplies product identifiers and metadata.

The UI displays a decoded identifier even when no active product matches it. Products must have that identifier as their catalog code before they can be suggested for sale. Equivalent zero-padded UPC/EAN/GTIN values are supported. A valid unknown barcode does not fall back to an unrelated product with a similar OCR name. A short, readable barcode label is decoded before the resolution heuristic rejects it.

Run the domain and API tests with `ai/.venv/Scripts/python -m pip install -e "ai[test]"` and `ai/.venv/Scripts/python -m unittest discover -s ai/tests`. See [`evaluation/README.md`](evaluation/README.md) for the evaluation gate. The existing notebook's eight synthetic cases are useful regression fixtures, not a production accuracy claim; its OCR path was stubbed.

Alternatively, start the barcode-capable container with `docker compose --profile ai up --build -d`. The AI profile is opt-in and binds only to localhost. OCR is disabled in the image by default; enable it at build time with `STOCKIA_INSTALL_OCR=true` in the root `.env`, then rebuild. For token authentication, set `AI_SERVICE_TOKEN` in both the root `.env` (Compose) and `backend/.env` (Express). Set `AI_SERVICE_URL=http://127.0.0.1:8010` in `backend/.env` when the backend runs on the host; for a backend container, use the Compose service address instead.

## Operational constraints

- Never log or commit uploaded images, secrets, model weights, or real customer/product photos.
- Keep the AI service on a private/local network; its shared token is optional for local development and should be required in shared deployments.
- Product codes must contain the GTIN for exact barcode lookup to work. If StockIA needs arbitrary SKUs plus multiple retail barcodes per product, add a dedicated, unique barcode table and migration before rollout.
- OCR-name matching uses bounded substring candidate retrieval. If the catalog grows substantially, replace it with indexed PostgreSQL trigram/full-text search and measure recall before widening the candidate limit.

## Primary references

- [PaddleOCR v6 pipeline usage](https://www.paddleocr.ai/main/en/version3.x/pipeline_usage/OCR.html)
- [PaddleOCR installation and inference engines](https://github.com/PaddlePaddle/PaddleOCR/blob/main/docs/version3.x/installation.en.md)
- [PaddlePaddle installation guide](https://www.paddlepaddle.org.cn/documentation/docs/en/install/index_en.html)
- [zxing-cpp Python bindings](https://github.com/zxing-cpp/zxing-cpp/blob/master/wrappers/python/README.md)
- [RapidOCR local CPU package](https://pypi.org/project/rapidocr-onnxruntime/1.4.4/)
- [FastAPI file uploads](https://fastapi.tiangolo.com/tutorial/request-files/)
- [OpenAI: A practical guide to building agents](https://openai.com/business/guides-and-resources/a-practical-guide-to-building-ai-agents/)
