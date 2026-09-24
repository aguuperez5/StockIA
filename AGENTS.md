# Repository Guidelines

## Project Structure & Module Organization

- `backend/` contains the Node.js/Express API. Keep HTTP routes in `routes/`, request logic in `controllers/`, shared middleware/configuration in their existing modules, and database schema, migrations, and seed data under `prisma/`.
- `backend/tests/` contains serial Node test-runner integration tests.
- `frontend/client/src/` is the active React/TypeScript application; colocate page components, shared components, and API services in their existing folders. `frontend/src/` contains the older JavaScript UI.
- `ai/` holds computer-vision experiments; `docs/` holds project and architecture documentation. Root `docker-compose.yml` starts PostgreSQL.

## Build, Test, and Development Commands

- `docker compose up -d` starts PostgreSQL on port `5434`.
- `npm run dev` starts the API; `npm run dev:frontend` starts Vite on port `3000`.
- `npm test` runs backend tests followed by frontend Vitest tests. Use `npm run test:backend` or `npm run test:frontend` for one suite.
- `npm run check:frontend` runs strict TypeScript checking; `npm run build:frontend` creates the production frontend build.
- After configuring `backend/.env`, run `npm run generate` and `npm run migrate` from the workspace root as needed; `npm run seed` loads development data.

## Coding Style & Naming Conventions

Use ES modules in the backend and strict TypeScript/React in `frontend/client`. Follow the frontend Prettier config: two spaces, semicolons, double quotes, and trailing commas where supported. Use PascalCase for React components, descriptive camelCase for functions/variables, and preserve existing filename patterns (for example, `stock.routes.js`, `integration.controller.js`, and `*.test.ts`).

## Testing Guidelines

Backend tests use `node:test`; frontend tests use Vitest. Name tests `*.test.js` or `*.test.ts` and cover behavior at the relevant layer. Backend test helpers call `resetDb()` and delete table data, so configure tests to use a disposable database only—never a shared or production database.

## Commit & Pull Request Guidelines

Prefer concise imperative subjects, commonly `feat: ...` or `fix: ...`; recent history also contains short Spanish subjects and merge commits. Pull requests should describe behavior and relevant migrations, link an issue when available, list checks run, and include screenshots for visible UI changes.

## Security & Configuration

Keep credentials and database URLs in local environment files; never commit secrets. Review schema migrations and test database configuration before applying changes.
