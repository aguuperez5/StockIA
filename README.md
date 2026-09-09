# StockIA

Sistema de reconocimiento de productos para ventas y gestión de stock.

- `backend/` — API Express + Prisma + PostgreSQL.
- `frontend/` — UI Vite + React conectada a la API.

## Arranque rápido

```bash
docker compose up -d              # Postgres dedicado (puerto 5434)
cd backend
npm install
# Windows: Copy-Item .env.example .env
# macOS/Linux: cp .env.example .env
npx prisma generate
npx prisma migrate deploy
npm run seed
npm start
```

En otra terminal:

```bash
cd frontend
npm install
npm run dev
```

La API queda en `http://localhost:3001` y Vite en `http://localhost:3000`.

## Documentación

- [Modelo de datos](docs/data-model.md)
- [Reglas de stock](docs/stock-rules.md)
- [Precios por cantidad](docs/pricing.md)
- [Instalación detallada](docs/installation.md)
- [Contrato de integración con Backend](docs/backend-integration.md)
