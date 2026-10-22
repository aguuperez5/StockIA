# Implementación: Asignación Automática e Impresión de AprilTags (tag36h11)

Este documento detalla la arquitectura, cambios de base de datos, flujo de asignación automática, servicio de imágenes y proceso de impresión en hoja A4 implementados en el sistema **StockIA**.

---

## 1. Resumen de Requerimientos y Decisiones de Diseño

1. **Rango Fiducial Determinado:**  
   Se utiliza la familia estándar de robótica y visión **AprilTag `tag36h11`**, que dispone de 587 códigos únicos (IDs numéricos del `0` al `586`).
2. **Asignación Automática y Secuencial:**  
   Al crear un producto nuevo, el sistema localiza automáticamente el menor ID libre (hueco secuencial no ocupado entre 0 y 586) y lo asigna de manera transaccional.
3. **Reserva en Bajas Lógicas (Soft Delete):**  
   Cuando un producto se desactiva (`active = false`), su `apriltag_id` **permanece reservado**. Esto evita que etiquetas físicas ya impresas y pegadas en depósitos o góndolas sean confundidas con un nuevo producto.
4. **Mapeo Real en Escaneo por Cámara:**  
   El endpoint de visión fotográfica (`/api/recognition/analyze` y `processRecognitionImage`) ahora busca directamente en catálogo por `where: { apriltagId: { in: tagIds } }` en lugar del `id` autoincremental de base de datos.
5. **Especificaciones de Impresión A4 (25 mm x 25 mm):**  
   - Hoja formato A4 estándar (210 mm x 297 mm).
   - Dimensión de tag: exactamente **25 mm x 25 mm** con renderizado `image-rendering: pixelated` para garantizar bordes matemáticamente puros y alto contraste sin difuminado.
   - Quiet zone (margen blanco) de al menos 2.5 mm y leyenda inferior con Nombre, SKU e `ID AprilTag`.
   - Distribución en grilla optimizada (6 columnas x 7-8 filas: entre 42 y 48 etiquetas por hoja A4).

---

## 2. Cambios en Base de Datos y Modelo de Datos

### Modelo Prisma (`backend/prisma/schema.prisma`)
Se agregó el campo `apriltagId` único y mapeado a `apriltag_id`:
```prisma
model Product {
  id                Int      @id @default(autoincrement())
  name              String
  code              String   @unique
  category          String?
  price             Decimal  @db.Decimal(10, 2)
  lowStockThreshold Int      @default(5)
  imageUrl          String?
  apriltagId        Int?     @unique @map("apriltag_id")
  active            Boolean  @default(true)
  createdAt         DateTime @default(now())
  updatedAt         DateTime @updatedAt
  ...
}
```

### Migración SQL (`backend/prisma/migrations/20261017000000_product_apriltag_id/migration.sql`)
```sql
ALTER TABLE "products" ADD COLUMN "apriltag_id" INTEGER;
CREATE UNIQUE INDEX "products_apriltag_id_key" ON "products"("apriltag_id");
```

---

## 3. Servicios y Endpoints Implementados

### 3.1. Asignador de Tags (`backend/services/apriltag.service.js`)
- `getNextAvailableAprilTagId(client)`: Consulta los tags ocupados y retorna el primer entero disponible entre `0` y `586`. Si se supera el límite de 587 productos, arroja un error controlado `409 Conflict`.
- `assignMissingAprilTags(client)`: Recorre los productos sin tag y les asigna secuencialmente los identificadores disponibles.

### 3.2. Script de Migración de Productos Existentes (`backend/scripts/assign-apriltags.js`)
Para inicializar o migrar productos existentes que no tengan tag asignado:
```bash
npm --prefix backend run migrate:apriltags
# o: node backend/scripts/assign-apriltags.js
```

### 3.3. Endpoint de Generación de Imagen en Microservicio Python (`backend/services/reconocimiento-tags/api.py`)
- `GET /api/tags/{tag_id}/image?size=300`: Genera la matriz OpenCV exacta del AprilTag usando `DICT_APRILTAG_36h11` con borde de 1 bit (`borderBits=1`), codifica a PNG en memoria y la sirve con cabeceras de cache (`Cache-Control: public, max-age=31536000, immutable`).

### 3.4. Endpoint Proxy en Backend Node.js Express (`backend/routes/integration.routes.js`)
- `GET /api/apriltags/:tagId/image`: Permite al frontend solicitar cualquier tag de forma unificada sin requerir puertos cruzados, incluyendo fallback visual SVG determinista si el microservicio Python está iniciando.

---

## 4. Componentes Frontend Desarrollados

### 4.1. Badge y Visualización (`AprilTagBadge.tsx`)
- Ubicación: `frontend/client/src/components/products/AprilTagBadge.tsx`.
- Muestra el chip identificador `Tag #XXX` junto a la miniatura de alta definición del tag.
- Al hacer clic, abre un modal ampliado para inspeccionar el marcador, su nombre y SKU.

### 4.2. Modal y Flujo de Impresión (`PrintAprilTagsModal.tsx`)
- Ubicación: `frontend/client/src/components/products/PrintAprilTagsModal.tsx`.
- Accesible mediante el botón **"Imprimir AprilTags"** en la vista de Catálogo de Productos (`ProductsPage.tsx`).
- **Funcionalidades:**
  1. Filtro y buscador en tiempo real de productos.
  2. Selección unitaria o masiva ("Todos" / "Ninguno").
  3. Controles interactivos de cantidad de copias (`+` / `-` / input directo).
  4. Cálculo dinámico de etiquetas totales y estimación de hojas A4 requeridas.
  5. **Modo Vista Previa A4:** Muestra en pantalla el pliego A4 tal como saldrá impreso.
  6. **Botón Imprimir / Guardar PDF:** Invoca `window.print()` con estilos calibrados `@media print`.

### 4.3. Calibración de Estilos para Impresión A4 (`index.css`)
- Directiva `@page { size: A4 portrait; margin: 8mm; }`.
- Ocultamiento automático de barras de navegación, botones y elementos no imprimibles (`.no-print`).
- Grilla de 6 columnas de etiquetas con ancho de 29 mm y alto de 36 mm, conteniendo el AprilTag en `25mm x 25mm`, quiet zone y líneas de corte punteadas para tijera o guillotina.

---

## 5. Guía Rápida de Uso

1. **Creación de producto nuevo:**
   - Ingresa a **Catálogo -> Productos** y presiona **"Nuevo producto"**.
   - Completa nombre, SKU, categoría y precio. Al guardar, el backend le asignará de inmediato el primer AprilTag libre.
2. **Visualizar el tag de un producto:**
   - En la tabla de productos, revisa la columna **AprilTag**. Haz clic en el chip (ej. `Tag #002`) para ver el tag en gran resolución.
3. **Imprimir etiquetas:**
   - En la parte superior de la página de productos, presiona **"Imprimir AprilTags"**.
   - Marca los productos que deseas etiquetar y ajusta la cantidad de adhesivos para cada uno.
   - Haz clic en **"Vista Previa A4"** para revisar la diagramación en la hoja.
   - Haz clic en **"Imprimir / Guardar PDF"** y selecciona tu impresora de etiquetas o la opción **"Guardar como PDF"** de tu navegador.
