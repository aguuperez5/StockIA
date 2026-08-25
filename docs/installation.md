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

`.env.example` documenta las únicas dos variables que el código realmente lee:
- `DATABASE_URL` — cadena de conexión a Postgres (usada por Prisma).
- `PORT` — puerto HTTP del servidor Express (default 3000 si no se define).

No hay otros secretos en este Sprint (no hay JWT, no hay claves de servicios externos).

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

Sirve en `http://localhost:<PORT>` con rutas bajo `/api/{auth,products,deposits,stock,sales}`.

## 7. Tests

```bash
npm test
```

Corre contra la base definida en `DATABASE_URL` (usar la de desarrollo, nunca producción — los tests **borran todas las tablas** en cada `beforeEach`, ver [backend/tests/helpers.js](../backend/tests/helpers.js)). Se ejecuta con `--test-concurrency=1` porque los archivos de test comparten la misma base de datos y una limpieza concurrente entre archivos generaría condiciones de carrera.

## Notas sobre Prisma 7

Este proyecto usa el generador `prisma-client` (no el clásico `prisma-client-js`) con `output` custom (`backend/generated/prisma`). Dos consecuencias no obvias:
- El cliente **no** se importa desde `@prisma/client`, sino desde la ruta generada: `../generated/prisma/client.ts` (ver [backend/config/prisma.js](../backend/config/prisma.js)).
- `PrismaClient` ya no abre conexión implícita por `DATABASE_URL`: requiere un *driver adapter* explícito (`@prisma/adapter-pg`), pasado en el constructor.
