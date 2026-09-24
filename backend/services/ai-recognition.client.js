const MAX_IMAGE_BYTES = 3_500_000;
const SUPPORTED_MIME_TYPES = new Set(["image/jpeg", "image/png", "image/webp"]);

export class AIRecognitionError extends Error {
  constructor(message, statusCode = 503) {
    super(message);
    this.name = "AIRecognitionError";
    this.statusCode = statusCode;
  }
}

function readImage(photoData, declaredMimeType) {
  if (typeof photoData !== "string" || !photoData) {
    throw new AIRecognitionError("La imagen no es válida.", 400);
  }

  const dataUrl = /^data:(image\/(?:jpeg|png|webp));base64,([\s\S]+)$/i.exec(photoData);
  const embeddedMimeType = dataUrl?.[1]?.toLowerCase();
  const base64 = dataUrl ? dataUrl[2] : photoData;
  const mimeType = String(declaredMimeType || embeddedMimeType || "").toLowerCase();
  if (!SUPPORTED_MIME_TYPES.has(mimeType) || (embeddedMimeType && embeddedMimeType !== mimeType)) {
    throw new AIRecognitionError("Solo se aceptan imágenes JPEG, PNG o WebP.", 400);
  }
  if (!/^[A-Za-z0-9+/]*={0,2}$/.test(base64)) {
    throw new AIRecognitionError("El formato de la imagen codificada no es válido.", 400);
  }

  const bytes = Buffer.from(base64, "base64");
  if (!bytes.length || bytes.length > MAX_IMAGE_BYTES) {
    throw new AIRecognitionError("La imagen está vacía o supera el tamaño máximo permitido.", 400);
  }
  return { bytes, mimeType };
}

export async function analyzeProductImage({ photoData, photoMimeType }) {
  const serviceUrl = process.env.AI_SERVICE_URL?.trim().replace(/\/+$/, "");
  if (!serviceUrl) {
    throw new AIRecognitionError(
      "El reconocimiento visual no está configurado. Buscá el producto por nombre o SKU.",
      503,
    );
  }

  const { bytes, mimeType } = readImage(photoData, photoMimeType);
  const form = new FormData();
  form.append("image", new Blob([bytes], { type: mimeType }), `stockia.${mimeType.slice(6)}`);
  const headers = {};
  if (process.env.AI_SERVICE_TOKEN) {
    headers.Authorization = `Bearer ${process.env.AI_SERVICE_TOKEN}`;
  }

  const controller = new AbortController();
  const timeoutMs = Math.max(1_000, Number(process.env.AI_SERVICE_TIMEOUT_MS) || 15_000);
  const timeout = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const response = await fetch(`${serviceUrl}/v1/analyze`, {
      method: "POST",
      headers,
      body: form,
      signal: controller.signal,
    });
    const result = await response.json().catch(() => null);
    if (!response.ok) {
      throw new AIRecognitionError(
        result?.detail || "El servicio de reconocimiento no pudo analizar la imagen.",
        502,
      );
    }
    if (!result || !Array.isArray(result.identifiers) || !Array.isArray(result.text_evidence)) {
      throw new AIRecognitionError("El servicio de reconocimiento devolvió una respuesta inválida.", 502);
    }
    return result;
  } catch (error) {
    if (error instanceof AIRecognitionError) throw error;
    if (error?.name === "AbortError") {
      throw new AIRecognitionError("El análisis de imagen excedió el tiempo límite.", 504);
    }
    throw new AIRecognitionError("No se pudo conectar con el servicio de reconocimiento.", 503);
  } finally {
    clearTimeout(timeout);
  }
}
