from io import BytesIO

import cv2
import numpy as np
from PIL import Image, UnidentifiedImageError


SUPPORTED_MIME_TYPES = {"image/jpeg", "image/png", "image/webp"}


class ImageInputError(ValueError):
    """Raised when an uploaded image is unsafe or cannot be decoded."""


def decode_image(
    raw: bytes,
    mime_type: str,
    *,
    max_bytes: int,
    max_pixels: int,
) -> np.ndarray:
    mime_type = mime_type.split(";", 1)[0].strip().lower()
    if mime_type not in SUPPORTED_MIME_TYPES:
        raise ImageInputError("Solo se aceptan imágenes JPEG, PNG o WebP.")
    if not raw:
        raise ImageInputError("La imagen está vacía.")
    if len(raw) > max_bytes:
        raise ImageInputError("La imagen supera el tamaño máximo permitido.")

    try:
        with Image.open(BytesIO(raw)) as image:
            expected_format = {
                "image/jpeg": "JPEG",
                "image/png": "PNG",
                "image/webp": "WEBP",
            }[mime_type]
            if image.format != expected_format:
                raise ImageInputError("El contenido de la imagen no coincide con su formato.")
            width, height = image.size
            if width <= 0 or height <= 0 or width * height > max_pixels:
                raise ImageInputError("La resolución de la imagen supera el límite permitido.")
            image.verify()
    except ImageInputError:
        raise
    except (UnidentifiedImageError, OSError, Image.DecompressionBombError) as error:
        raise ImageInputError("No se pudo decodificar la imagen.") from error

    encoded = np.frombuffer(raw, dtype=np.uint8)
    decoded = cv2.imdecode(encoded, cv2.IMREAD_COLOR)
    if decoded is None:
        raise ImageInputError("No se pudo decodificar la imagen.")
    return decoded
