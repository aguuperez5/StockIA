import { useEffect, useState } from "react";
import {
  AlertTriangle,
  ArrowRight,
  Boxes,
  Calendar,
  CheckCircle2,
  FileText,
  Image as ImageIcon,
  Package,
  Printer,
  Store,
  Warehouse,
  X,
} from "lucide-react";
import { datetime, money } from "@/components/StockUI";
import { transferService, type Transfer } from "@/services/backlog";

export interface TransferDetailModalProps {
  transferId: number;
  initialTransfer?: Transfer;
  onClose: () => void;
}

type TransferDetailData = Awaited<ReturnType<typeof transferService.get>>;

export function TransferDetailModal({
  transferId,
  initialTransfer,
  onClose,
}: TransferDetailModalProps) {
  const [data, setData] = useState<TransferDetailData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [showFullPhoto, setShowFullPhoto] = useState(false);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError("");

    transferService
      .get(transferId)
      .then(res => {
        if (!cancelled) {
          setData(res);
          setLoading(false);
        }
      })
      .catch(err => {
        if (!cancelled) {
          setError(err instanceof Error ? err.message : String(err));
          setLoading(false);
        }
      });

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => {
      cancelled = true;
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [transferId, onClose]);

  const transfer = data?.transfer || initialTransfer;
  const items = data?.items || [];

  const totalUnits = items.reduce((acc, i) => acc + i.quantity, 0);
  const totalValueCents = items.reduce(
    (acc, i) => acc + (i.priceCents ? i.priceCents * i.quantity : 0),
    0
  );

  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div
        className="modal-card transfer-detail-modal"
        role="dialog"
        aria-modal="true"
        aria-labelledby="transfer-modal-title"
        onClick={e => e.stopPropagation()}
      >
        {/* Encabezado del Modal */}
        <header className="modal-header transfer-modal-header">
          <div className="transfer-header-title-group">
            <span className="transfer-header-icon-badge">
              <FileText size={22} />
            </span>
            <div>
              <div className="transfer-header-eyebrow">
                <span>Comprobante de Movimiento Logístico</span>
                <span className="transfer-status-badge">
                  <CheckCircle2 size={12} /> {transfer?.status || "Confirmada"}
                </span>
              </div>
              <h2 id="transfer-modal-title">
                Remito: {transfer?.receiptNumber || `ID #${transferId}`}
              </h2>
              <div className="transfer-header-meta">
                <span>
                  <Calendar size={13} />{" "}
                  {transfer?.createdAt
                    ? datetime(transfer.createdAt)
                    : "Fecha no disponible"}
                </span>
                <span>·</span>
                <span>Transferencia ID #{transferId}</span>
              </div>
            </div>
          </div>

          <div className="transfer-modal-header-actions">
            <button
              type="button"
              className="button-secondary button-sm"
              onClick={handlePrint}
              title="Imprimir comprobante oficial"
            >
              <Printer size={15} /> Imprimir remito
            </button>
            <button
              type="button"
              className="modal-close-btn"
              onClick={onClose}
              aria-label="Cerrar detalle"
            >
              <X size={18} />
            </button>
          </div>
        </header>

        {/* Cuerpo del Modal */}
        <div className="transfer-modal-body">
          {error && (
            <div className="error-panel" style={{ margin: "14px 0" }}>
              <AlertTriangle size={18} />
              <span>{error}</span>
            </div>
          )}

          {/* RUTA LOGÍSTICA: ORIGEN → DESTINO */}
          <section className="transfer-route-card">
            <div className="route-point origin-point">
              <div className="point-icon-bubble origin-bubble">
                <Store size={22} />
              </div>
              <div className="point-info">
                <span className="point-tag">Depósito de Origen</span>
                <h3>
                  {transfer?.originName ||
                    `Depósito ${transfer?.originWarehouseId ?? "Origen"}`}
                </h3>
                {transfer?.originLocation ? (
                  <p className="point-location">{transfer.originLocation}</p>
                ) : (
                  <p className="point-sub">Punto de despacho</p>
                )}
              </div>
            </div>

            <div className="route-connector">
              <div className="connector-pill">
                <span>Transferencia de stock</span>
                <ArrowRight size={16} />
              </div>
              <div className="connector-line" />
            </div>

            <div className="route-point destination-point">
              <div className="point-icon-bubble destination-bubble">
                <Warehouse size={22} />
              </div>
              <div className="point-info">
                <span className="point-tag">Depósito de Destino</span>
                <h3>
                  {transfer?.destinationName ||
                    `Depósito ${transfer?.destinationWarehouseId ?? "Destino"}`}
                </h3>
                {transfer?.destinationLocation ? (
                  <p className="point-location">{transfer.destinationLocation}</p>
                ) : (
                  <p className="point-sub">Punto de recepción</p>
                )}
              </div>
            </div>
          </section>

          {/* KPIs del Envío */}
          <section className="metric-grid transfer-kpis-grid">
            <article className="metric-card">
              <span className="metric-icon-bubble">
                <Boxes size={18} />
              </span>
              <div>
                <p>Total de unidades movidas</p>
                <h2>
                  {loading && !items.length
                    ? "..."
                    : `${totalUnits.toLocaleString("es-AR")} un.`}
                </h2>
                <small>Mercadería transferida con éxito</small>
              </div>
            </article>

            <article className="metric-card">
              <span className="metric-icon-bubble">
                <Package size={18} />
              </span>
              <div>
                <p>Variedad de productos</p>
                <h2>
                  {loading && !items.length
                    ? "..."
                    : `${items.length} artículo${items.length === 1 ? "" : "s"}`}
                </h2>
                <small>SKUs distintos en este remito</small>
              </div>
            </article>

            {totalValueCents > 0 && (
              <article className="metric-card">
                <span className="metric-icon-bubble">
                  <FileText size={18} />
                </span>
                <div>
                  <p>Valuación de la carga</p>
                  <h2>{money(totalValueCents)}</h2>
                  <small>A precio de lista actual</small>
                </div>
              </article>
            )}
          </section>

          {/* TABLA DE PRODUCTOS MOVIDOS */}
          <section className="transfer-items-section">
            <div className="transfer-items-heading">
              <div>
                <h4>Detalle de productos transferidos</h4>
                <p>Artículos y cantidades descargadas en destino</p>
              </div>
              <span className="items-count-badge">
                {items.length} producto{items.length === 1 ? "" : "s"}
              </span>
            </div>

            {loading ? (
              <div className="transfer-loading-state">
                <div className="spinner" />
                <span>Cargando detalle de mercadería...</span>
              </div>
            ) : items.length > 0 ? (
              <div className="table-scroll transfer-table-scroll">
                <table>
                  <thead>
                    <tr>
                      <th scope="col" style={{ width: "36px" }}>
                        #
                      </th>
                      <th scope="col">Producto transferido</th>
                      <th scope="col">SKU / Código</th>
                      <th scope="col">Categoría</th>
                      <th scope="col" style={{ textAlign: "right" }}>
                        Cantidad movida
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {items.map((item, index) => (
                      <tr key={item.productId || index}>
                        <td>
                          <span className="item-index-badge">{index + 1}</span>
                        </td>
                        <td>
                          <b className="item-name">{item.productName}</b>
                        </td>
                        <td>
                          <span className="item-sku-tag">{item.sku}</span>
                        </td>
                        <td>
                          <span className="item-category-tag">
                            {item.category || "General"}
                          </span>
                        </td>
                        <td style={{ textAlign: "right" }}>
                          <span className="quantity-moved-pill">
                            +{item.quantity.toLocaleString("es-AR")} un.
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                  <tfoot>
                    <tr>
                      <td colSpan={4} style={{ textAlign: "right", fontWeight: 700 }}>
                        Total unidades trasladadas:
                      </td>
                      <td style={{ textAlign: "right", fontWeight: 800 }}>
                        {totalUnits.toLocaleString("es-AR")} un.
                      </td>
                    </tr>
                  </tfoot>
                </table>
              </div>
            ) : (
              <div className="empty-subcard-notice">
                <Package size={20} />
                <span>No hay ítems registrados en esta transferencia.</span>
              </div>
            )}
          </section>

          {/* FOTO ADJUNTA DEL REMITO (SI EXISTE) */}
          {data?.transfer?.photoData && typeof data.transfer.photoData === "string" && (
            <section className="transfer-photo-section">
              <div className="photo-section-header">
                <div className="photo-title">
                  <ImageIcon size={15} />
                  <span>Constancia / Remito firmado adjunto</span>
                </div>
                <button
                  type="button"
                  className="button-link text-xs"
                  onClick={() => setShowFullPhoto(!showFullPhoto)}
                >
                  {showFullPhoto ? "Reducir vista" : "Ampliar vista"}
                </button>
              </div>

              <div
                className={`photo-preview-wrapper ${showFullPhoto ? "expanded" : ""}`}
                onClick={() => setShowFullPhoto(!showFullPhoto)}
                title="Hacé clic para ampliar o reducir"
              >
                <img
                  src={data.transfer.photoData}
                  alt="Constancia fotográfica de la transferencia"
                />
              </div>
            </section>
          )}
        </div>

        {/* Pie del modal */}
        <footer className="modal-footer transfer-modal-footer">
          <span className="footer-legend">
            Remito #{transfer?.receiptNumber} · Emitido por StockIA Logística
          </span>
          <div className="footer-actions">
            <button type="button" className="button-secondary" onClick={onClose}>
              Cerrar
            </button>
          </div>
        </footer>
      </div>
    </div>
  );
}
