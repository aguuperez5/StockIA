import type { RecognitionDetection } from "@/services/backlog";
import {
  productCatalogLookupText,
  recognitionMethodLabel,
} from "@/lib/recognitionFeedback";

export default function RecognitionReadings({
  detections,
}: {
  detections: RecognitionDetection[];
}) {
  if (!detections.length) return null;
  return (
    <ul
      className="recognition-reading-list"
      aria-label="Códigos detectados"
      aria-live="polite"
    >
      {detections.map(detection => (
        <li key={detection.value} className="recognition-reading">
          <div className="recognition-reading-header">
            <strong>{detection.value}</strong>
            <span
              className={`analysis-match-evidence ${detection.reviewRequired ? "needs-review" : ""}`}
            >
              {recognitionMethodLabel(detection.matchMethod)}
            </span>
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
        </li>
      ))}
    </ul>
  );
}
