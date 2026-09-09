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
