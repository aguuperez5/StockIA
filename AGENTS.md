# Repository Guidelines

## Project Structure & Module Organization

- `backend/` is the Express API; routes/controllers and Prisma schema/migrations/seeds stay in their existing folders. `backend/tests/` has serial `node:test` integration tests.
- `frontend/client/src/` is the active React/TypeScript UI (legacy JavaScript frontend has been removed).
- `backend/services/reconocimiento-tags/` contiene el microservicio de visión determinista basado en **AprilTags** (`FastAPI` + `OpenCV`), con `detector.py`, `api.py` y `generador_tags.py`.
- `ai/` contiene la exploración previa y prototipos anteriores (OCR / Barcode). `docs/` contiene las guías de arquitectura (ver `docs/reconocimiento-apriltags.md`); root Compose inicia PostgreSQL.

## Build, Test, and Development Commands

- `docker compose up -d` starts PostgreSQL on port `5434`.
- `npm run dev` starts the API; `npm run dev:frontend` starts Vite on port `3000`.
- Iniciar reconocimiento de AprilTags: en `backend/services/reconocimiento-tags`, activar `venv` y ejecutar `python api.py` (corre en el puerto `8000`).
- Generar tags imprimibles: `python backend/services/reconocimiento-tags/generador_tags.py`.
- `npm test` runs backend then frontend suites; use `npm run test:backend` or `npm run test:frontend` separately. Backend tests reset the test database.
- `npm run check:frontend` type-checks; `npm run build:frontend` builds the active UI.
- AI tests: `py -3.12 -m pip install -e "ai[test]"`, then `py -3.12 -m unittest discover -s ai/tests`.
- Run local AI with `py -3.12 -m uvicorn stockia_ai.app:app --app-dir ai/src --host 127.0.0.1 --port 8010`; set `AI_SERVICE_URL` in `backend/.env`. Or use `docker compose --profile ai up --build -d`. OCR is optional and requires `STOCKIA_INSTALL_OCR=true` at build time.
- With `backend/.env` configured, use root `npm run generate`/`npm run migrate`; `npm run seed` loads development data.

## Coding Style & Naming Conventions

Use backend ES modules and strict TypeScript/React in the active frontend. Follow Prettier: two spaces, semicolons, double quotes, and trailing commas. Use PascalCase components, camelCase functions/variables, and existing filename patterns (e.g. `stock.routes.js`, `*.test.ts`).

## Testing Guidelines

Backend tests use `node:test`; frontend tests use Vitest. Name tests `*.test.js` or `*.test.ts`. Backend `resetDb()` deletes table data: use only a disposable test database, never shared or production data.

## Commit & Pull Request Guidelines

Prefer concise imperative commit subjects (`feat: ...`, `fix: ...`; Spanish subjects also appear). PRs should describe behavior/migrations, link issues, list checks, and include UI screenshots when relevant.

## Security & Configuration

Keep credentials and database URLs in local env files; never commit secrets. Review migrations and test DB configuration before applying changes.
