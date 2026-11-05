const MAX_IMAGE_BYTES = 15_000_000;
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
  const rawServiceUrl = process.env.AI_SERVICE_URL?.trim();
  if (!rawServiceUrl) {
    throw new AIRecognitionError(
      'El servicio de reconocimiento de imágenes no está configurado (falta AI_SERVICE_URL).',
      503,
    );
  }
  const serviceUrl = rawServiceUrl.replace(/\/+$/, "");
  const token = process.env.AI_SERVICE_TOKEN?.trim();

  const { bytes, mimeType } = readImage(photoData, photoMimeType);
  const isAprilTags = !serviceUrl.includes(':8010');
  const baseServiceUrl = serviceUrl.replace(/\/api$/, '');

  const form = new FormData();
  if (isAprilTags) {
    form.append("archivo", new Blob([bytes], { type: mimeType }), `stockia.${mimeType.slice(6)}`);
  } else {
    form.append("image", new Blob([bytes], { type: mimeType }), `stockia.${mimeType.slice(6)}`);
  }

  const endpoint = isAprilTags
    ? `${baseServiceUrl}/api/detectar?incluir_imagen=false`
    : `${serviceUrl}/v1/analyze`;

  const headers = {};
  if (token) {
    headers.Authorization = `Bearer ${token}`;
  }

  const controller = new AbortController();
  const timeoutMs = Math.max(1_000, Number(process.env.AI_SERVICE_TIMEOUT_MS) || 45_000);
  const timeout = setTimeout(() => controller.abort(), timeoutMs);

  try {
    const response = await fetch(endpoint, {
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

    if (isAprilTags) {
      if (!result || result.status !== 'success' || !Array.isArray(result.tags)) {
        throw new AIRecognitionError("El servicio de reconocimiento devolvió una respuesta inválida.", 502);
      }
      return result;
    }

    if (!result || typeof result !== "object" || !Array.isArray(result.identifiers) || !Array.isArray(result.text_evidence)) {
      throw new AIRecognitionError("El servicio de reconocimiento devolvió una respuesta inválida.", 502);
    }
    return result;
  } catch (error) {
    if (error instanceof AIRecognitionError) throw error;
    if (error?.name === "AbortError") {
      throw new AIRecognitionError("El análisis de imagen excedió el tiempo límite.", 504);
    }
    throw new AIRecognitionError(
      `No se pudo conectar con el servicio de tags (FastAPI). URL: ${serviceUrl}`,
      503,
    );
  } finally {
    clearTimeout(timeout);
  }
}
