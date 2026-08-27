# StockIA

Sistema de ventas y gestión de stock con React/Vite, Express/Prisma y PostgreSQL.

## Requisitos

- Node.js 22 o superior (el cliente Prisma generado se importa como `.ts`).
- Docker Desktop iniciado y con `docker compose` disponible.
- Puertos libres `5434` (PostgreSQL), `3000` (API) y `5173` (Vite).

## Configuración

Crear los archivos ignorados `.env` a partir de los ejemplos:

```powershell
Copy-Item backend\.env.example backend\.env
Copy-Item frontend\.env.example frontend\.env
```

El backend usa:

```dotenv
DATABASE_URL="postgresql://stockia:stockia@localhost:5434/stockia?schema=public"
PORT=3000
FRONTEND_URL=http://localhost:5173
```

El frontend usa `VITE_API_URL=http://localhost:3000/api`. Si la API corre dentro
de Docker, la URL de conexión de Prisma debe usar `postgres` como host; desde la
máquina host debe usar `localhost`.

## Levantar todo desde cero

Ejecutar cada bloque en una terminal separada, en este orden:

```powershell
# 1. Raíz: PostgreSQL persistente
docker compose up -d
docker ps
docker logs stockia-postgres
```

El compose usa `postgres:16-alpine`, expone `localhost:5434` y monta el volumen
`stockia-postgres-data`. Detener/eliminar el contenedor no borra los datos:
no usar `docker compose down -v` salvo que se quiera reiniciar la base.

```powershell
# 2. Backend
cd backend
npm install
npx prisma generate
npx prisma migrate deploy
npm run seed
npm run dev
```

La API queda en `http://localhost:3000`. Verificarla con
`Invoke-RestMethod http://localhost:3000/api/health`, que debe devolver
`{"status":"ok"}`. `migrate deploy` aplica las dos migraciones versionadas;
`seed` es idempotente y crea `admin@stockia.dev` con contraseña `test1234`.

```powershell
# 3. Frontend
cd frontend
npm install
npm run dev
```

Abrir `http://localhost:5173`, iniciar sesión con el usuario del seed y verificar
en DevTools > Network que las peticiones vayan a `http://localhost:3000/api`.

## Verificación funcional

1. Registrar o iniciar sesión: `POST /api/auth/register` y `POST /api/auth/login`.
2. Crear producto y depósito desde el panel; ambos deben aparecer en la base.
3. Cargar stock mediante el flujo de ajuste y consultar `/panel/stock`.
4. Crear una venta: la API valida stock, crea `Sale`/`SaleItem`, descuenta stock y
   registra un movimiento `OUT` en una única transacción.
5. Abrir `/panel/ventas` y confirmar el historial persistido.

Para inspeccionar los datos: `cd backend; npx prisma studio`. Para probar la
lógica del backend: `cd backend; npm test` (los tests limpian la base configurada,
por lo que no deben ejecutarse contra una base con datos importantes).

## Diagnóstico rápido

- `ECONNREFUSED 5434`: Docker no está iniciado o el contenedor no está activo;
  revisar `docker ps` y `docker logs stockia-postgres`.
- Error de Prisma/migración: comprobar que `DATABASE_URL` coincide exactamente
  con usuario, contraseña, base y puerto del compose.
- Error CORS: comprobar `FRONTEND_URL` y reiniciar el backend después de cambiar
  `.env`.
- La API responde pero la UI no actualiza: comprobar `VITE_API_URL` y reiniciar
  Vite; las variables `VITE_*` se leen al iniciar el proceso.

## Documentación adicional

- [Modelo de datos](docs/data-model.md)
- [Reglas de stock](docs/stock-rules.md)
- [Precios por cantidad](docs/pricing.md)
- [Instalación detallada](docs/installation.md)
- [Contrato de integración](docs/backend-integration.md)
