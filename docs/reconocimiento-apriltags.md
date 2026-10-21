# Arquitectura del Sistema de Reconocimiento Visual (AprilTags)

## 1. Resumen del Cambio y Justificación

### Análisis
El modelo implementado en un principio se basaba en la extracción de texto mediante OCR y la decodificación de códigos de barras a partir de imágenes. Este enfoque conllevaba un elevado consumo de recursos de CPU y GPU, tiempos de procesamiento altos y una tasa considerable de errores en el reconocimiento. Asimismo, la calidad de la detección se veía frecuentemente afectada por las condiciones lumínicas del entorno y la deformación geométrica del código de barras al encontrarse adherido a superficies curvas o cilíndricas.

### Solución
Se reemplazó el sistema de OCR y código de barras por un microservicio en Python (desarrollado con OpenCV y FastAPI) basado en el reconocimiento de **AprilTags (familia `tag36h11`)**, marcadores fiduciales diseñados específicamente para ser mucho más rápidos y tolerantes a la perspectiva, distancia y luz que un código de barras o QR tradicional. El servicio detecta automáticamente el ID del tag vinculado al producto en la base de datos y contabiliza las unidades presentes en la imagen, permitiendo agregarlas directamente al flujo de venta con una latencia de apenas milisegundos.

### Ventajas clave del nuevo enfoque:
1. **Precisión del 100% y latencia mínima:** Detección geométrica robusta mediante OpenCV en pocos milisegundos sin requerir inferencia con redes neuronales.
2. **Robustez ante condiciones adversas:** Reconocimiento confiable bajo inclinación, perspectiva, oclusiones parciales y variaciones de luz.
3. **Mapeo directo e inequívoco:** El ID incrustado en el tag coincide directamente con el identificador (`id` autoincremental de Postgres / Prisma) del producto en el catálogo.
4. **Soporte de conteo múltiple:** Identifica simultáneamente varias etiquetas del mismo producto en una única fotografía (calculando automáticamente la cantidad de unidades para el carrito de compras).

---

## 2. Diagrama de Arquitectura y Flujo de Datos

```text
[ Usuario / Cámara o Foto en Frontend ]
                 │
                 │ 1. Captura y comprime imagen (< 1600px, JPEG)
                 ▼
[ React UI - PhotoCapture.tsx / NewSalePage.tsx ]
                 │
                 │ 2. POST /api/recognition/analyze { photoData }
                 ▼
[ Backend Express - integration.controller.js ]
                 │
                 │ 3. POST /api/detectar (Multipart)
                 ▼
[ Microservicio Python FastAPI (puerto 8000) ]
        ├── detector.py (OpenCV Aruco / AprilTag tag36h11)
        └── Retorna: { status: "success", tags: [ { id: 217, center: [x,y] }, ... ] }
                 │
                 │ 4. Respuesta JSON con lista de tags detectados
                 ▼
[ Backend Express - Prisma Client ]
        ├── Consulta: prisma.product.findMany({ where: { active: true, apriltagId: { in: tagIds } } })
        ├── Agrupa conteo por ID (ej. 2 tags con ID 0 => quantity: 2)
        └── Adjunta disponibilidad de stock por depósito (Central, Norte, Sur)
                 │
                 │ 5. Items consolidados + cantidades
                 ▼
[ Carrito / Selector de Depósitos en Frontend ]
        └── Muestra unidades detectadas y permite agregar al despacho con un solo click.
```

---

## 3. Componentes del Microservicio Python

Ubicación: `backend/services/reconocimiento-tags/`

- **`detector.py`**:
  - Implementa la clase `DetectorProductosAprilTag`.
  - Configura el diccionario `cv2.aruco.DICT_APRILTAG_36h11`.
  - Soporta imágenes en formatos JPEG, PNG, WebP y HEIC.
  - Redimensiona automáticamente fotos de alta resolución preservando la relación de aspecto.
  - Extrae el vector plano de IDs detectados con sus centros espaciales.
- **`api.py`**:
  - Servidor FastAPI que expone el endpoint `/api/detectar`.
  - Corre en `http://127.0.0.1:8000`.
- **`generador_tags.py`**:
  - Script utilitario para generar etiquetas imprimibles en formato PNG.
  - Solicita los IDs de base de datos y genera tarjetas con el AprilTag de alto contraste y los datos legibles del producto en la carpeta `tags_imprimibles/`.

---

## 4. Instrucciones de Ejecución

### 4.1 Iniciar el microservicio Python
```bash
cd backend/services/reconocimiento-tags
# Activar entorno virtual
venv\Scripts\activate   # En Windows
# o: source venv/bin/activate en Linux/macOS

python api.py
```
*El servicio confirmará que está escuchando en `http://127.0.0.1:8000`.*

### 4.2 Iniciar el backend Node.js
```bash
npm run dev
```
*Se conecta automáticamente al puerto 8000 para el análisis fotográfico.*

### 4.3 Generar etiquetas para nuevos productos
```bash
cd backend/services/reconocimiento-tags
python generador_tags.py
# Ingresar los IDs (ej: 217, 218, 219)
```
Las imágenes generadas se guardarán listas para imprimir o escanear en `tags_imprimibles/tag_<ID>.png`.
