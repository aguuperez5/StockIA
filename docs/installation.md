# Instalación — Backend StockIA

## Requisitos

- Node.js 22+ (usa strip de tipos nativo de Node para importar el cliente Prisma generado como `.ts`; no requiere `ts-node`).
- Docker (para levantar PostgreSQL localmente).

## 1. Base de datos

Desde la raíz del repo:

```bash
docker compose up -d
```

Levanta un Postgres 16 dedicado a StockIA en el contenedor `stockia-postgres`, puerto host **5434** (no interfiere con otros proyectos que puedan tener su propio Postgres en 5432/5433). Credenciales y base: `stockia`/`stockia`/`stockia` (ver [docker-compose.yml](../docker-compose.yml)).

## 2. Variables de entorno

```bash
cd backend
cp .env.example .env
```

`.env.example` documenta las variables que el backend realmente lee:
- `DATABASE_URL` — cadena de conexión a Postgres (usada por Prisma).
- `PORT` — puerto HTTP del servidor Express (default 3001 si no se define).
- `FRONTEND_URL` — origen permitido por CORS (default `http://localhost:3000`).
- `SESSION_SECRET` — secreto para firmar la cookie de sesión; usar uno aleatorio fuera de desarrollo.


## 3. Dependencias

```bash
npm install
```

## 4. Cliente Prisma y migraciones

```bash
npx prisma generate       # genera backend/generated/prisma (gitignored)
npx prisma migrate deploy # aplica las migraciones existentes (entorno limpio/CI)
# o, en desarrollo, para crear+aplicar nuevas migraciones:
npx prisma migrate dev
```

## 5. Datos de prueba (seed)

```bash
npm run seed
```

Reproducible e idempotente (usa `upsert`/`findOrCreate`): crea un usuario admin (`admin@stockia.dev` / `test1234`), dos depósitos, dos productos (uno con `PriceRule` de ejemplo) y su stock inicial.

## 6. Levantar el servidor

```bash
npm start        # producción
npm run dev       # con --watch
```

Sirve en `http://localhost:<PORT>` con rutas bajo `/api` (auth, products, warehouses, inventory, sales y transfers).

## 7. Tests

```bash
npm test
```

Corre contra la base definida en `DATABASE_URL` (usar la de desarrollo, nunca producción — los tests **borran todas las tablas** en cada `beforeEach`, ver [backend/tests/helpers.js](../backend/tests/helpers.js)). Se ejecuta con `--test-concurrency=1` porque los archivos de test comparten la misma base de datos y una limpieza concurrente entre archivos generaría condiciones de carrera.

## Notas sobre Prisma 7

El cliente se genera con `prisma-client-js` y usa el adaptador PostgreSQL `@prisma/adapter-pg` (ver `backend/config/prisma.js`).
