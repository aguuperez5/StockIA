import type {
  ProductCatalogLookup,
  RecognitionMatchMethod,
} from "@/services/backlog";

export function recognitionMethodLabel(method: RecognitionMatchMethod): string {
  return {
    barcode: "Código de barras",
    ocr_code: "Número impreso (OCR)",
    barcode_ocr: "Barras + número impreso (OCR)",
    ocr_name: "Texto del envase (OCR)",
  }[method];
}

export function confidenceLevelInfo(
  method?: RecognitionMatchMethod,
  isAmbiguous?: boolean
): { label: string; detail: string; level: "high" | "medium" | "low" | "ambiguous" } {
  if (isAmbiguous) {
    return {
      label: "Ambiguo",
      detail: "Múltiples códigos detectados o evidencia en conflicto",
      level: "ambiguous",
    };
  }
  switch (method) {
    case "barcode_ocr":
      return {
        label: "Confianza alta",
        detail: "Barcode + OCR corroborados independientemente",
        level: "high",
      };
    case "barcode":
      return {
        label: "Confianza media",
        detail: "Solo barcode (sin corroboración de número impreso)",
        level: "medium",
      };
    case "ocr_code":
      return {
        label: "Confianza baja",
        detail: "Solo OCR de número impreso (requiere verificación)",
        level: "low",
      };
    case "ocr_name":
      return {
        label: "Confianza baja",
        detail: "Coincidencia por nombre en texto (requiere verificación)",
        level: "low",
      };
    default:
      return {
        label: "Bajo revisión",
        detail: "Verificá el producto antes de agregarlo",
        level: "low",
      };
  }
}

export function productCatalogLookupText(lookup: ProductCatalogLookup): string {
  if (lookup.status === "found") {
    return `Open Food Facts: ${lookup.product.name || "producto registrado sin nombre"}${lookup.product.brand ? ` · ${lookup.product.brand}` : ""}`;
  }
  if (lookup.status === "rate_limited") {
    return lookup.retryAfterSeconds
      ? `Open Food Facts: límite de consultas. Volvé a analizar en ${lookup.retryAfterSeconds} segundos.`
      : "Open Food Facts: se alcanzó el límite de consultas. Volvé a analizar en un minuto.";
  }
  return {
    not_found: "Open Food Facts: no hay un producto para este código.",
    timeout: "Open Food Facts no respondió a tiempo. Podés volver a analizar.",
    unavailable: "Open Food Facts no está disponible. Podés volver a analizar.",
    invalid_response:
      "Open Food Facts: respuesta inválida; no se pudo confirmar el producto.",
  }[lookup.status];
}

type RecognitionResult = {
  status?: string;
  items: unknown[];
  identifiers?: Array<{ value: string; checksum_valid: boolean }>;
  warnings?: string[];
};

export function recognitionFeedback(result: RecognitionResult): string {
  const codes = Array.from(
    new Set(
      (result.identifiers ?? [])
        .filter(item => item.checksum_valid)
        .map(item => item.value)
    )
  );
  if (result.items.length) {
    return result.status === "ambiguous"
      ? "Se leyeron varios códigos. Revisá cuál corresponde al producto antes de agregarlo."
      : codes.length
        ? `Código leído: ${codes.join(", ")}. Revisá el producto antes de agregarlo.`
        : "";
  }
  if (codes.length) {
    return `Código leído: ${codes.join(", ")}. No está en el catálogo local. Registrá el producto con ese código como SKU para poder venderlo.`;
  }
  if (result.status === "catalog_search")
    return "No hay productos con ese nombre o SKU.";
  if (result.status === "low_quality")
    return "La imagen es demasiado chica. Acercá el código y tomá otra foto.";
  if (
    result.warnings?.includes("barcode_engine_unavailable") ||
    result.warnings?.includes("barcode_inference_failed")
  ) {
    return "El lector de códigos no está disponible. Reiniciá el servicio de IA.";
  }
  return "No se pudo identificar el producto. Mostrá el código completo, con buena luz y foco, o buscá por nombre o SKU.";
}
