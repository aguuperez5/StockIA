import argparse
import io
import os
import sys
import cv2
import numpy as np

try:
    from PIL import Image, ImageOps
    import pillow_heif
    pillow_heif.register_heif_opener()
    SOPORTE_HEIC = True
except ImportError:
    SOPORTE_HEIC = False


class DetectorProductosAprilTag:
    def __init__(self):
        self.diccionario_aruco = cv2.aruco.getPredefinedDictionary(cv2.aruco.DICT_APRILTAG_36h11)
        self.parametros_detector = cv2.aruco.DetectorParameters()
        if hasattr(cv2.aruco, "ArucoDetector"):
            self.detector = cv2.aruco.ArucoDetector(self.diccionario_aruco, self.parametros_detector)
        else:
            self.detector = None

    def cargar_imagen(self, origen):
        if isinstance(origen, np.ndarray):
            return origen.copy()
        if isinstance(origen, (bytes, bytearray)):
            stream = io.BytesIO(origen)
            if SOPORTE_HEIC:
                try:
                    img_pil = Image.open(stream)
                    img_pil = ImageOps.exif_transpose(img_pil)
                    img_rgb = np.array(img_pil.convert("RGB"))
                    return cv2.cvtColor(img_rgb, cv2.COLOR_RGB2BGR)
                except Exception:
                    stream.seek(0)
            nparr = np.frombuffer(origen, np.uint8)
            img = cv2.imdecode(nparr, cv2.IMREAD_COLOR)
            if img is None:
                raise ValueError("No se pudieron decodificar los bytes de la imagen.")
            return img
        if isinstance(origen, str):
            if not os.path.exists(origen):
                raise FileNotFoundError(f"No existe el archivo: {origen}")
            extension = os.path.splitext(origen)[1].lower()
            if extension in [".heic", ".heif"]:
                if not SOPORTE_HEIC:
                    raise ImportError("Instala 'pip install pillow-heif pillow' para soporte HEIC.")
                img_pil = Image.open(origen)
                img_pil = ImageOps.exif_transpose(img_pil)
                img_rgb = np.array(img_pil.convert("RGB"))
                return cv2.cvtColor(img_rgb, cv2.COLOR_RGB2BGR)
            if SOPORTE_HEIC:
                try:
                    img_pil = Image.open(origen)
                    img_pil = ImageOps.exif_transpose(img_pil)
                    img_rgb = np.array(img_pil.convert("RGB"))
                    return cv2.cvtColor(img_rgb, cv2.COLOR_RGB2BGR)
                except Exception:
                    pass
            imagen = cv2.imread(origen)
            if imagen is None:
                raise ValueError(f"No se pudo cargar la imagen: {origen}")
            return imagen
        raise TypeError(f"Tipo de origen no soportado: {type(origen)}")

    def detectar_en_imagen(self, origen, max_dimension=1920):
        imagen = self.cargar_imagen(origen)
        alto, ancho = imagen.shape[:2]
        if max(alto, ancho) > max_dimension:
            escala = max_dimension / max(alto, ancho)
            nuevo_ancho = int(ancho * escala)
            nuevo_alto = int(alto * escala)
            imagen = cv2.resize(imagen, (nuevo_ancho, nuevo_alto), interpolation=cv2.INTER_AREA)

        gris = cv2.cvtColor(imagen, cv2.COLOR_BGR2GRAY)
        if self.detector is not None:
            esquinas, ids, rejected = self.detector.detectMarkers(gris)
        else:
            esquinas, ids, rejected = cv2.aruco.detectMarkers(
                gris, self.diccionario_aruco, parameters=self.parametros_detector
            )

        if ids is None or len(ids) == 0:
            gris_pad = cv2.copyMakeBorder(gris, 40, 40, 40, 40, cv2.BORDER_CONSTANT, value=255)
            if max(gris_pad.shape[:2]) < 400:
                gris_pad = cv2.resize(gris_pad, (0, 0), fx=2.0, fy=2.0, interpolation=cv2.INTER_NEAREST)
            if self.detector is not None:
                esquinas, ids, rejected = self.detector.detectMarkers(gris_pad)
            else:
                esquinas, ids, rejected = cv2.aruco.detectMarkers(
                    gris_pad, self.diccionario_aruco, parameters=self.parametros_detector
                )

        imagen_anotada = imagen.copy()
        lista_detecciones = []

        if ids is not None and len(ids) > 0:
            cv2.aruco.drawDetectedMarkers(imagen_anotada, esquinas, ids)
            flat_ids = np.ravel(ids)
            for i in range(len(flat_ids)):
                tag_id = int(flat_ids[i])
                pts = esquinas[i][0].astype(int)
                centro_x = int(np.mean(pts[:, 0]))
                centro_y = int(np.mean(pts[:, 1]))
                lista_detecciones.append({
                    "id": tag_id,
                    "center": [centro_x, centro_y]
                })

        return lista_detecciones, imagen_anotada


if __name__ == "__main__":
    detector = DetectorProductosAprilTag()
    # Para pruebas rápidas locales
    if len(sys.argv) > 1:
        res, img = detector.detectar_en_imagen(sys.argv[1])
        print("Detecciones:", res)
