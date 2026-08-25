# Notas de integración con el backend

Estado real verificado (no solo documentado) al momento de escribir esto.

## Lo que ya funciona

- El servidor arranca (`npm start` en `backend/`, requiere Postgres — ver `docs/installation.md` en la raíz del repo).
- `POST /api/products`, `PUT /api/products/:id`, `POST /api/deposits`, `POST /api/sales` — el frontend pega contra estos endpoints reales, no solo simula.
- El frontend distingue dos clases de error al escribir:
  - El servidor **rechaza** la operación (SKU duplicado, stock insuficiente, depósito inexistente, etc.) → se muestra el error real en el formulario, **no** se guarda nada localmente ni se navega a la pantalla siguiente.
  - El servidor **no responde** (caído, red cortada) → se guarda en memoria ("modo demo") y se avisa con un toast. Este es el único caso en el que corresponde el fallback.
- Los IDs que devuelve la API se normalizan a `string` en `services/api.js` (`productFromApi`/`depositFromApi`) para ser consistentes con los IDs mock (`"prod-1"`) y con `useParams()` de React Router (siempre string) — antes de este fix, editar un producto creado contra la API real rompía la pantalla de edición.

## Lo que sigue pendiente

- **`POST /api/auth/login` no existe del lado del servidor.** `AuthPage` en modo login no llama a la API — directamente entra en modo demo con un aviso. No hay sesión ni token en ningún lado, y `/panel/*` no está protegido por ningún guard.
- **Ninguna pantalla de listado lee de la API todavía.** `ProductList`, `DepositList`, `StockQuery`, `SalesHistory` muestran el estado en memoria (seed local + lo que se agregó en la sesión del navegador). Solo las altas/ediciones pegan contra el servidor. Esto significa que, aunque el backend esté online, la lista visible puede no reflejar el estado real de la base de datos hasta que se implemente una carga inicial (`useEffect` + `api.products.list()`, etc.) que reemplace el estado inicial.
- La detección de productos por imagen (Nueva Venta, Transferencias) sigue simulada en frontend — no hay backend de reconocimiento todavía, es correcto que así sea para este Sprint.

## Indicador de conexión

La topbar muestra un badge (`CONECTADO` / `MODO DEMO` / `VERIFICANDO...`) basado en `apiStatus` del `AppDataContext`, que hace un ping a `GET /api/products` al montar la app.
