import base64
import os
import cv2
from fastapi import FastAPI, File, UploadFile, HTTPException, Query, Response
from fastapi.middleware.cors import CORSMiddleware
import uvicorn
from detector import DetectorProductosAprilTag
from generador_tags import generar_tag_imagen

app = FastAPI(
    title="AprilTag Detection API",
    description="Microservicio de visión computarizada para detección de AprilTags",
    version="1.0.0"
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

detector = DetectorProductosAprilTag()

@app.get("/api/health")
def health_check():
    return {
        "status": "online",
        "detector": "AprilTag tag36h11"
    }

@app.get("/api/tags/{tag_id}/image")
def obtener_imagen_tag(tag_id: int, size: int = Query(300, ge=50, le=1200)):
    if tag_id < 0 or tag_id > 586:
        raise HTTPException(status_code=400, detail="El ID del AprilTag debe estar entre 0 y 586.")
    
    tag_mat = generar_tag_imagen(tag_id, tamaño_px=size, borde_bits=1)
    ok, buffer = cv2.imencode(".png", tag_mat)
    if not ok:
        raise HTTPException(status_code=500, detail="Error al codificar imagen del tag.")
    
    return Response(
        content=buffer.tobytes(),
        media_type="image/png",
        headers={"Cache-Control": "public, max-age=31536000, immutable"}
    )

@app.post("/api/detectar")
async def detectar_productos(
    archivo: UploadFile = File(...),
    incluir_imagen: bool = Query(False)
):
    extensiones_validas = [".jpg", ".jpeg", ".png", ".heic", ".heif", ".webp"]
    nombre_archivo = archivo.filename or "imagen.jpg"
    ext = os.path.splitext(nombre_archivo)[1].lower()

    if ext not in extensiones_validas:
        raise HTTPException(status_code=400, detail="Formato no soportado.")

    try:
        contenido_bytes = await archivo.read()
        if len(contenido_bytes) == 0:
            raise HTTPException(status_code=400, detail="Archivo vacío.")

        tags, imagen_anotada = detector.detectar_en_imagen(contenido_bytes)

        respuesta = {
            "status": "success",
            "tags": tags
        }

        if incluir_imagen and imagen_anotada is not None:
            _, buffer = cv2.imencode(".jpg", imagen_anotada, [int(cv2.IMWRITE_JPEG_QUALITY), 85])
            base64_str = base64.b64encode(buffer).decode("utf-8")
            respuesta["imagen_anotada_base64"] = f"data:image/jpeg;base64,{base64_str}"

        return respuesta

    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

if __name__ == "__main__":
    puerto = int(os.environ.get("PORT", 8000))
    uvicorn.run("api:app", host="127.0.0.1", port=puerto)
