# Historias de Usuario — StockIA

Catálogo oficial de Historias de Usuario desarrolladas y validadas durante el **Sprint 1** para el proyecto **StockIA** (Cátedra: Ingeniería y Calidad de Software, UTN FR San Francisco, 2026).

---

## Resumen de Historias de Usuario

| ID | Título | Rol | Prioridad | Estimación | Estado |
| :--- | :--- | :--- | :--- | :--- | :--- |
| [HU-01](#hu-01-registro-de-usuario) | Registro de usuario | Usuario no registrado | Crítica | 1 hora | Implementada |
| [HU-02](#hu-02-registrar-producto) | Registrar producto | Administrador / Autorizado | Crítica | 2 horas | Implementada |
| [HU-03](#hu-03-editar-producto) | Editar producto | Administrador / Autorizado | Alto | 2 horas | Implementada |
| [HU-04](#hu-04-visualizar-listado-de-productos) | Visualizar listado de productos | Administrador / Autorizado | Alto | 2 horas | Implementada |
| [HU-05](#hu-05-registrar-depósito) | Registrar depósito | Administrador / Autorizado | Alto | 1 hora | Implementada |
| [HU-06](#hu-06-visualizar-stock-por-depósito) | Visualizar stock por depósito | Administrador / Autorizado | Alto | 2 horas | Implementada |
| [HU-07](#hu-07-actualización-manual-de-stock) | Actualización manual de stock | Usuario autorizado | Crítica | 2 horas | Implementada |
| [HU-08](#hu-08-creación-de-venta-manual) | Creación de venta manual | Usuario de caja / ventas | Crítica | 3 horas | Implementada |
| [HU-09](#hu-09-confirmación-de-venta) | Confirmación de venta | Usuario de caja / ventas | Crítica | 2 horas | Implementada |
| [HU-10](#hu-10-descuento-automático-de-stock-por-venta) | Descuento automático de stock por venta | Sistema | Crítica | 2 horas | Implementada |
| [HU-11](#hu-11-visualización-de-historial-de-ventas) | Visualización de historial de ventas | Encargado / Administrador | Media | 1 hora | Implementada |
| [HU-12](#hu-12-autenticación-segura-y-control-de-acceso-por-roles) | Autenticación segura y control de roles | Usuario del sistema | Crítica | 2 horas | Implementada |
| [HU-13](#hu-13-carga-asistida-por-imagen-en-terminal-de-ventas) | Carga asistida por imagen en terminal de ventas | Cajero / Vendedor | Crítica | 4 horas | Implementada |
| [HU-14](#hu-14-transferencias-atómicas-entre-depósitos-y-concurrencia) | Transferencias atómicas entre depósitos | Encargado de depósito | Crítica | 3 horas | Implementada |
| [HU-15](#hu-15-precios-por-volumen-en-tiempo-real) | Precios por volumen en tiempo real | Cajero / Vendedor | Alto | 2 horas | Implementada |
| [HU-16](#hu-16-alertas-de-stock-mínimo-y-criticidad) | Alertas de stock mínimo y criticidad | Encargado de compras / Depósito | Alto | 2 horas | Implementada |

---

## Fichas Detalladas

### HU-01: Registro de usuario

| Campo | Detalle |
| :--- | :--- |
| **Título** | Registro de usuario |
| **YO COMO** | Usuario no registrado |
| **DESEO** | Registrarme en el sistema |
| **PARA** | Poder acceder y comenzar a usar la aplicación |
| **Prioridad** | Crítica |
| **Estado** | Implementada |
| **Estimación** | 1 hora |
| **Tareas Backlog** | `SB-016`, `SB-017`, `SB-018`, `SB-019` |

#### Criterios de Aceptación
- **CA-01:** Se muestra el formulario de registro con los campos necesarios: nombre completo, email, contraseña y confirmación de contraseña. (Decisión de diseño verificada: la identidad es el email único; no se piden apellido ni legajo.)
- **CA-02:** El sistema valida que los campos obligatorios no estén vacíos.
- **CA-03:** El sistema permite registrar al usuario correctamente si los datos ingresados son válidos.
- **CA-04:** El sistema muestra un mensaje de confirmación al completar el registro.

---

### HU-02: Registrar producto

| Campo | Detalle |
| :--- | :--- |
| **Título** | Registrar producto |
| **YO COMO** | Administrador o usuario autorizado |
| **DESEO** | Registrar un producto nuevo en el sistema |
| **PARA** | Incorporarlo al catálogo y utilizarlo en ventas, stock y transferencias |
| **Prioridad** | Crítica |
| **Estado** | Implementada |
| **Estimación** | 2 horas |
| **Tareas Backlog** | `SB-020`, `SB-021`, `SB-022`, `SB-023` |

#### Criterios de Aceptación
- **CA-01:** Se muestra un formulario para cargar nombre, código, categoría, imagen y precio del producto.
- **CA-02:** El sistema valida que los campos obligatorios estén completos.
- **CA-03:** El producto se guarda correctamente en la base de datos con código único.
- **CA-04:** El sistema informa al usuario cuando el producto fue creado con éxito.

---

### HU-03: Editar producto

| Campo | Detalle |
| :--- | :--- |
| **Título** | Editar producto |
| **YO COMO** | Administrador o usuario autorizado |
| **DESEO** | Modificar los datos de un producto existente |
| **PARA** | Mantener actualizado el catálogo de productos |
| **Prioridad** | Alto |
| **Estado** | Implementada |
| **Estimación** | 2 horas |
| **Tareas Backlog** | `SB-024`, `SB-025` |

#### Criterios de Aceptación
- **CA-01:** Se permite seleccionar un producto previamente cargado.
- **CA-02:** Se muestra un formulario con los datos actuales del producto.
- **CA-03:** El sistema permite modificar los campos habilitados.
- **CA-04:** Los cambios quedan guardados correctamente en la base de datos.

---

### HU-04: Visualizar listado de productos

| Campo | Detalle |
| :--- | :--- |
| **Título** | Visualizar listado de productos |
| **YO COMO** | Administrador o usuario autorizado |
| **DESEO** | Visualizar el listado completo de los productos existentes |
| **PARA** | Chequear el stock de productos y consultar el catálogo |
| **Prioridad** | Alto |
| **Estado** | Implementada |
| **Estimación** | 2 horas |
| **Tareas Backlog** | `SB-026`, `SB-027`, `SB-028` |

#### Criterios de Aceptación
- **CA-01:** Se permite ver el listado de los productos.
- **CA-02:** Se muestra la cantidad correcta de stock de los productos.
- **CA-03:** El sistema muestra los nombres correctos de los productos.

---

### HU-05: Registrar depósito

| Campo | Detalle |
| :--- | :--- |
| **Título** | Registrar depósito |
| **YO COMO** | Administrador o usuario autorizado |
| **DESEO** | Poder registrar un nuevo depósito |
| **PARA** | Gestionar stock por ubicación física |
| **Prioridad** | Alto |
| **Estado** | Implementada |
| **Estimación** | 1 hora |
| **Tareas Backlog** | `SB-029`, `SB-030`, `SB-031` |

#### Criterios de Aceptación
- **CA-01:** Se permite ingresar el nombre y datos del nuevo depósito.
- **CA-02:** No permite nombres de depósitos duplicados y todos los datos obligatorios deben estar rellenados.
- **CA-03:** El sistema crea y guarda correctamente el depósito creado.
- **CA-04:** Se muestra correctamente en el listado del depósito creado.

---

### HU-06: Visualizar stock por depósito

| Campo | Detalle |
| :--- | :--- |
| **Título** | Visualizar stock por depósito |
| **YO COMO** | Administrador o usuario autorizado |
| **DESEO** | Poder visualizar el listado de stock de un depósito |
| **PARA** | Tomar decisiones sobre el stock de productos en un depósito |
| **Prioridad** | Alto |
| **Estado** | Implementada |
| **Estimación** | 2 horas |
| **Tareas Backlog** | `SB-032`, `SB-033` |

#### Criterios de Aceptación
- **CA-01:** Se permite visualizar el listado completo de productos disponibles en el depósito elegido.
- **CA-02:** Mostrar únicamente los productos del depósito elegido.
- **CA-03:** El sistema muestra correctamente los nombres y cantidades del stock en el depósito.

---

### HU-07: Actualización manual de stock

| Campo | Detalle |
| :--- | :--- |
| **Título** | Actualización manual de stock |
| **YO COMO** | Usuario autorizado |
| **DESEO** | Modificar manualmente el stock de un producto en un depósito |
| **PARA** | Cargar stock inicial o corregir existencias durante pruebas y control operativo |
| **Prioridad** | Crítica |
| **Estado** | Implementada |
| **Estimación** | 2 horas |
| **Tareas Backlog** | `SB-034`, `SB-035` |

#### Criterios de Aceptación
- **CA-01:** Se permite seleccionar un producto y un depósito.
- **CA-02:** Se puede indicar una cantidad de entrada o salida.
- **CA-03:** El sistema registra el cambio de stock correctamente.
- **CA-04:** El nuevo valor de stock se visualiza actualizado.

---

### HU-08: Creación de venta manual

| Campo | Detalle |
| :--- | :--- |
| **Título** | Creación de venta manual |
| **YO COMO** | Usuario de caja o ventas |
| **DESEO** | Crear una venta cargando productos manualmente |
| **PARA** | Registrar una operación comercial sin depender todavía del reconocimiento automático |
| **Prioridad** | Crítica |
| **Estado** | Implementada |
| **Estimación** | 3 horas |
| **Tareas Backlog** | `SB-036`, `SB-037`, `SB-038`, `SB-039`, `SB-040`, `SB-041` |

#### Criterios de Aceptación
- **CA-01:** Se puede iniciar una nueva venta desde la interfaz.
- **CA-02:** Se pueden agregar productos y cantidades a la venta.
- **CA-03:** El sistema calcula el subtotal y el total de la operación.
- **CA-04:** Se visualiza el detalle de la venta antes de confirmarla.

---

### HU-09: Confirmación de venta

| Campo | Detalle |
| :--- | :--- |
| **Título** | Confirmación de venta |
| **YO COMO** | Usuario de caja o ventas |
| **DESEO** | Confirmar la venta registrada |
| **PARA** | Generar el ticket y dejar la operación cerrada |
| **Prioridad** | Crítica |
| **Estado** | Implementada |
| **Estimación** | 2 horas |
| **Tareas Backlog** | `SB-042`, `SB-043`, `SB-044` |

#### Criterios de Aceptación
- **CA-01:** El sistema permite confirmar la venta solo si tiene productos cargados.
- **CA-02:** Al confirmar, se genera el ticket o comprobante de la venta.
- **CA-03:** La venta queda guardada en el historial del sistema.
- **CA-04:** Se muestra un mensaje de confirmación al usuario.

---

### HU-10: Descuento automático de stock por venta

| Campo | Detalle |
| :--- | :--- |
| **Título** | Descuento automático de stock por venta |
| **YO COMO** | Sistema |
| **DESEO** | Descontar automáticamente el stock cuando una venta se confirma |
| **PARA** | Mantener actualizado el inventario del depósito |
| **Prioridad** | Crítica |
| **Estado** | Implementada |
| **Estimación** | 2 horas |
| **Tareas Backlog** | `SB-045`, `SB-046` |

#### Criterios de Aceptación
- **CA-01:** Al confirmar una venta, el sistema descuenta la cantidad vendida del stock correspondiente.
- **CA-02:** El movimiento queda registrado como salida de mercadería.
- **CA-03:** El descuento se aplica sobre el depósito correcto.
- **CA-04:** El stock visible refleja el cambio realizado.

---

### HU-11: Visualización de historial de ventas

| Campo | Detalle |
| :--- | :--- |
| **Título** | Visualización de historial de ventas |
| **YO COMO** | Encargado o administrador |
| **DESEO** | Consultar las ventas realizadas |
| **PARA** | Tener trazabilidad de operaciones y control del negocio |
| **Prioridad** | Media |
| **Estado** | Implementada |
| **Estimación** | 1 hora |
| **Tareas Backlog** | `SB-047`, `SB-048` |

#### Criterios de Aceptación
- **CA-01:** Se muestra un listado con las ventas realizadas.
- **CA-02:** Se puede consultar fecha, productos y total de cada venta.
- **CA-03:** El usuario puede filtrar o buscar ventas.
- **CA-04:** La información se obtiene correctamente del sistema.

---

### HU-12: Autenticación segura y control de acceso por roles

| Campo | Detalle |
| :--- | :--- |
| **Título** | Autenticación segura y control de acceso por roles |
| **YO COMO** | Usuario del sistema |
| **DESEO** | Iniciar sesión de forma segura y operar según mis permisos |
| **PARA** | Proteger los datos comerciales y acceder solo a las funciones autorizadas para mi rol |
| **Prioridad** | Crítica |
| **Estado** | Implementada |
| **Estimación** | 2 horas |
| **Tareas Backlog** | `SB-064`, `SB-065`, `SB-066`, `SB-067` |

#### Criterios de Aceptación
- **CA-01:** El sistema autentica credenciales con hash seguro bcrypt y emite tokens JWT estándar firmados con algoritmo HS256 y expiración a 7 días.
- **CA-02:** El token se almacena en una cookie `stockia_session` con atributos `HttpOnly`, `SameSite=Lax` y `Secure` habilitado en entornos de producción.
- **CA-03:** En producción (`NODE_ENV=production`), el servidor aborta el inicio si `SESSION_SECRET` o `JWT_SECRET` no están configurados o conservan el valor por defecto.
- **CA-04:** El rate limiting de login bloquea tras reiterados intentos fallidos consecutivos, pero resetea el contador al autenticarse exitosamente.
- **CA-05:** El formulario de login valida formato de email y campos requeridos en tiempo real (`onChange`/`onBlur`) con accesibilidad `aria-invalid` y botón deshabilitado durante el envío.
- **CA-06:** Se aplica control de acceso basado en roles (RBAC) estricto: `administrador` (acceso total), `caja` (ventas, escaneo asistido y clientes; denegado en productos y transferencias), `deposito` (transferencias, inventario y depósitos; denegado en ventas).

---

### HU-13: Carga asistida por imagen en terminal de ventas

| Campo | Detalle |
| :--- | :--- |
| **Título** | Carga asistida por imagen en terminal de ventas |
| **YO COMO** | Cajero o vendedor |
| **DESEO** | Escanear fotográficamente uno o varios productos para cargar automáticamente el comprobante |
| **PARA** | Agilizar el despacho en caja, reducir el tiempo de atención y minimizar errores de tipeo |
| **Prioridad** | Crítica |
| **Estado** | Implementada |
| **Estimación** | 4 horas |
| **Tareas Backlog** | `SB-068`, `SB-069`, `SB-070`, `SB-071` |

#### Criterios de Aceptación
- **CA-01:** El vendedor puede capturar o adjuntar una fotografía desde el comprobante de venta (`PhotoCapture.tsx`) invocando `POST /api/sales/scan`.
- **CA-02:** El pipeline de percepción cuenta apariciones físicas reales: cada barcode en distinta posición cuenta como 1 unidad; la lectura OCR de la misma etiqueta corrobora pero suma 0 unidades (anti-doble conteo).
- **CA-03:** Tras el escaneo, el carrito se precarga automáticamente con los productos coincidentes del catálogo local y sus cantidades sugeridas (`suggestedQuantity`).
- **CA-04:** Si la cantidad sugerida supera el stock disponible en el depósito de venta, el sistema recorta la cantidad al tope disponible y emite una notificación informativa clara.
- **CA-05:** La venta se asocia a un único depósito; si se detectan productos con existencias en múltiples depósitos, se alerta al vendedor para confirmar la selección.
- **CA-06:** Todas las líneas del comprobante permanecen 100% editables (modificar cantidad o eliminar línea). La venta nunca se confirma sola y requiere acción manual explícita.
- **CA-07:** Si se detectan códigos válidos que no están en el catálogo, se ofrece al usuario administrador un botón directo para dar de alta el producto con el código precargado.

---

### HU-14: Transferencias atómicas entre depósitos y concurrencia

| Campo | Detalle |
| :--- | :--- |
| **Título** | Transferencias atómicas entre depósitos y concurrencia |
| **YO COMO** | Encargado de depósito |
| **DESEO** | Transferir stock entre depósitos de forma atómica y protegida contra sobregiros |
| **PARA** | Reabastecer sucursales manteniendo la integridad y consistencia absoluta del inventario |
| **Prioridad** | Crítica |
| **Estado** | Implementada |
| **Estimación** | 3 horas |
| **Tareas Backlog** | `SB-072`, `SB-073`, `SB-074`, `SB-075`, `SB-081` |

#### Criterios de Aceptación
- **CA-01:** Se implementa `StockTransferService.transferStock` ejecutando todas las operaciones dentro de una transacción atómica (`prisma.$transaction`).
- **CA-02:** El descuento de stock en origen utiliza actualización condicional atómica (`updateMany` con `quantity: { gte: qty }`), impidiendo sobregiros en transferencias o ventas concurrentes.
- **CA-03:** Cualquier infracción del constraint de base CHECK 23514 se captura y responde con HTTP 400 claro ("Stock insuficiente"), nunca con error técnico HTTP 500.
- **CA-04:** Se registran exactamente dos movimientos `StockMovement` por producto: uno con signo negativo en el depósito origen y uno positivo en destino, con un único `depositId` por movimiento.
- **CA-05:** Si la transferencia falla por stock insuficiente en cualquier ítem, toda la operación revierte en su totalidad sin dejar movimientos huérfanos ni saldos inconsistentes.

---

### HU-15: Precios por volumen en tiempo real

| Campo | Detalle |
| :--- | :--- |
| **Título** | Precios por volumen en tiempo real |
| **YO COMO** | Cajero o vendedor |
| **DESEO** | Visualizar en tiempo real el precio unitario y subtotal según los tramos por cantidad en el comprobante |
| **PARA** | Ofrecer precios mayoristas transparentes y asegurar que el total en pantalla coincida con el facturado |
| **Prioridad** | Alto |
| **Estado** | Implementada |
| **Estimación** | 2 horas |
| **Tareas Backlog** | `SB-076` |

#### Criterios de Aceptación
- **CA-01:** `GET /api/inventory` expone `priceRules` con los tramos configurados para cada producto, evitando consultas HTTP redundantes al tipear en el comprobante.
- **CA-02:** Se implementa la función pura compartida `unitPriceForQuantity` y `calculateLinePricing`, aplicando la regla con mayor `minQuantity <= cantidad`, o el precio base si ninguna aplica.
- **CA-03:** En `NewSaleModal.tsx` y `SaleCartLine.tsx`, al cambiar la cantidad se recalculan dinámicamente el precio unitario, subtotal y total general, mostrando el tag "Precio mayorista aplicado".
- **CA-04:** Paridad total comprobada: el total calculado por el frontend en centavos coincide exactamente con el valor persistido por `createSaleCompat` en el backend.

---

### HU-16: Alertas de stock mínimo y criticidad

| Campo | Detalle |
| :--- | :--- |
| **Título** | Alertas de stock mínimo y criticidad |
| **YO COMO** | Encargado de compras o depósito |
| **DESEO** | Filtrar y visualizar rápidamente productos con existencias por debajo o en el umbral mínimo |
| **PARA** | Evitar quiebres de stock y programar reposiciones oportunamente |
| **Prioridad** | Alto |
| **Estado** | Implementada |
| **Estimación** | 2 horas |
| **Tareas Backlog** | `SB-077`, `SB-078` |

#### Criterios de Aceptación
- **CA-01:** Endpoint `GET /api/inventory/low-stock` (y parámetro `?lowStock=true`) protegido con autenticación, con filtro opcional por `warehouseId`.
- **CA-02:** Devuelve posiciones con `quantity <= lowStockThreshold`, incluyendo artículos con stock 0.
- **CA-03:** Clasifica cada ítem con su criticidad (`level`): `sin_stock` (cantidad = 0), `critico` (cantidad <= umbral / 2), `bajo` (cantidad <= umbral) y `saludable` (cantidad > umbral).
- **CA-04:** `StockPage.tsx` utiliza este endpoint al activar el filtro "Bajo mínimo", compartiendo la misma clasificación y badges que el dashboard y reportes.
