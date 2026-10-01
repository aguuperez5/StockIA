# StockIA Backend

Express + Prisma + PostgreSQL. Exposes the REST API consumed by the StockIA frontend.

```text
Frontend :3000 → Backend :3001 → PostgreSQL :5434
```

Run from this directory:

```powershell
npm install
copy .env.example .env
npm run generate
npm run migrate:deploy
npm run seed
npm run dev
```

For local schema changes use `npm run migrate`; for CI/production use
`npm run migrate:deploy`. The seed is safe to run repeatedly and keeps the
development admin account (`admin@stockia.dev` / `test1234`) available.

Photo recognition calls the local perception service and queries Open Food Facts once for
each unique checksum-valid identifier on every scan, including local catalog
matches. Barcode and OCR evidence for the same GTIN share a single query within
that scan; results are not cached across scans. The authenticated response includes
`detections` with `matchMethod`, sources, local-catalog presence, and `catalogLookup`
containing provider, status, name/brand and an attribution link. Missing names
remain null. Provider errors and timeouts preserve the original
readings and do not create products, prices, or stock.

Each photo analysis prints `[OCR]` in the backend console with request ID,
recognized text and scores, extracted codes/checksums, OCR state and warnings.
Empty reads are logged as empty arrays; skipped OCR is identified explicitly.

Configure `AI_SERVICE_URL`, optional `OPENFOODFACTS_BASE_URL`,
`OPENFOODFACTS_USER_AGENT` and `OPENFOODFACTS_TIMEOUT_MS` in `backend/.env`.
Public reads need no API key. The client uses API v3.6, requests only product
code/name/brand, and identifies StockIA with a custom User-Agent; set a real
contact in the form `StockIA/1.0 (contact@example.com)` when deploying.
Configuration is resolved
relative to the backend directory; explicit process environment values keep
precedence. Staging (`https://world.openfoodfacts.net`) uses the documented
public Basic `off:off` credentials automatically.

The client permits at most 15 product reads in a sliding minute per backend
process and honors HTTP 429 Retry-After. When limited, the response keeps the
decoded code and local catalog match and includes `retryAfterSeconds` so the UI
can explain when to retry. There is no metadata cache across scans. Multiple
backend instances, the notebook and sample downloads sharing an IP need a shared
limiter before deployment; the in-memory limiter cannot coordinate them.
Open Food Facts covers food products and may have incomplete records. Its data
is under ODbL / Database Contents License; the UI links each result to its source.
See the [official API documentation](https://openfoodfacts.github.io/openfoodfacts-server/api/).
