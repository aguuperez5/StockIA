import { Plus } from "lucide-react";
import type { RecognitionDetection } from "@/services/backlog";
import {
  confidenceLevelInfo,
  productCatalogLookupText,
  recognitionMethodLabel,
} from "@/lib/recognitionFeedback";

export default function RecognitionReadings({
  detections,
  isAmbiguous = false,
  canCreateProduct = false,
  onCreateProduct,
}: {
  detections: RecognitionDetection[];
  isAmbiguous?: boolean;
  canCreateProduct?: boolean;
  onCreateProduct?: (code: string) => void;
}) {

  if (!detections.length) return null;
  return (
    <ul
      className="recognition-reading-list"
      aria-label="Códigos detectados"
      aria-live="polite"
    >
      {detections.map(detection => {
        const confidence = confidenceLevelInfo(detection.matchMethod, isAmbiguous);
        return (
          <li key={detection.value} className="recognition-reading">
            <div className="recognition-reading-header">
              <strong>{detection.value}</strong>
              <div style={{ display: "flex", gap: "6px", alignItems: "center", flexWrap: "wrap" }}>
                <span
                  className={`analysis-match-evidence ${detection.reviewRequired ? "needs-review" : ""}`}
                >
                  {recognitionMethodLabel(detection.matchMethod)}
                </span>
                <span
                  className="analysis-match-evidence"
                  style={{
                    fontSize: "11px",
                    fontWeight: 600,
                    background:
                      confidence.level === "high"
                        ? "var(--status-ok-bg)"
                        : confidence.level === "medium"
                          ? "var(--scanner-soft)"
                          : "var(--status-warn-bg)",
                    color:
                      confidence.level === "high"
                        ? "var(--status-ok-text)"
                        : confidence.level === "medium"
                          ? "var(--scanner-text)"
                          : "var(--status-warn-text)",
                  }}
                  title={confidence.detail}
                >
                  {confidence.label}
                </span>
              </div>
            </div>
            <p>{productCatalogLookupText(detection.catalogLookup)}</p>
            {detection.catalogLookup.status === "found" && (
              <a
                href={detection.catalogLookup.product.url}
                target="_blank"
                rel="noreferrer"
              >
                Ver fuente en Open Food Facts
              </a>
            )}
            <p>
              {detection.inLocalCatalog
                ? "Coincide con un producto del catálogo local."
                : "No está en el catálogo local. Registralo con este código como SKU para poder venderlo."}
              {detection.reviewRequired
                ? " Revisá la lectura antes de agregar el producto."
                : ""}
            </p>
            {!detection.inLocalCatalog && canCreateProduct && (
              <div style={{ marginTop: "6px" }}>
                <button
                  type="button"
                  className="button-secondary button-xs"
                  onClick={() => onCreateProduct?.(detection.value)}
                  style={{ display: "inline-flex", alignItems: "center", gap: "4px" }}
                >
                  <Plus size={12} />
                  <span>Crear producto con este código</span>
                </button>
              </div>
            )}
          </li>
        );
      })}
    </ul>
  );
}
