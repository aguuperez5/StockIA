# Plan de pruebas — StockIA

> Conversión y revisión del archivo fuente [Plan de Pruebas - StockIA.pdf](Plan%20de%20Pruebas%20-%20StockIA.pdf). Conserva el contenido del plan original y separa las observaciones de vigencia y las ampliaciones propuestas. Esta revisión es estática: no representa resultados de ejecución ni una aprobación de salida.

| Campo | Dato |
| :--- | :--- |
| Institución | UTN — Facultad Regional San Francisco |
| Carrera | Ingeniería en Sistemas de Información |
| Cátedra | Ingeniería y Calidad de Software |
| Ciclo lectivo | 2026 |
| Fecha de entrega del PDF | 23/09/2026 |
| Integrantes | Camino Matías, Mecchia Valentín, Perez Agustín, Sereno Facundo José |
| Profesores | Gandino Diego, Saldarini Javier Daniel |

## 1. Nota sobre el documento fuente

El índice del PDF no corresponde con su cuerpo. Enumera capítulos sobre el pivot tecnológico, las historias de usuario, el Sprint Backlog, la implementación, el repositorio, estimaciones y el modelo de datos, pero esos capítulos no aparecen desarrollados en el archivo. Este Markdown organiza el contenido que sí está en el PDF y deja constancia de esa diferencia; no inventa el contenido ausente.

Los títulos que sí aparecen en ese índice son: “Modificaciones del Product Backlog (Pivot Tecnológico)” (incluye nuevo requerimiento y PoC), “Historias de Usuario Implementadas”, “Sprint Backlog Utilizado y Descomposición del Trabajo” (ejemplos HU-02 y HU-08), “Implementación en el Sistema”, “Link al repositorio”, “Historias de Usuario Implementadas: Estimación y Valor Agregado” y “Modelo de Datos”. Se registran aquí como contenido del índice, no como secciones desarrolladas del plan.

La tabla funcional del PDF tiene celdas cuya alineación se pierde al extraer el texto. Para conservar sus seis escenarios, se reconstruyeron por la secuencia semántica: registro válido, registro incompleto, alta de producto, ajuste de stock, venta y reconocimiento visual. Los identificadores CP-RF-01 a CP-RF-06 siguen esa secuencia aparente; conviene contrastarlos con el PDF original antes de usarlos como identificadores contractuales.

El PDF denomina SPACEDIRT a su mnemotecnia de secciones y la atribuye a ISO/IEC/IEEE 29119-3. Se conserva SPACEDIRT como organización elegida para este plan, pero no se afirma que sea la plantilla normativa oficial: la ficha pública de [ISO/IEC/IEEE 29119-3:2021](https://www.iso.org/standard/79429.html) describe plantillas de documentación de pruebas y el PDF no identifica una cláusula o plantilla que respalde específicamente esa mnemotecnia.

## 2. S — Scope: alcance de las pruebas

El alcance declarado en el PDF es verificar las funcionalidades e infraestructura del Sprint 1, incluida la integración del procesamiento automático de imágenes mediante visión por computadora y OCR.

### 2.1 Dentro del alcance según el plan original

- **Seguridad y usuarios:** registro, validación de legajo y campos obligatorios (HU-01).
- **Productos y catálogo:** alta, edición, búsqueda, filtrado y listado de productos (HU-02, HU-03 y HU-04).
- **Depósitos e inventario:** alta de depósitos, consulta de existencias por depósito y ajuste manual de stock (HU-05, HU-06 y HU-07).
- **Ventas e inventario:** venta manual, subtotales y total, confirmación, comprobante, descuento automático de stock y movimiento de salida (HU-08 a HU-11).
- **PoC de reconocimiento:** captura de imagen, lectura de código con zxing-cpp y alternativa basada en OCR y búsqueda en catálogo local o API Codulia.
- **Requisitos no funcionales:** rendimiento de API REST, consistencia transaccional en PostgreSQL/Prisma, autenticación de rutas y tolerancia ante imágenes ilegibles.

### 2.2 Fuera del alcance en el sistema

- Reconocimiento de packaging mediante modelos pesados de aprendizaje automático como YOLO, descartado definitivamente en el pivot tecnológico.
- Captura de fotos y venta interactiva mediante Bot de Telegram (ítems 13.12 y 13.16 del Product Backlog general; la pantalla actual solo registra campañas en base de datos).
- Integración con controladores fiscales físicos o facturación electrónica externa (AFIP).

### 2.3 Evolución del alcance hacia el Sprint 2

En el plan preliminar del Sprint 1, funcionalidades como transferencias interdepósito, escalas de precios mayoristas por volumen, roles granulares y la integración del pipeline de visión se encontraban en fase exploratoria o diferidas. Para el **Sprint 2**, estos módulos se incorporan formalmente al alcance bajo las historias **HU-12 a HU-16**:
- **HU-12:** Seguridad, autenticación con JWT real en cookies HttpOnly y autorización por roles (`administrador`, `caja`, `deposito`).
- **HU-13:** Carga asistida por imagen en terminal de ventas (`POST /api/sales/scan`), conteo de unidades físicas, regla anti-doble conteo, precarga inteligente de carrito editable y alta asistida de no catalogados.
- **HU-14:** Transferencias interdepósito atómicas (`StockTransferService`) y prevención de sobregiros concurrentes.
- **HU-15:** Precios diferenciales por volumen en tiempo real en frontend con paridad matemática total con el backend.
- **HU-16:** Alertas de stock mínimo (`GET /api/inventory/low-stock`) y badges unificados.
- **Requisitos No Funcionales:** CP-RNF-04 (latencia de percepción < 1 s) y CP-RNF-05 (concurrencia de stock sin sobregiros).

El detalle metodológico completo para el Sprint 2 se desarrolla bajo la estructura formal SPACEDIRT en la [Sección 15](#15-plan-de-pruebas-del-sprint-2-estructura-spacedirt--isoiecieee-29119-3).

## 3. P — Personnel / People: personal y responsabilidades

Esta tabla conserva las asignaciones del PDF. Es una distribución propuesta de responsabilidades, no evidencia de que cada actividad se haya ejecutado.

| Integrante | Rol en el plan | Responsabilidades |
| :--- | :--- | :--- |
| Mecchia Valentín | QA Lead / Administrador de Pruebas | Diseñar el plan SPACEDIRT, definir criterios de aceptación, aprobar casos y emitir el informe final de calidad. |
| Sereno Facundo José | Frontend QA Tester | Ejecutar pruebas funcionales y de interfaz React, usabilidad y navegación visual. |
| Camino Matías | Backend & API Tester | Probar endpoints REST de Node.js/Express y persistencia PostgreSQL/Prisma. |
| Perez Agustín | DevOps & RNF Tester | Probar rendimiento, consistencia transaccional, configuración de entorno y pipeline Python de Barcode/OCR. |

El PDF escribe “NRF” en el último rol; aquí se normaliza como “RNF” por corresponder a requisitos no funcionales.

## 4. A — Approach / Strategy: estrategia

El plan original propone un enfoque multinivel:

- Pruebas unitarias, de integración, de sistema y de aceptación.
- Caja negra para requisitos funcionales, incluyendo partición de equivalencia y análisis de valores límite.
- Carga/estrés, concurrencia y seguridad para requisitos no funcionales.

Esta estrategia sigue siendo una intención válida, pero no describe exactamente la suite configurada en el repositorio:

- **Backend:** el script npm test usa el ejecutor incorporado node:test con concurrencia 1. Las pruebas llaman controladores directamente y simulan res; las pruebas que usan Prisma escriben en PostgreSQL real. Esto es integración a nivel de controlador/base de datos, no una prueba HTTP completa del servidor, rutas y middleware.
- **Frontend:** el script npm test usa Vitest. La configuración fija entorno node; las pruebas existentes cubren servicios con fetch simulado y una función de conversión de precio. No son pruebas de navegador ni de renderizado de componentes.
- El repositorio no contiene configuración o dependencias de Jest/React Testing Library, scripts de k6 ni colecciones de Postman. No se deben describirlos como herramientas ya usadas.
- No se encontraron pruebas automatizadas del pipeline OCR ni de carga, concurrencia real, seguridad de rutas o aceptación de extremo a extremo.

Comandos disponibles:

    cd backend
    npm test

    cd frontend
    npm test

En frontend también está disponible npm run check para la comprobación TypeScript; no reemplaza pruebas funcionales.

## 5. Casos de prueba funcionales (RF)

Los resultados esperados de esta sección son criterios planificados. La cobertura indicada es una lectura estática de los archivos de prueba y no implica que se hayan ejecutado o aprobado.

### CP-RF-01 — Registro válido de usuario

**Requisito:** HU-01.  
**Objetivo del PDF:** registrar un usuario con sus datos válidos. El PDF nombra nombre, apellido, legajo, contraseña y confirmación.  
**Precondición:** formulario de registro disponible.  
**Pasos:** completar nombre completo, correo, legajo, contraseña y confirmación; enviar el formulario.  
**Resultado esperado del plan:** usuario persistido en PostgreSQL y mensaje de confirmación.

**Ajuste al sistema actual:** la API canónica espera nombre completo, legajo numérico, email válido y contraseña de al menos seis caracteres. No tiene un campo separado de apellido. La prueba de backend existente importa el controlador de registro legado y no valida la ruta canónica /api/users/register, ni la sesión que esa ruta crea. Agregar una prueba de la ruta/controlador canónico y verificar la cookie de sesión y el rol asignado.

### CP-RF-02 — Registro con datos obligatorios faltantes

**Requisito:** HU-01.  
**Objetivo del PDF:** dejar vacío el legajo o la contraseña y enviar.  
**Precondición:** pantalla de registro disponible.  
**Pasos:** repetir el intento dejando vacío cada campo obligatorio, uno por vez.  
**Resultado esperado del plan:** el sistema rechaza el envío, indica el campo requerido y no crea el usuario.

**Ajuste al sistema actual:** cubrir por separado nombre, email, legajo, contraseña, formato de email, legajo no numérico y contraseña corta; verificar que no aparezca un usuario parcial en la base. Las pruebas actuales cubren parte de las validaciones del controlador legado, pero no el contrato completo del registro canónico ni la validación visual del formulario.

### CP-RF-03 — Alta de producto

**Requisito:** HU-02.  
**Objetivo del PDF:** cargar un producto con código de barras, nombre, categoría, precio e imagen.  
**Precondición:** usuario administrador autenticado.  
**Pasos:** completar los datos, guardar y consultar el producto en el catálogo. Si se carga stock inicial, seleccionar también un depósito.  
**Resultado esperado del plan:** producto persistido en PostgreSQL e incluido en el catálogo; cuando se carga stock inicial, se registra y visualiza la cantidad correspondiente.

**Ajuste al sistema actual:** el código recibe SKU/código, no exige que sea EAN-13; exige nombre, SKU, categoría y precio mayor que cero. La imagen es opcional. El stock inicial es opcional y, si es mayor que cero, requiere un depósito. Conviene probar código duplicado, precio inválido y depósito inexistente. Hay pruebas de alta/edición/baja en controladores, pero falta demostrar el recorrido HTTP canónico protegido y el formulario completo.

### CP-RF-04 — Ajuste manual de inventario

**Requisito:** HU-07.  
**Objetivo del PDF:** seleccionar producto y depósito, ingresar una entrada de ejemplo de +50 y confirmar.  
**Precondición:** producto y depósito registrados.  
**Pasos:** modificar la cantidad, confirmar y consultar el inventario y su movimiento.  
**Resultado esperado del plan:** stock visible actualizado y movimiento de inventario persistido.

**Ajuste al sistema actual:** el endpoint canónico PATCH /api/inventory/:id recibe la cantidad final deseada y calcula el delta; no recibe una entrada/salida relativa como “+50”. El movimiento conserva el signo en quantity y el motivo; el modelo vigente ya no tiene un campo type. Aclarar en la interfaz y en el caso si se prueba el saldo final o un delta. La suite actual cubre adjustStock legado, no el endpoint canónico de inventario.

### CP-RF-05 — Venta manual y descuento de stock

**Requisitos:** HU-08, HU-09 y HU-10.  
**Precondición:** vendedor autorizado, depósito seleccionado y stock de 10 unidades para el producto.  
**Pasos:** iniciar una venta, agregar dos unidades, revisar importes, confirmar, consultar el comprobante y volver a consultar el inventario.  
**Resultado esperado del plan:** venta y detalle persistidos, comprobante con los datos de la venta, stock final de 8 unidades y movimiento de salida asociado. Si cualquier ítem carece de stock, no se debe confirmar parcialmente la operación.

**Ajuste al sistema actual:** el endpoint canónico /api/sales exige sesión/rol autorizado, recibe warehouseId por artículo, agrupa cantidades del mismo producto/depósito, calcula el total en servidor y aplica PriceRule. La venta se registra con StockMovement.quantity negativa; no existe un campo type en el modelo actual. El detalle del comprobante se consulta en /api/sales/:id; la creación devuelve un resumen. No asumir que el total incluye IVA: el contrato actual suma precios por línea y no incorpora impuesto.

Hay pruebas de venta/ticket en el controlador legado y dos pruebas acotadas del controlador canónico (rechazo de varios depósitos y foto sobre el límite). La prueba de servicio frontend solo comprueba que envía el POST. Falta una prueba de integración del camino canónico completo: precio por tramo, total, venta, stock, movimiento, historial y detalle del comprobante.

### CP-RF-06 — Reconocimiento de producto con código/OCR

**Requisito:** PoC Barcode + OCR.  
**Precondición:** imagen de una etiqueta de producto.  
**Pasos originales:** enviar imagen al pipeline Python, ejecutar zxing-cpp y buscar el código en el catálogo; usar OCR como alternativa cuando falle la lectura de código.  
**Resultado esperado original:** extraer el código, seleccionar el producto y agrupar la cantidad.

**Estado frente al código:** no es un caso de aceptación ejecutable para el producto integrado actual. El endpoint de reconocimiento devuelve resultados simulados y no lee la imagen; tampoco se encontró una conexión del endpoint con zxing-cpp, PaddleOCR o Codulia. Mantener este caso como pendiente de integración o como prueba aislada de la PoC, sin atribuirle cobertura del sistema.

## 6. Casos de prueba no funcionales (RNF)

### CP-RNF-01 — Latencia de API

**Tipo:** carga/latencia.  
**Precondición:** backend y PostgreSQL activos con datos representativos.  
**Pasos originales:** medir el tiempo de una confirmación de venta, incluyendo endpoint y persistencia.  
**Criterio original:** respuesta inferior a 2000 ms.

El umbral queda como objetivo propuesto, no como resultado medido. Antes de usarlo como criterio de salida hay que fijar el hardware, tamaño de datos, número de usuarios concurrentes, duración, calentamiento y métrica (por ejemplo, p95, además de máximo). No hay script de k6 ni informe de medición en el repositorio.

### CP-RNF-02 — Consistencia ante ventas concurrentes

**Tipo:** concurrencia/aislamiento.  
**Precondición:** stock de una unidad para un producto y depósito.  
**Pasos:** enviar a la vez dos ventas de una unidad para el mismo producto y depósito.  
**Criterio original:** una operación se confirma y la otra se rechaza; el saldo no queda negativo.

La base de datos contiene una restricción stock.quantity >= 0 y la venta se ejecuta en una transacción, lo que protege el saldo. Sin embargo, las pruebas existentes cubren rechazos secuenciales y atomicidad, no dos solicitudes simultáneas. Además, un rechazo por la restricción durante una carrera podría regresar como error interno y no como “stock insuficiente”; el caso debe verificar saldo, ventas, movimientos y respuesta observable. No declarar esta propiedad aprobada sin una prueba concurrente real.

### CP-RNF-03 — Protección de rutas

**Tipo:** control de acceso.  
**Precondición:** backend activo.  
**Pasos originales:** acceder a endpoints de productos y ventas sin credenciales válidas.  
**Criterio original:** HTTP 401 Unauthorized o 403 Forbidden.

Refinar el caso: sin sesión o sesión inválida debe esperarse 401; con sesión válida pero rol insuficiente debe esperarse 403. Probar la ruta canónica, tanto middleware de autenticación como autorización por rol. El registro y el login son rutas públicas por diseño y no deben usarse como ejemplos de ruta protegida. No se encontraron pruebas automatizadas del middleware ni de los roles.

### CP-RNF-04 — Imagen ilegible

**Tipo:** resiliencia.  
**Precondición y pasos originales:** enviar una imagen borrosa/desenfocada al pipeline y provocar el fallo de lectura de código y OCR.  
**Criterio original:** manejar el error, informar que no se detectó un código y pedir una nueva captura.

Este caso también depende de integrar reconocimiento real. El endpoint actual no inspecciona la imagen, por lo que no puede demostrar ese resultado.

## 7. C — Criteria: criterios de entrada, salida, suspensión y reanudación

### Criterios de entrada originales

- Repositorio congelado para la versión del Sprint que se va a probar.
- Entorno funcional con Node.js, React, PostgreSQL y servidor Python.
- Base de datos con catálogo y depósitos iniciales.
- Matriz de casos revisada y aprobada por QA Lead.

### Criterios de salida originales

- Ejecutar el 100 % de los casos definidos para Sprint 1.
- Obtener una tasa de aprobación de al menos 95 %.
- No dejar defectos críticos o bloqueantes pendientes en autenticación, ventas o ajustes de stock.

**Precisión necesaria para aplicarlos:** registrar el commit exacto probado; declarar cuáles casos son aplicables; separar aprobados, fallidos, bloqueados y no ejecutados; definir el denominador del pass rate. Un caso bloqueado no es aprobado. Para cerrar, todos los fallos restantes deben tener incidente y decisión documentada; rendimiento y concurrencia requieren evidencia, no una evaluación subjetiva.

### Criterios de suspensión originales

- Caída del backend o inestabilidad de PostgreSQL que impida persistir.
- Defecto bloqueante que impida registro/inicio de sesión (HU-01) o el flujo de caja/confirmación de venta (HU-08/HU-09).

### Criterios de reanudación originales

- Corrección desplegada y validada en el repositorio.
- Ambiente de prueba actualizado correctamente.

Se recomienda registrar el commit del hotfix, volver a ejecutar el caso fallido y sus regresiones relacionadas, y actualizar los resultados de ejecución.

## 8. E — Environment / Infrastructure: entorno

### Arquitectura y entorno descritos en el PDF

- **Frontend:** aplicación React en Google Chrome.
- **Backend:** Node.js y Express.
- **Datos:** PostgreSQL administrado por Prisma.
- **Visión/IA:** scripts Python con zxing-cpp.
- **Herramientas declaradas:** Postman para API, React Testing Library/Jest para frontend y k6 para concurrencia y latencia.

### Entorno que se observa en el repositorio

- La configuración Vite actual apunta a frontend/client como raíz de la aplicación React/TypeScript.
- Backend Node.js/Express con Prisma y PostgreSQL; el script Node ejecuta pruebas serialmente.
- Frontend Vitest en entorno Node; las pruebas no abren navegador ni renderizan la aplicación.
- La PoC de visión está en un notebook separado y no conectada con el endpoint de reconocimiento.
- No se encontró configuración de Jest/React Testing Library, k6 ni colección Postman en el repositorio.

**Aislamiento de datos obligatorio:** las pruebas de backend llaman resetDb() antes de cada caso, que elimina datos de tablas de usuarios, productos, depósitos, stock, ventas, transferencias, clientes y campañas. Ejecutarlas con un DATABASE_URL de uso diario o producción destruiría esos datos. Usar exclusivamente una base de pruebas desechable, confirmar la URL antes de ejecutar y no reutilizar una base con información que se quiera conservar. El cliente Prisma de pruebas no impone esta protección por sí mismo.

## 9. D — Deliverables: entregables de prueba

El PDF establece estos entregables:

1. Plan de pruebas formal.
2. Matriz detallada con resultado individual Pass / Fail / Blocked.
3. Incidentes en GitHub Issues con etiquetas de módulo.
4. Informe de cierre con cobertura de requisitos, porcentaje de éxito y métricas de rendimiento.

Este Markdown entrega el plan convertido y auditado. El PDF no incluye matriz de resultados, registro de incidentes ni informe de cierre. No hay resultados o métricas que permitan afirmar un pass rate o cobertura lograda.

## 10. I — Incident Management: gestión de incidentes

Flujo indicado en el PDF:

1. Registrar el defecto en GitHub Issues y etiquetar el módulo afectado, por ejemplo frontend, backend, PoC OCR o base de datos.
2. Clasificar severidad:
   - **Bloqueante/crítica:** caída del sistema, corrupción de stock o inconsistencia en importes de venta.
   - **Alta:** falla funcional principal con alternativa manual.
   - **Media/baja:** formato o problemas visuales menores.
3. Seguir el ciclo: Abierto → En revisión (Dev) → Resuelto → Re-test (QA) → Cerrado.

Para que el registro sea reproducible, cada issue debe incluir versión/commit, ambiente, precondiciones/datos, pasos, resultado observado, resultado esperado y evidencia sin exponer credenciales ni datos reales.

## 11. R — Risks and Contingencies: riesgos y contingencias

| Riesgo del plan original | Impacto indicado | Mitigación indicada | Evaluación de vigencia |
| :--- | :--- | :--- | :--- |
| Lectura visual fallida por baja iluminación o fotos borrosas/desarticuladas en la PoC. | Alto | Validar fallback automático a PaddleOCR y permitir selección/edición manual. | El fallback no está conectado al endpoint actual. Tratar como pendiente hasta integrar y probar el pipeline. |
| Descalce de stock en operaciones concurrentes. | Crítico | Transacciones atómicas en Prisma y pruebas de estrés/concurrencia. | La base protege el stock no negativo y hay transacciones; falta la prueba concurrente y verificar respuesta/error en carrera. |
| Diferencias de configuración entre equipos. | Medio | Estandarizar variables .env y migraciones Prisma (npx prisma migrate dev). | Agregar base de pruebas separada y protección explícita contra borrar datos ajenos a QA. |

## 12. T — Timeline and Tasks: cronograma

El PDF vincula las pruebas con SB-049 a SB-052:

- **SB-049 — Productos:** alta, edición y listado (HU-02, HU-03 y HU-04).
- **SB-050 — Depósitos y stock:** alta de depósitos, consulta de existencias y ajustes (HU-05, HU-06 y HU-07).
- **SB-051 — Ventas y PoC:** venta, importes, descuento de inventario, historial y pipeline de imagen (HU-08 a HU-11 y PoC).
- **SB-052 — Corrección y retest:** corregir defectos, revalidar y emitir el informe final de cobertura.

El documento [Sprint 1 Backlog](sprint-1-backlog.md) marca estas tareas como completadas. Ese estado no sustituye a la matriz de ejecución ni demuestra que se haya alcanzado el 95 % de aprobación. En particular, los tests del repositorio no cubren de forma completa el pipeline OCR ni todos los recorridos canónicos de venta y UI descritos en SB-051.

## 13. Auditoría de cobertura actual

### Pruebas que existen en el repositorio

**Backend — Node.js node:test y PostgreSQL/Prisma:**

- [auth.test.js](../backend/tests/auth.test.js): validaciones de registro del controlador legado; no verifica login, sesión, middleware, roles ni el registro canónico.
- [product.test.js](../backend/tests/product.test.js), [product-update.test.js](../backend/tests/product-update.test.js) y [product-delete.test.js](../backend/tests/product-delete.test.js): alta, actualización, imagen, baja lógica y algunas validaciones de producto.
- [deposit.test.js](../backend/tests/deposit.test.js): alta, consulta, edición, duplicados y restricciones de eliminación.
- [stock.test.js](../backend/tests/stock.test.js): consulta, ajustes, movimientos, stock insuficiente, separación por depósito y atomicidad de ajuste; llama el controlador legado.
- [sale.test.js](../backend/tests/sale.test.js): venta, descuento, atomicidad, historial y ticket del controlador legado.
- [sale-rules.test.js](../backend/tests/sale-rules.test.js): dos reglas del controlador canónico de venta: un solo depósito y límite de imagen.
- [price-rules.test.js](../backend/tests/price-rules.test.js): persistencia y validaciones de tramos de precio.
- [transfer.test.js](../backend/tests/transfer.test.js): transferencia de stock y rollback.
- [customer.test.js](../backend/tests/customer.test.js): operaciones de cliente, validaciones y relación con venta/ticket.
- [helpers.js](../backend/tests/helpers.js): limpia las tablas y crea datos base para pruebas.

Las pruebas de venta y stock más amplias importan controladores legados. El servidor conserva esos endpoints bajo rutas con sufijo legacy, mientras que el API integrado registra las rutas actuales desde [integration.routes.js](../backend/routes/integration.routes.js). No trasladar cobertura de un controlador/ruta a otro sin verificar que se comportan igual.

**Frontend — Vitest:**

- [auth.test.ts](../frontend/client/src/services/auth.test.ts), [http.test.ts](../frontend/client/src/services/http.test.ts), [sales.test.ts](../frontend/client/src/services/sales.test.ts) y [backlog.test.ts](../frontend/client/src/services/backlog.test.ts): verifican servicios HTTP con fetch simulado.
- [productForm.test.ts](../frontend/client/src/pages/productForm.test.ts): prueba la conversión de importes.

No cubren interacción real de páginas, visualización de errores en pantalla, navegador, accesibilidad o un recorrido completo del usuario.

### Brechas prioritarias que impiden considerar completo el plan

1. La tabla funcional enumera pocos casos para el alcance que declara: faltan escenarios explícitos de edición/búsqueda/listado de catálogo, alta/duplicados/consulta de depósito, límites de stock, historial y filtros.
2. HU-01 exige probar la ruta canónica de registro y la sesión; la prueba de backend existente corresponde al controlador legado.
3. El contrato canónico de venta calcula importes y aplica precios por volumen en servidor. Falta probar umbrales de PriceRule, total exacto, persistencia, movimiento, historial y detalle de ticket por ese camino.
4. La venta canónica agrega reglas de autorización, cliente, foto y un solo depósito; solo algunas validaciones de esa ruta están automatizadas.
5. No hay pruebas automatizadas de rutas protegidas, roles, carga/performance, concurrencia simultánea, frontend de navegador o errores de OCR.
6. El caso de reconocimiento del plan afirma una integración que el endpoint no realiza.
7. El plan excluye Telegram como trabajo futuro, aunque el repositorio actual contiene rutas y UI de Telegram. Confirmar el alcance de la versión antes de cerrar el plan.
8. El contrato de movimiento del PDF no describe el esquema actual: el tipo de movimiento se quitó y la dirección se representa mediante el signo de la cantidad. Actualizar las expectativas y reportes que dependan de type.

### Casos adicionales recomendados

Estos escenarios amplían el plan a partir del alcance HU-01 a HU-11 y de la implementación actual. Son propuestas, no casos ejecutados:

| ID propuesto | Escenario y criterio mínimo |
| :--- | :--- |
| CP-RF-07 | Editar y buscar producto por nombre/SKU/categoría; comprobar SKU duplicado, producto inactivo oculto y baja bloqueada si queda stock. |
| CP-RF-08 | Crear y editar depósito; rechazar nombre duplicado; consultar que el stock corresponde sólo al depósito elegido. |
| CP-RF-09 | Ajustar inventario hasta un saldo final mayor, igual y menor; registrar el delta correcto y rechazar saldos negativos sin dejar movimiento parcial. |
| CP-RF-10 | Probar precio base y reglas por volumen justo antes, en el umbral y después; confirmar precio unitario y total calculados en backend. |
| CP-RF-11 | Completar una venta canónica con una y varias líneas; comprobar stock, movimiento negativo, historial y detalle del ticket contra los valores persistidos. Incluir falta de stock en la última línea y confirmar rollback total. |
| CP-RF-12 | Probar login, sesión válida/inválida, logout y permisos por rol: 401 sin sesión y 403 con rol insuficiente. |
| CP-RF-13 | Ejecutar dos ventas simultáneas sobre una unidad; comprobar que sólo una persiste y que saldo, ventas y movimientos quedan consistentes. |
| CP-RF-14 | Medir latencia con perfil de carga y ambiente declarados; registrar percentiles, errores y duración para evaluar el umbral de 2000 ms. |
| CP-RF-15 | Probar transferencia con stock suficiente e insuficiente; verificar origen, destino y los dos movimientos en éxito, y rollback total en rechazo. |

---

## 15. Plan de Pruebas del Sprint 2 (Estructura SPACEDIRT — ISO/IEC/IEEE 29119-3)

Esta sección define formalmente el plan de verificación y validación para el **Sprint 2** de StockIA, estructurado bajo el estándar internacional de documentación de pruebas de software ISO/IEC/IEEE 29119-3 mediante la mnemotecnia SPACEDIRT.

### 15.1 S — Scope (Alcance de Pruebas del Sprint 2)

#### 15.1.1 Dentro del alcance
- **HU-12 (Autenticación y Autorización por Roles):** Login con credenciales cifradas (bcrypt), emisión y validación de tokens JWT estándar (HS256) en cookies HttpOnly y SameSite=Lax con flag Secure condicional, abort en arranque si la clave es insegura en producción, reseteo de rate-limiting ante login exitoso, validación reactiva y accesible en `LoginPage.tsx`, y matriz completa de control de acceso por roles (RBAC: `administrador`, `caja`, `deposito`).
- **HU-13 (Carga Asistida por Imagen en Terminal de Ventas):** Endpoint seguro `POST /api/sales/scan`, conteo de apariciones por GTIN, regla determinística anti-doble conteo (prevalencia de barcode y corroboración sin suma por OCR), precarga editable de carrito, recorte automático por stock disponible en depósito, banderas de revisión (`reviewRequired`, `isAmbiguous`), badges de nivel de confianza de lectura (`barcode+ocr`, `barcode`, `ocr`, `ambiguous`), cantidades en transferencias y alta asistida de productos no catalogados.
- **HU-14 (Transferencias Atómicas y Concurrencia):** Servicio desacoplado `StockTransferService`, transacción ACID atómica, descuento condicional con `quantity: { gte: qty }` para prevenir sobregiros en concurrencia, mapeo de violación de constraint PostgreSQL 23514 a HTTP 400, modelo contable de movimientos con signo (+/-) y un único depósito por movimiento.
- **HU-15 (Precios por Tramo en Tiempo Real):** Cálculo reactivo en frontend mediante `unitPriceForQuantity` con paridad matemática exacta con el backend (`createSaleCompat`), recálculo en vivo de subtotales y badges de precio mayorista aplicado.
- **HU-16 (Alertas de Stock Mínimo):** Endpoint `GET /api/inventory/low-stock` con filtro opcional por depósito, clasificación canónica de estados (`sin_stock`, `critico`, `bajo`, `saludable`) y badges visuales unificados.
- **Requisitos No Funcionales (RNF):**
  - **CP-RNF-04:** Tiempo de respuesta del pipeline de percepción < 1 s para imágenes con códigos de barras nítidos.
  - **CP-RNF-05:** Concurrencia atómica de inventario sin sobregiros, sin inconsistencias de saldos y sin excepciones HTTP 500 bajo ráfagas simultáneas.

#### 15.1.2 Fuera del alcance
- Bot interactivo de Telegram para captura remota de fotografías y procesamiento de ventas (ítems 13.12 y 13.16 del backlog general; se mantiene en base de datos sin bot en vivo).
- Emisión de comprobantes fiscales electrónicos ante entes tributarios (AFIP).
- Detección de packaging completo mediante redes neuronales pesadas de segmentación (YOLO), descartado en el pivot tecnológico.

---

### 15.2 P — Personnel / People (Personal y Responsabilidades)

| Integrante | Rol en el Plan | Responsabilidades Principales |
| :--- | :--- | :--- |
| **Mecchia Valentín** | QA Lead / Administrador de Pruebas | Coordinar el plan SPACEDIRT, auditar la matriz de trazabilidad de requisitos, registrar defectos y certificar el cumplimiento de la Definition of Done. |
| **Sereno Facundo José** | Frontend QA Tester | Ejecutar suites en Vitest, validar accesibilidad (ARIA) y reactividad del login, y probar la precarga del carrito y paridad de precios. |
| **Camino Matías** | Backend & API Tester | Desarrollar y ejecutar pruebas de integración en `node:test`, matriz de roles RBAC, endpoints de escaneo e inventario bajo y transaccionalidad. |
| **Perez Agustín** | DevOps & RNF Tester | Validar el microservicio de IA (`stockia_ai`), ejecutar pruebas de concurrencia y estrés (`Promise.all`), y evaluar muestras reales en `ai/samples`. |

---

### 15.3 A — Approach / Strategy (Estrategia y Niveles de Prueba)

Se adoptó una estrategia de aseguramiento continuo en cinco niveles:

1. **Nivel 1: Lógica Pura Desacoplada (Frontend con Vitest):**  
   Pruebas unitarias sobre funciones determinísticas sin estado (`unitPriceForQuantity`, `preloadCartFromDetections`, `getStockLevel`, `validateLoginForm`), garantizando cobertura exhaustiva de casos límite (valores frontera, cantidades cero o negativas, recortes de stock y cálculo de bonificaciones).
2. **Nivel 2: Integración de Backend y Base de Datos (Node.js con `node:test` y Prisma):**  
   Pruebas de endpoints HTTP y controladores sobre una instancia PostgreSQL 16 real en Docker. Limpieza serial de tablas con `resetDb()` entre casos para garantizar aislamiento e idempotencia.
3. **Nivel 3: Percepción de IA y Visión Computacional (Python con `unittest`):**  
   Pruebas de los agentes `barcode.py`, `ocr.py`, `consensus.py` y `pipeline.py`, complementadas con pruebas de integración sobre imágenes fotográficas reales (`ai/samples`) bajo diversas condiciones de luz, contraste y ángulo.
4. **Nivel 4: Concurrencia y Resistencia a Condiciones de Carrera:**  
   Pruebas de estrés que lanzan peticiones simultáneas asíncronas con `Promise.all` sobre el mismo recurso de inventario para forzar carreras críticas y validar que el descuento condicional de PostgreSQL impida sobregiros y mantenga la suma de masas.
5. **Nivel 5: Seguridad y Matriz de Control de Acceso por Roles (RBAC):**  
   Verificación cruzada de permisos probando cada endpoint sensible con credenciales de `administrador`, `caja` y `deposito`, validando respuestas exactas (200/201 vs 403 Forbidden).

---

### 15.4 C — Criteria (Criterios de Entrada, Suspensión, Reanudación y Salida)

#### 15.4.1 Criterios de Entrada
- Contenedor PostgreSQL 16 activo en Docker Compose en puerto 5434.
- Migraciones de Prisma aplicadas (`npx prisma migrate deploy`).
- Variables de entorno de prueba configuradas (`backend/.env` con `DATABASE_URL` desechable).
- Dependencias de Node.js instaladas en raíz, backend y frontend.
- Entorno virtual de Python 3.12 activo con `stockia_ai` instalado en modo editable.

#### 15.4.2 Criterios de Suspensión
- Imposibilidad de conectar a la base de datos de pruebas o corrupción de datos.
- Fallo general en el servicio de autenticación que bloquee el acceso a todas las rutas protegidas.
- Caída no recuperable del microservicio de percepción de IA.

#### 15.4.3 Criterios de Reanudación
- Despliegue de corrección validado en el repositorio (hotfix).
- Limpieza completa y re-ejecución de migraciones y seeds en la base de datos de pruebas.
- Re-ejecución exitosa de la prueba unitaria fallida antes de continuar la suite.

#### 15.4.4 Criterios de Salida (Definition of Done de QA)
- 100 % de los casos de prueba de Sprint 2 ejecutados.
- Tasa de aprobación del 100 % en pruebas unitarias y de integración de software (116 backend, 40 frontend, 25 IA).
- Cero (0) defectos bloqueantes o de severidad crítica abiertos.
- Matriz de ejecución documentada con evidencias en [sprint-2-pruebas-ejecucion.md](sprint-2-pruebas-ejecucion.md).
- Registro formal de defectos resueltos en [sprint-2-defectos.md](sprint-2-defectos.md).

---

### 15.5 E — Environment / Infrastructure (Entorno y Configuración)

- **Sistema Operativo:** Windows 11 / Linux Ubuntu.
- **Base de Datos:** PostgreSQL 16 oficial en Docker (puerto 5434). Base de datos exclusiva de pruebas descartable.
- **Backend:** Node.js v20+, Express 4, Prisma ORM 6+, `jsonwebtoken` 9+, `bcryptjs` 3+.
- **Frontend:** React 19, TypeScript 5.8, Vite 6, Vitest 3+.
- **Microservicio de IA:** Python 3.12, FastAPI 0.115+, Uvicorn 0.34+, `zxing-cpp` 2.3+, Pillow, NumPy. Motor `PaddleOCR 3.x` opcional (`STOCKIA_INSTALL_OCR=true`).
- **Aislamiento:** Las pruebas de backend ejecutan `resetDb()` antes de cada caso; queda prohibido correr pruebas contra bases de datos productivas.

---

### 15.6 D — Deliverables (Entregables de Prueba)

1. **Plan de Pruebas SPACEDIRT Actualizado:** [docs/plan-de-pruebas.md](plan-de-pruebas.md).
2. **Matriz de Ejecución de Pruebas de Sprint 2:** [docs/sprint-2-pruebas-ejecucion.md](sprint-2-pruebas-ejecucion.md) con detalle de precondiciones, pasos, resultado esperado, resultado obtenido y estado.
3. **Registro de Defectos y Ciclo de Vida (Bug Tracker):** [docs/sprint-2-defectos.md](sprint-2-defectos.md) con registro de defectos DEF-001 a DEF-009.
4. **Informe Académico de Cierre del Sprint 2:** [docs/sprint-2-informe.md](sprint-2-informe.md).

---

### 15.7 I — Incident Management (Gestión de Incidentes)

El ciclo de vida de los defectos sigue las etapas: **Detectado → Registrado → En Corrección → Verificado por Retest → Cerrado**.

Durante el Sprint 2 se registraron y resolvieron exitosamente 9 defectos (DEF-001 a DEF-009):
- **DEF-001:** Omisión de conteo de apariciones en agente barcode de IA. (Resuelto en `ai/src/stockia_ai/agents/barcode.py`).
- **DEF-002:** Doble conteo entre código de barras y numeración OCR en consenso. (Resuelto en `consensus.py`).
- **DEF-003:** Ausencia de endpoint de escaneo asistido para ventas. (Resuelto con `POST /api/sales/scan`).
- **DEF-004:** Carrito sin precarga automática ni control de sobregiro visual. (Resuelto en `cartPreload.ts` y `NewSaleModal.tsx`).
- **DEF-005:** Discrepancia de totales entre frontend y backend por precios por volumen. (Resuelto en `pricing.ts`).
- **DEF-006:** Condición de carrera con sobregiro y error 500 en transferencias concurrentes. (Resuelto en `stock-transfer.service.js`).
- **DEF-007:** Vulnerabilidad en firma de sesiones con HMAC propio y secreto inseguro. (Resuelto con JWT estándar HS256 y abort en producción).
- **DEF-008:** Inconsistencia en semántica de badges de stock mínimo. (Resuelto con `stockLevel.ts`).
- **DEF-009:** Ausencia de suite de visión con imágenes reales del repositorio. (Resuelto en `test_pipeline_samples.py`).

---

### 15.8 R — Risks and Contingencies (Riesgos y Mitigaciones)

| Riesgo Técnico / Operativo | Severidad | Probabilidad | Estrategia de Mitigación Implementada |
| :--- | :--- | :--- | :--- |
| **R1: Descalce o saldo negativo de stock por peticiones de venta o transferencia concurrentes.** | Crítica | Media | Implementación de descuento condicional a nivel motor (`quantity: { gte: qty }`) dentro de transacción atómica de Prisma y constraint `CHECK (quantity >= 0)`. Mapeo de código 23514 a HTTP 400. |
| **R2: Doble conteo de unidades físicas al leer código de barras y texto OCR simultáneamente.** | Alta | Alta | Algoritmo de consenso determinístico: cada código de barras en ubicación distinta cuenta 1 unidad; la lectura OCR de números bajo la etiqueta corrobora el GTIN y asigna 0 unidades adicionales. |
| **R3: Fuga de credenciales o uso de secretos por defecto en entornos de producción.** | Crítica | Baja | Validación estricta en el arranque del servidor (`validateProductionSecret`): la API se aborta si `NODE_ENV=production` y el secreto de firma es nulo, débil o el valor por defecto. Flag `Secure` obligatorio en cookies en producción. |
| **R4: Fallo de compilación o dependencias pesadas de PaddleOCR en puestos de desarrollo.** | Media | Alta | Arquitectura desacoplada: OCR es un respaldo opcional con bandera `STOCKIA_INSTALL_OCR`. El sistema utiliza `zxing-cpp` de forma nativa e inyecta lectores simulados en las suites de prueba unitarias. |
| **R5: Discrepancia en el total a cobrar entre la pantalla de venta y la base de datos.** | Alta | Media | Extracción de la regla de bonificación por escalas a una función pura (`unitPriceForQuantity`) con suite de paridad matemática con el backend. |

---

### 15.9 T — Timeline and Tasks (Cronograma y Asignación de Pruebas)

- **SB-079:** Diseño e implementación de pruebas de pipeline de visión con muestras reales de `ai/samples` (`test_pipeline_samples.py`).
- **SB-080:** Ejecución de pruebas integrales, medición de RNF y consolidación de matrices SPACEDIRT en [sprint-2-pruebas-ejecucion.md](sprint-2-pruebas-ejecucion.md).
- **SB-081:** Implementación de pruebas automatizadas de concurrencia y estrés de inventario (`transfer-concurrency.test.js`).
- **SB-082:** Gestión, documentación y verificación del cierre de defectos en [sprint-2-defectos.md](sprint-2-defectos.md).

---

### 15.10 Catálogo de Casos de Prueba del Sprint 2

| ID Caso | Historia / RNF | Descripción y Criterio de Aceptación | Suite / Archivo de Prueba |
| :--- | :--- | :--- | :--- |
| **CP-HU12-01** | HU-12 | Login exitoso emite cookie HttpOnly con token JWT estándar HS256 y resetea intentos fallidos. | `backend/tests/auth-security.test.js` |
| **CP-HU12-02** | HU-12 | Login con credenciales inválidas responde 401 Unauthorized y no emite cookie de sesión. | `backend/tests/auth-security.test.js` |
| **CP-HU12-03** | HU-12 | Consulta a `/auth/me` con y sin cookie válida; rechazo de cookies manipuladas con 401. | `backend/tests/auth-security.test.js` |
| **CP-HU12-04** | HU-12 | Rechazo de token JWT expirado con 401 Unauthorized y mensaje explicativo. | `backend/tests/auth-security.test.js` |
| **CP-HU12-05** | HU-12 | Matriz RBAC: rol `caja` no puede registrar productos ni ver reportes; rol `deposito` no puede vender. | `backend/tests/auth-security.test.js` |
| **CP-HU12-06** | HU-12 | Validación reactiva y accesible de formato de correo y contraseña obligatoria en tiempo real. | `frontend/client/src/pages/loginValidation.test.ts` |
| **CP-HU13-01** | HU-13 | Preservación de conteo de múltiples códigos de barras idénticos en distintas posiciones. | `ai/tests/test_agents.py` |
| **CP-HU13-02** | HU-13 | Regla anti-doble conteo: lectura OCR de número de etiqueta no duplica unidad física. | `ai/tests/test_agents.py` |
| **CP-HU13-03** | HU-13 | Endpoint `POST /api/sales/scan` responde 200 con `suggestedQuantity` agregada por GTIN. | `backend/tests/sales-scan.test.js` |
| **CP-HU13-04** | HU-13 | Control de roles en `/sales/scan`: permitido a `administrador` y `caja`, denegado (403) a `deposito`. | `backend/tests/sales-scan.test.js` |
| **CP-HU13-05** | HU-13 | Resiliencia de `/sales/scan`: 400 ante omisión de imagen y 503 si el servicio de IA no responde. | `backend/tests/sales-scan.test.js` |
| **CP-HU13-06** | HU-13 | Precarga inteligente de carrito en frontend recortando cantidades al stock disponible del depósito. | `frontend/client/src/lib/cartPreload.test.ts` |
| **CP-HU13-07** | HU-13 | Marcado visual de líneas con advertencia ante lecturas ambiguas o no catalogadas. | `frontend/client/src/lib/cartPreload.test.ts` |
| **CP-RNF-04** | RNF-04 | Latencia de procesamiento de imagen de percepción < 1 s con decodificación de `zxing-cpp`. | `ai/tests/test_pipeline_samples.py` |
| **CP-HU14-01** | HU-14 | Transferencia atómica entre depósitos con generación de dos movimientos con signo (+/-). | `backend/tests/transfer-concurrency.test.js` |
| **CP-HU14-02** | HU-14 | Dos transferencias simultáneas sobre el mismo stock: exactamente una triunfa y la otra da 400. | `backend/tests/transfer-concurrency.test.js` |
| **CP-HU14-03** | HU-14 | N transferencias concurrentes concurrentes: conservación estricta de la masa y stock >= 0. | `backend/tests/transfer-concurrency.test.js` |
| **CP-HU14-04** | HU-14 | Dos ventas simultáneas sobre stock unitario: una aprobada, una rechazada con 400, sin errores 500. | `backend/tests/transfer-concurrency.test.js` |
| **CP-HU14-05** | HU-14 | Rollback transaccional íntegro ante fallo a mitad de camino en transferencia múltiple. | `backend/tests/transfer-concurrency.test.js` |
| **CP-RNF-05** | RNF-05 | Concurrencia atómica de inventario sin sobregiros ni excepciones 500 bajo condiciones de carrera. | `backend/tests/transfer-concurrency.test.js` |
| **CP-HU15-01** | HU-15 | Paridad exacta de cálculo de precios por volumen entre función pura frontend y backend. | `frontend/client/src/lib/pricing.test.ts` |
| **CP-HU15-02** | HU-15 | Comportamiento exacto en bordes: cantidad inmediatamente antes, en el umbral y superior. | `frontend/client/src/lib/pricing.test.ts` |
| **CP-HU15-03** | HU-15 | Aplicación automática de etiqueta "Precio mayorista aplicado" en carrito ante escalas activas. | `frontend/client/src/lib/pricing.test.ts` |
| **CP-HU16-01** | HU-16 | Endpoint `/inventory/low-stock` lista existencias <= umbral, incluyendo productos con stock 0. | `backend/tests/inventory-low-stock.test.js` |
| **CP-HU16-02** | HU-16 | Clasificación precisa de niveles (`sin_stock`, `critico`, `bajo`, `saludable`) en backend y frontend. | `backend/tests/inventory-low-stock.test.js` y `stockLevel.test.ts` |
| **CP-HU16-03** | HU-16 | Filtrado preciso de alertas por depósito (`warehouseId`) y validación de parámetros (400 ante inválidos). | `backend/tests/inventory-low-stock.test.js` |
| **CP-HU16-04** | HU-16 | Unificación de badges visuales de stock entre inventario, reportes y dashboards. | `frontend/client/src/lib/stockLevel.test.ts` |

---

## 16. Referencias del proyecto

- [Historias de usuario (HU-01 a HU-16)](historias-de-usuario.md)
- [Sprint 1 Backlog](sprint-1-backlog.md)
- [Sprint 2 Backlog (SB-056 a SB-085)](sprint-2-backlog.md)
- [Informe Académico de Cierre del Sprint 2](sprint-2-informe.md)
- [Matriz de Ejecución de Pruebas Sprint 2](sprint-2-pruebas-ejecucion.md)
- [Registro de Defectos del Sprint 2](sprint-2-defectos.md)
- [Modelo de Datos y Diagrama ER](data-model.md)
- [Reglas de stock y concurrencia](stock-rules.md)
- [Reglas de precios dinámicos](pricing.md)
- [Contrato de integración backend](backend-integration.md)
- [Instructivo de instalación y QA](installation.md)

