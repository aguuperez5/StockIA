# Estándar de Codificación y Buenas Prácticas de Ingeniería — StockIA

**Proyecto:** StockIA  
**Institución:** UTN – Facultad Regional San Francisco  
**Cátedra:** Ingeniería y Calidad de Software (Ciclo Lectivo 2026)  
**Documento normativo base:** [AGENTS.md](../AGENTS.md)

---

## 1. Principios Generales del Proyecto

Este documento establece las convenciones de desarrollo, formateo, arquitectura, gestión de errores, pruebas y control de versiones obligatorias para todos los módulos de **StockIA**.

El objetivo es asegurar:
1. **Legibilidad y homogeneidad:** Código uniforme que parezca escrito por una única persona.
2. **Robustez transaccional:** Garantía total de integridad de datos contables e inventario bajo condiciones de concurrencia.
3. **Mantenibilidad y desacoplamiento:** Lógica de negocio en funciones puras y servicios aislados, facilitando pruebas unitarias rápidas.
4. **Seguridad por diseño:** Cero exposición de secretos, protección contra sobregiros y control estricto de accesos por roles (RBAC).

---

## 2. Organización Modular y Estructura del Repositorio

- **`backend/`**: API RESTful en Node.js con módulos ES (`"type": "module"` en `package.json`).
  - `controllers/`: Controladores de ruta delegados a servicios.
  - `services/`: Lógica de negocio transaccional (`stock-transfer.service.js`, `recognition-detections.js`, `catalog-match.agent.js`).
  - `routes/`: Enrutamiento Express (`integration.routes.js`).
  - `prisma/`: Esquema de datos (`schema.prisma`), migraciones y seeds.
  - `tests/`: Pruebas de integración seriales con ejecutor nativo `node:test`.
- **`frontend/client/src/`**: Aplicación de interfaz activa (SPA) en React 19, TypeScript y Vite.
  - `components/`: Componentes modulares reutilizables organizados por dominio (`sales/`, `products/`, `transfers/`, etc.).
  - `pages/`: Pantallas de la aplicación con sus validaciones acopladas.
  - `lib/`: **Funciones puras de lógica de negocio** (`cartPreload.ts`, `pricing.ts`, `stockLevel.ts`).
  - `services/`: Clientes HTTP tipados (`api.ts`, `sales.ts`, `inventory.ts`).
- **`ai/`**: Microservicio de visión computacional en Python 3.12 (`stockia_ai`).
  - `src/stockia_ai/agents/`: Agentes especializados (`barcode.py`, `ocr.py`, `consensus.py`).
  - `src/stockia_ai/pipeline.py`: Orquestador principal de percepción.
  - `tests/`: Suites de pruebas unitarias y de integración de visión con `unittest`.
  - `samples/`: Banco canónico de imágenes de prueba reales para evaluación de robustez.
- **`docs/`**: Documentación académica, metodológica y técnica de arquitectura.

---

## 3. Formateo y Guía de Estilo

El proyecto sigue la configuración unificada de **Prettier**:

- **Indentación:** 2 espacios obligatorios (no tabuladores).
- **Punto y coma:** Siempre presentes al final de cada sentencia (`;`).
- **Comillas:** Dobles (`"`) tanto en TypeScript/JavaScript como en Python para cadenas de texto, salvo template literals (`` ` ``) para interpolación.
- **Trailing Commas:** Coma final obligatoria en objetos y arreglos multilínea (`"trailingComma": "all"` / `"es5"`).
- **Largo de línea:** Máximo 100-120 caracteres para evitar wrapping horizontal.

### Convenciones de Nomenclatura
- **Componentes React:** `PascalCase` (ej. `SaleCartLine.tsx`, `NewSaleModal.tsx`, `StockPage.tsx`).
- **Funciones y variables:** `camelCase` (ej. `unitPriceForQuantity`, `transferStock`, `suggestedQuantity`).
- **Constantes globales:** `UPPER_SNAKE_CASE` (ej. `ROLE.ADMIN`, `STOCK_LEVELS`, `JWT_SECRET`).
- **Archivos de prueba:** 
  - Backend: `*.test.js` (ej. `transfer-concurrency.test.js`).
  - Frontend: `*.test.ts` o `*.test.tsx` (ej. `pricing.test.ts`, `cartPreload.test.ts`).
  - Python: `test_*.py` (ej. `test_pipeline_samples.py`).
- **Rutas y controladores:** `dominio.routes.js`, `dominio.controller.js` (ej. `integration.routes.js`).

---

## 4. Manejo de Errores y Semántica HTTP

1. **Nunca devolver un 500 para errores de dominio o validación:**
   - Si el stock es insuficiente → `400 Bad Request` con mensaje descriptivo (disponible vs. solicitado).
   - Si un producto o depósito no existe → `404 Not Found`.
   - Si no hay credenciales o la sesión expiró → `401 Unauthorized`.
   - Si el rol no tiene privilegios para la acción → `403 Forbidden`.
   - Si el microservicio de IA no está disponible → `503 Service Unavailable`.
2. **Transformación de Excepciones de Base de Datos:**
   - La violación de constraint PostgreSQL `CHECK (quantity >= 0)` (código de error `23514`) debe atraparse y devolverse como `400 Bad Request` indicando "Stock insuficiente para completar la operación".
   - Violación de unicidad (`P2002` en Prisma) debe devolverse como `400 Bad Request` indicando el campo duplicado.
3. **Mensajes accesibles y comprensibles:**
   - El cliente debe recibir mensajes claros en español neutro, nunca stack traces o errores SQL internos en producción.

---

## 5. Reglas Transaccionales y de Concurrencia

1. **Atomicidad de Inventario:**
   Toda alteración de existencias debe realizarse dentro de una transacción `prisma.$transaction`.
2. **Prevención de Sobregiros (Race Conditions):**
   Queda terminantemente prohibido validar el stock con un `findUnique` y luego hacer un `decrement` ciego. Se debe utilizar la técnica de **descuento condicional atómico**:
   ```javascript
   const updated = await tx.stock.updateMany({
     where: {
       productId,
       depositId,
       quantity: { gte: quantityToDeduct },
     },
     data: {
       quantity: { decrement: quantityToDeduct },
     },
   });

   if (updated.count === 0) {
     const error = new Error("Stock insuficiente para completar la operación");
     error.status = 400;
     throw error;
   }
   ```
3. **Movimientos Contables con Signo:**
   - Todo cambio de balance genera su respectivo `StockMovement`.
   - En transferencias, se crean exactamente dos movimientos:
     - Origen: `quantity = -N`, `depositId = originId`.
     - Destino: `quantity = +N`, `depositId = destinationId`.
4. **Ventas en un Único Depósito:**
   Toda la venta despacha desde `Sale.depositId`. No se admite mezcla de sucursales en la misma transacción de venta.

---

## 6. Seguridad y Gestión de Sesiones

1. **Tokens JWT:**
   - Creados exclusivamente con biblioteca estándar `jsonwebtoken`, algoritmo HS256, expiración máxima de 7 días.
   - Payload mínimo: `{ userId }`. No almacenar datos sensibles (contraseñas, legajos) en el token.
2. **Cookies de Sesión:**
   - Flag `HttpOnly: true` obligatorio (inmune a ataques XSS).
   - Flag `SameSite: 'Lax'` para protección contra CSRF.
   - Flag `Secure: true` obligatorio cuando `NODE_ENV === 'production'`.
3. **Secretos e Inicialización Segura:**
   - Jamás commitear archivos `.env` o credenciales.
   - En producción, el servidor **aborta inmediatamente el arranque** si `SESSION_SECRET` o `JWT_SECRET` es nulo, débil o igual al valor por defecto.
4. **Reseteo de Rate Limiting:**
   - El limitador de intentos de login debe resetearse inmediatamente ante una autenticación exitosa para no penalizar a usuarios legítimos.

---

## 7. Pruebas y Validación Continua

- **Aislamiento Estricto:** Las pruebas de backend borran tablas con `resetDb()`. Debe ejecutarse **únicamente** sobre una base de datos local descartable (puerto 5434 de Docker), jamás sobre datos productivos o compartidos.
- **Paridad Frontend/Backend:** La lógica de cálculo de importes y descuentos por volumen en el frontend (`unitPriceForQuantity`) debe tener pruebas unitarias que certifiquen el 100 % de paridad con la respuesta de `createSaleCompat` del backend.
- **Suites Requeridas antes de Integrar:**
  ```bash
  npm run check:frontend   # Type-check estricto de TypeScript
  npm run test:frontend    # Vitest de frontend
  npm run test:backend     # node:test con PostgreSQL
  py -3.12 -m unittest discover -s ai/tests  # Tests de agentes e integración de IA
  npm run build:frontend   # Validación de empaquetado de producción
  ```

---

## 8. Guía de Commits y Pull Requests

- **Formato de Mensajes de Commit:** Imperativo y conciso, utilizando prefijos convencionales:
  - `feat: ...` para nuevas funcionalidades.
  - `fix: ...` para corrección de defectos o bugs.
  - `test: ...` para agregado o refactorización de pruebas.
  - `docs: ...` para actualización de especificaciones o informes.
  - `refactor: ...` para mejoras de diseño sin alteración funcional.
- **Checklist de Pull Request (PR):**
  - [ ] Describe claramente el objetivo del cambio y la historia de usuario vinculada.
  - [ ] No incluye secretos, credenciales ni archivos `.env`.
  - [ ] Todas las suites de pruebas pasan localmente (`check:frontend`, `test:frontend`, `test:backend`, `test:ai`).
  - [ ] Incluye capturas de pantalla o evidencias de UI cuando aplica.

---

## 9. Checklist de Revisión de Código (Code Review)

Antes de fusionar código a las ramas principales, el revisor debe verificar punto por punto:

### A. Seguridad y Control de Acceso
- [ ] ¿Los endpoints nuevos que modifican estado están protegidos con `requireAuth`?
- [ ] ¿Se valida el rol adecuado con `requireAppRole(...)` para restringir operaciones de administrador, caja o depósito?
- [ ] ¿Las cookies sensibles tienen los flags `HttpOnly`, `SameSite=Lax` y `Secure`?
- [ ] ¿Las contraseñas se hashean exclusivamente con `bcrypt` (10 rounds)?

### B. Transaccionalidad y Concurrencia
- [ ] ¿Toda escritura de stock y movimiento está envuelta en `prisma.$transaction`?
- [ ] ¿Se utiliza descuento condicional (`quantity: { gte: qty }`) para evitar lecturas sucias y sobregiros?
- [ ] ¿Se capturan violaciones del constraint PostgreSQL 23514 devolviendo HTTP 400?
- [ ] ¿Los movimientos contables tienen signo coherente (+/-) y un único `depositId`?

### C. Validación de Entrada y Resiliencia
- [ ] ¿Se validan todos los parámetros requeridos antes de interactuar con la base de datos?
- [ ] ¿Se manejan errores de servicio externo (IA caída o 503) de forma elegante y amigable?
- [ ] ¿El frontend valida formularios en tiempo real con mensajes accesibles (ARIA)?

### D. Pruebas y Calidad
- [ ] ¿El nuevo comportamiento cuenta con pruebas automatizadas (`node:test`, `vitest` o `unittest`)?
- [ ] ¿Se cubrieron los casos de borde (valores límite, listas vacías, stock cero)?
- [ ] ¿Se mantuvo la compatibilidad con rutas legadas existentes?

### E. Documentación
- [ ] ¿Se actualizaron los contratos en `backend-integration.md` si cambió algún endpoint?
- [ ] ¿La documentación técnica y diagramas reflejan el estado real del código?
