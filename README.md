# StockAI — Frontend

Frontend de StockAI construido en React + Vite, cubriendo las pantallas y formularios
del backlog asignado a la parte de frontend del proyecto.

## Stack
- React 18 + Vite 6 (SB-011)
- React Router 7
- Lucide React (iconografía)
- Context API para estado global en memoria (productos, depósitos, clientes, ventas)
- CSS propio, responsive

## Ejecutar

```bash
npm install
npm run dev
```

Luego abrir la URL que indique Vite (por defecto http://localhost:5173).

Para generar el build de producción:

```bash
npm run build
npm run preview
```

## Backlog cubierto

| Item | Descripción | Dónde |
|---|---|---|
| SB-008 | Diseñar interfaces | Sistema de diseño en `src/styles.css` + componentes en `src/components/common.jsx`, aplicado a todas las pantallas |
| SB-011 | Configurar React | `vite.config.js`, `src/main.jsx`, estructura de carpetas `src/pages`, `src/context`, `src/utils` |
| SB-017 | Formulario de registro de usuarios | `src/pages/AuthPage.jsx` (modo `register`) |
| SB-022 | Formulario de alta de producto | `src/pages/products/ProductForm.jsx` (modo `create`) |
| SB-023 | Validaciones de frontend | `src/utils/validators.js`, aplicado en login/registro, alta/edición de producto, alta de depósito y nueva venta |
| SB-025 | Pantalla de edición de producto | `src/pages/products/ProductForm.jsx` (modo `edit`), ruta `/panel/productos/:id/editar` |
| SB-027 | Listado de productos | `src/pages/products/ProductList.jsx`, ruta `/panel/productos` |
| SB-028 | Búsqueda y filtrado | Filtros por texto, categoría y estado de stock en `ProductList.jsx` y `StockQuery.jsx` |
| SB-031 | Formulario de alta de depósito | `src/pages/deposits/DepositForm.jsx`, ruta `/panel/depositos/nuevo` |
| SB-033 | Pantalla de consulta de stock | `src/pages/stock/StockQuery.jsx`, ruta `/panel/stock` |
| SB-038 | Pantalla de nueva venta | `src/pages/sales/NewSale.jsx`, ruta `/panel/nueva-venta` |
| SB-039 | Selección manual de productos | Buscador + listado de resultados dentro de `NewSale.jsx` |
| SB-040 | Selección de cantidades | Control de cantidad (+/-, input) por ítem del carrito en `NewSale.jsx` |
| SB-041 | Cálculo de subtotal/total | Subtotal por ítem, subtotal general, IVA y total en `NewSale.jsx` |
| SB-048 | Pantalla de historial de ventas | `src/pages/sales/SalesHistory.jsx`, ruta `/panel/ventas` |

## Rutas incluidas

- `/login`, `/registro`
- `/panel` (dashboard)
- `/panel/nueva-venta`
- `/panel/ventas` (historial de ventas)
- `/panel/transferencias`, `/panel/transferencias/nueva`
- `/panel/productos`, `/panel/productos/nuevo`, `/panel/productos/:id/editar`
- `/panel/stock`
- `/panel/depositos`, `/panel/depositos/nuevo`
- `/panel/clientes`, `/panel/reportes` (fuera de alcance, quedan como placeholder)

## Datos y estado

No hay backend conectado todavía. Todo el estado (productos, depósitos, clientes, ventas)
vive en memoria dentro de `src/context/AppDataContext.jsx`, con datos de ejemplo precargados
y funciones de alta/edición que simulan lo que después haría la API:

- Crear/editar un producto lo agrega o actualiza en el listado y en la consulta de stock.
- Registrar una venta descuenta el stock del depósito de origen y aparece en el historial.
- Crear un depósito aparece inmediatamente en los selectores de depósito de todo el sistema.

Para producción, estas funciones (`addProduct`, `updateProduct`, `addDeposit`, `addSale`)
deben reemplazarse por llamadas a la API del backend.

La detección de productos por IA en Nueva Venta y Transferencias sigue simulada en frontend:
al subir una imagen se muestra una previsualización y un estado de detección. Esa parte debe
conectarse al backend/API de IA cuando esté disponible.

## Validaciones de frontend (SB-023)

`src/utils/validators.js` expone validadores reutilizables (`required`, `email`, `minLength`,
`numberGreaterThan`, `numberGreaterOrEqual`, `phone`, etc.) y un `validateForm(values, schema)`
que se usa en todos los formularios del proyecto. Los errores se muestran debajo de cada campo
y también como mensaje general al intentar enviar el formulario con datos inválidos.
