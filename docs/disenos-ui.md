# Especificación y Wireframes de Interfaces de Usuario (Sprint 2 — SB-061)

**Proyecto:** StockIA  
**Cátedra:** Ingeniería y Calidad de Software (UTN-FRSF)  
**Hito:** Sprint 2 (HU-12 a HU-16)  
**Referencia de Backlog:** Tarea canónica `SB-061`  

---

## 1. Guía de Estilos y Principios de Diseño

### 1.1. Paleta de Colores y Tokens Visuales
- **Fondo General:** `#0F172A` (Slate 900) / `#1E293B` (Slate 800) en modo oscuro; superficies limpias `#FFFFFF` / `#F8FAFC` en modo claro.
- **Color Primario (Acción/Acento):** `#3B82F6` (Blue 500) / `#2563EB` (Blue 600) — botones primarios, enlaces activos, foco.
- **Color Secundario / Superficies:** `#475569` (Slate 600) / `#334155` (Slate 700).
- **Semántica de Estados:**
  - **Éxito (Confirmado/Disponible/Corroborado):** `#10B981` (Emerald 500).
  - **Advertencia (Revisión requerida/Stock bajo):** `#F59E0B` (Amber 500).
  - **Peligro (Error/Sin stock/Sin detección):** `#EF4444` (Red 500).
  - **Informativo / Neutro:** `#64748B` (Slate 500).

### 1.2. Tipografía y Jerarquía
- **Familia tipográfica:** `system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif`.
- **H1 (Encabezados de pantalla):** 24px - 28px, semi-bold (`font-semibold`).
- **H2 (Secciones y tarjetas):** 18px - 20px, medium (`font-medium`).
- **Body / Etiquetas:** 14px - 15px, regular (`font-normal`).
- **Metadatos y badges:** 12px, medium (`text-xs font-medium uppercase tracking-wider`).

### 1.3. Breakpoints Responsivos
- **Móvil (dispositivos de caja y captura móvil):** `< 640px` (columna única, botones táctiles `min-h-[44px]`).
- **Tablet / Terminal POS:** `640px - 1024px` (rejilla fluida, panel lateral colapsable).
- **Desktop (Administración y control):** `> 1024px` (panel de navegación lateral fijo, layouts multi-columna).

---

## 2. Wireframe 1: Autenticación y Login (`/login`)

### 2.1. Propósito y Requerimientos de UX
Permitir a los operadores (Administrador, Caja, Operario de Depósito) iniciar sesión segura mediante correo y contraseña. Al autenticar, el backend emite una cookie HTTP-only `token` o JWT que inicializa el contexto de sesión (`AuthContext`).

### 2.2. Diagrama de Estructura Visual (Wireframe)
```
+-------------------------------------------------------------+
|                                                             |
|                       [ Logo StockIA ]                      |
|                  Sistema de Gestión & Visión                |
|                                                             |
|  +-------------------------------------------------------+  |
|  |                    Iniciar Sesión                     |  |
|  |                                                       |  |
|  |  Correo Electrónico                                   |  |
|  |  +-------------------------------------------------+  |  |
|  |  | usuario@stockia.dev                             |  |  |
|  |  +-------------------------------------------------+  |  |
|  |                                                       |  |
|  |  Contraseña                                           |  |
|  |  +-------------------------------------------------+  |  |
|  |  | ********************                     [Ojo]  |  |  |
|  |  +-------------------------------------------------+  |  |
|  |                                                       |  |
|  |  [!] Alerta de error si las credenciales son inválidas|  |
|  |                                                       |  |
|  |  +-------------------------------------------------+  |  |
|  |  |            [ INGRESAR AL SISTEMA ]              |  |  |
|  |  +-------------------------------------------------+  |  |
|  +-------------------------------------------------------+  |
|                                                             |
|           Versión 2.0.0 — Sprint 2 UTN-FRSF (2026)          |
+-------------------------------------------------------------+
```

### 2.3. Estados de la Pantalla
- **Inicial:** Campos vacíos, foco en `email`. Botón activo.
- **Enviando (Loading):** Spinner dentro del botón `[ Ingresando... ]`, campos bloqueados `disabled`.
- **Error:** Cartel contextual en rojo con mensaje amigable (`Credenciales incorrectas` o `Error de conexión`).

---

## 3. Wireframe 2: Captura Fotográfica y Reconocimiento IA (`/sales/new` -> `PhotoCapture.tsx`)

### 3.1. Propósito y Requerimientos de UX
Permite al cajero u operador registrar productos de forma ultrarrápida: ya sea activando la cámara web/móvil para tomar una instantánea o subiendo una imagen desde el almacenamiento local. El servicio de visión analiza la foto (código de barras, OCR o AprilTags) y pre-carga automáticamente las líneas del carrito con cantidad, precio unitario y subtotal.

### 3.2. Diagrama de Estructura Visual (Wireframe)
```
+-----------------------------------------------------------------------------------+
|  [ < Volver a Ventas ]          Nueva Venta — Punto de Venta                      |
+-----------------------------------------------------------------------------------+
|                                          |                                        |
|  [ SECCIÓN CAPTURA & RECONOCIMIENTO ]    |  [ DETALLE DEL CARRITO / TICKET ]      |
|                                          |                                        |
|  +------------------------------------+  |  Depósito: [ Depósito Central (1)  v ] |
|  |                                    |  |                                        |
|  |        [ Visor de Cámara Web ]     |  |  Líneas agregadas:                     |
|  |                                    |  |  +----------------------------------+  |
|  |   [ Marco Guía de Escaneo ]        |  |  | Galletitas Dulces Oreo 118g      |  |
|  |                                    |  |  | EAN: 7622210 ...  x1    $1.200   |  |
|  |                                    |  |  | Cantidad: [-] [ 1 ] [+]   [Elim] |  |
|  |                                    |  |  +----------------------------------+  |
|  +------------------------------------+  |  | Coca Cola Sabor Original 1.5L   |  |
|                                          |  |  | EAN: 5449000 ...  x2    $4.400   |  |
|  [ Iniciar Cámara ] [ Detener ]          |  |  | Cantidad: [-] [ 2 ] [+]   [Elim] |  |
|  [ Capturar Foto ]  [ Subir Archivo ]    |  |  +----------------------------------+  |
|                                          |                                        |
|  +------------------------------------+  |  Resumen:                              |
|  | Estado IA: Corroborado (100% conf) |  |  Subtotal:                    $5.600   |
|  | Código detectado: 3017620422003    |  |  Descuento:                       $0   |
|  | Producto: Crema Nutella Ferrero    |  |  TOTAL A COBRAR:              $5.600   |
|  | [ + Agregar al Carrito ]           |  |                                        |
|  +------------------------------------+  |  +----------------------------------+  |
|                                          |  |      [ CONFIRMAR VENTA ]         |  |
|                                          |  +----------------------------------+  |
+-----------------------------------------------------------------------------------+
```

### 3.3. Interacción y Manejo de Errores
- **No Detección:** Notificación amarilla: `No se identificó ningún código de barras u OCR. Intente reencuadrar con mayor iluminación.`
- **Ambigüedad (Varios códigos en imagen):** Modal selector listando cada producto detectado para que el cajero confirme cuáles desea incorporar.

---

## 4. Wireframe 3: Transferencias entre Depósitos (`/transfers`, `TransferForm.tsx`)

### 4.1. Propósito y Requerimientos de UX
Permitir el traspaso seguro y atómico de existencias entre dos depósitos distintos sin sobregiros. Muestra existencias actuales en el depósito origen y previene validaciones erróneas en tiempo real.

### 4.2. Diagrama de Estructura Visual (Wireframe)
```
+-----------------------------------------------------------------------------------+
|  [ Modulo de Stock ]  >  Nueva Transferencia entre Depósitos                      |
+-----------------------------------------------------------------------------------+
|                                                                                   |
|  +-----------------------------------------------------------------------------+  |
|  | 1. Configuración de Depósitos                                               |  |
|  |                                                                             |  |
|  |  Depósito Origen *                       Depósito Destino *                 |  |
|  |  +-------------------------------+       +-------------------------------+  |  |
|  |  | Depósito Central (Ppal)   [v] |  ==>  | Sucursal Norte (Local 2)  [v] |  |  |
|  |  +-------------------------------+       +-------------------------------+  |  |
|  |  [!] El origen y destino no pueden ser el mismo depósito.                   |  |
|  +-----------------------------------------------------------------------------+  |
|                                                                                   |
|  +-----------------------------------------------------------------------------+  |
|  | 2. Artículos a Transferir                                                   |  |
|  |                                                                             |  |
|  |  Producto: [ Seleccionar producto ... [v] ]    Disp. Origen: 45 u.          |  |
|  |  Cantidad a enviar: [ 10 ]                     [ + Agregar a Lista ]        |  |
|  |                                                                             |  |
|  |  Ítems seleccionados:                                                       |  |
|  |  +-----------------------------------------------------------------------+  |  |
|  |  | Producto              | Disp. Origen | Cant. Transferir | Acciones    |  |  |
|  |  +-----------------------+--------------+------------------+-------------+  |  |
|  |  | Aceite de Girasol 1.5L| 45 unidades  | 10 unidades      | [ Mod | X ] |  |  |
|  |  | Harina 000 1kg        | 120 unidades | 30 unidades      | [ Mod | X ] |  |  |
|  |  +-----------------------------------------------------------------------+  |  |
|  |  Total de unidades a mover: 40 artículos.                                   |  |
|  +-----------------------------------------------------------------------------+  |
|                                                                                   |
|  Observaciones / Motivo (Opcional):                                               |
|  +-----------------------------------------------------------------------------+  |
|  | Reposición de fin de semana para sucursal comercial                         |  |
|  +-----------------------------------------------------------------------------+  |
|                                                                                   |
|  [ Cancelar ]                                 [ CONFIRMAR Y GENERAR REMITO ]     |
+-----------------------------------------------------------------------------------+
```

### 4.3. Reglas de Validación en Formulario
- Bloqueo de envío si `origen == destino`.
- Validación en caliente de `cantidad <= stockDisponible`.
- Al confirmar, llama a `POST /api/transfers`, registra los movimientos con signo (`-10` en origen, `+10` en destino) y redirige al listado con mensaje toast de éxito.

---

## 5. Wireframe 4: Alertas de Stock y Reposición (`/alerts`, `StockAlerts.tsx`)

### 5.1. Propósito y Requerimientos de UX
Visualizar el estado crítico de inventario en tiempo real. Clasifica los productos según el stock remanente comparado con el `minStock`:
- **Crítico (Sin Stock / 0 u.):** Badge Rojo `AGOTADO`.
- **Advertencia (Stock Bajo / <= minStock):** Badge Amarillo `STOCK BAJO`.
- **Óptimo (> minStock):** Badge Verde `NORMAL`.

### 5.2. Diagrama de Estructura Visual (Wireframe)
```
+-----------------------------------------------------------------------------------+
|  Alertas de Stock y Monitoreo de Inventario                                       |
+-----------------------------------------------------------------------------------+
|                                                                                   |
|  [ Tarjeta: Sin Stock ]    [ Tarjeta: Stock Crítico ]    [ Tarjeta: Óptimos ]     |
|  |  3 Productos       |    |  8 Productos           |    |  142 Productos   |     |
|  |  Requiere compra   |    |  Por debajo de mínimo  |    |  Abastecidos     |     |
|  +--------------------+    +------------------------+    +------------------+     |
|                                                                                   |
|  Filtros: Depósito: [ Todos [v] ]   Nivel: [ Todos [v] ]   Buscar: [ Q Harina... ]|
|                                                                                   |
|  +-----------------------------------------------------------------------------+  |
|  | Producto           | Depósito       | Actual | Mínimo | Estado    | Acción  |  |
|  +--------------------+----------------+--------+--------+-----------+---------+  |
|  | Café Molido 500g   | Dep. Central   | 0 u.   | 10 u.  | [AGOTADO] | [Pedir] |  |
|  | Leche Entera 1L    | Sucursal Norte | 3 u.   | 20 u.  | [BAJO]    | [Pedir] |  |
|  | Azúcar Ledesma 1kg | Dep. Central   | 4 u.   | 15 u.  | [BAJO]    | [Pedir] |  |
|  +-----------------------------------------------------------------------------+  |
|                                                                                   |
|  [ Paginación: < 1 de 2 > ]                       [ Exportar Reporte a PDF/CSV ]  |
+-----------------------------------------------------------------------------------+
```

---

## 6. Trazabilidad con Historias de Usuario

| Pantalla / Componente | Historia de Usuario | Tarea de Backlog | Componente Activo Frontend |
| :--- | :--- | :--- | :--- |
| **Login / Autenticación** | `HU-15` (Gestión de Roles y Seguridad) | `SB-061`, `SB-064`, `SB-065` | `frontend/client/src/pages/Login.tsx` |
| **Captura y Visión IA** | `HU-12` (Reconocimiento Inteligente) | `SB-061`, `SB-079`, `SB-080` | `frontend/client/src/components/PhotoCapture.tsx` |
| **Transferencias** | `HU-14` (Transferencias entre Depósitos) | `SB-061`, `SB-073`, `SB-081` | `frontend/client/src/components/transfers/TransferForm.tsx` |
| **Alertas de Stock** | `HU-13` (Control de Stock Mínimo) | `SB-061`, `SB-067`, `SB-068` | `frontend/client/src/components/stock/StockAlerts.tsx` |
