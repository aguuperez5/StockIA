# StockIA

Sistema de reconocimiento de productos para ventas y gestión de stock.

- `backend/` — API Express + Prisma + PostgreSQL.
- `frontend/` — UI Vite + React (Sprint 1: mock en memoria, aún no conectado al backend).

## Arranque rápido

```bash
docker compose up -d              # Postgres dedicado (puerto 5434)
cd backend
cp .env.example .env
npm install
npx prisma migrate deploy
npm run seed
npm start
```

## Documentación

- [Modelo de datos](docs/data-model.md)
- [Reglas de stock](docs/stock-rules.md)
- [Precios por cantidad](docs/pricing.md)
- [Instalación detallada](docs/installation.md)
- [Contrato de integración con Backend](docs/backend-integration.md)
