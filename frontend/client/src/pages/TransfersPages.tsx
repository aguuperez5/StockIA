import { useEffect, useState } from "react";
import { useLocation, useRoute } from "wouter";
import {
  ArrowLeft,
  ArrowRight,
  Boxes,
  CalendarDays,
  Eye,
  FileText,
  Plus,
  SlidersHorizontal,
  Store as StoreIcon,
  Warehouse as WarehouseIcon,
  X,
} from "lucide-react";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import {
  ErrorPanel,
  EmptyState,
  LoadingPanel,
  PageHeader,
  datetime,
} from "@/components/StockUI";
import { ModernSelect } from "@/components/ModernSelect";
import { transferService, type Transfer } from "@/services/backlog";
import { warehouseService, type Warehouse } from "@/services/inventory";
import { productService, type Product } from "@/services/products";
import { TransferDetailModal } from "@/components/transfers/TransferDetailModal";
import { NewTransferModal } from "@/components/transfers/NewTransferModal";

export function TransfersHistoryPage() {
  const [, setLocation] = useLocation();
  const [selectedTransfer, setSelectedTransfer] = useState<Transfer | null>(null);
  const [isNewTransferOpen, setIsNewTransferOpen] = useState(false);
  const [items, setItems] = useState<Transfer[]>([]);
  const [warehouses, setWarehouses] = useState<Warehouse[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");
  const [warehouseId, setWarehouseId] = useState("");
  const [productId, setProductId] = useState("");
  const [originWarehouseId, setOriginWarehouseId] = useState("");
  const [destinationWarehouseId, setDestinationWarehouseId] = useState("");
  const [status, setStatus] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const load = () => {
    setLoading(true);
    transferService
      .list({
        from,
        to,
        warehouseId,
        productId,
        originWarehouseId,
        destinationWarehouseId,
        status,
      })
      .then(r => setItems(r.items))
      .catch(e => setError(e.message))
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    let cancelled = false;
    Promise.all([warehouseService.list(), productService.list()])
      .then(([w, p]) => {
        if (!cancelled) {
          setWarehouses(w.items);
          setProducts(p.items);
        }
      })
      .catch((err: Error) => {
        console.error(
          "Error al cargar depósitos o productos para transferencias:",
          err
        );
      });
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    if (
      typeof window !== "undefined" &&
      (window.location.search.includes("new=1") ||
        window.location.search.includes("new=true"))
    ) {
      setIsNewTransferOpen(true);
      const cleanUrl = window.location.pathname;
      window.history.replaceState({}, document.title, cleanUrl);
    }
  }, []);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    transferService
      .list({
        from,
        to,
        warehouseId,
        productId,
        originWarehouseId,
        destinationWarehouseId,
        status,
      })
      .then(r => {
        if (!cancelled) setItems(r.items);
      })
      .catch(e => {
        if (!cancelled) setError(e.message);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [
    from,
    to,
    warehouseId,
    productId,
    originWarehouseId,
    destinationWarehouseId,
    status,
  ]);

  const clearFilters = () => {
    setFrom("");
    setTo("");
    setWarehouseId("");
    setProductId("");
    setOriginWarehouseId("");
    setDestinationWarehouseId("");
    setStatus("");
  };

  const hasAdvancedFilters = Boolean(productId || status || warehouseId);
  const advancedCount =
    (productId ? 1 : 0) + (status ? 1 : 0) + (warehouseId ? 1 : 0);
  const hasFilters = Boolean(
    from ||
    to ||
    originWarehouseId ||
    destinationWarehouseId ||
    hasAdvancedFilters
  );

  const clearAdvancedFilters = () => {
    setProductId("");
    setStatus("");
    setWarehouseId("");
  };

  return (
    <>
      <PageHeader
        eyebrow="Logística"
        title="Transferencias"
        description="Consultá los remitos emitidos entre depósitos."
        action={
          <button
            className="button-primary"
            onClick={() => setIsNewTransferOpen(true)}
          >
            <Plus size={16} />
            Nueva transferencia
          </button>
        }
      />
      <section className="filter-bar">
        <ModernSelect
          value={originWarehouseId}
          onChange={setOriginWarehouseId}
          options={[
            { value: "", label: "Todos los depósitos" },
            ...warehouses.map(w => ({ value: w.id, label: w.name })),
          ]}
          labelPrefix="Origen:"
          ariaLabel="Filtrar por depósito de origen"
        />

        <ModernSelect
          value={destinationWarehouseId}
          onChange={setDestinationWarehouseId}
          options={[
            { value: "", label: "Todos los depósitos" },
            ...warehouses.map(w => ({ value: w.id, label: w.name })),
          ]}
          labelPrefix="Destino:"
          ariaLabel="Filtrar por depósito de destino"
        />

        <div className="filter-date-group" title="Filtrar por rango de fechas">
          <CalendarDays size={15} />
          <input
            type="date"
            value={from}
            onChange={e => setFrom(e.target.value)}
            aria-label="Fecha desde"
          />
          <span className="date-sep">a</span>
          <input
            type="date"
            value={to}
            onChange={e => setTo(e.target.value)}
            aria-label="Fecha hasta"
          />
        </div>

        <Popover>
          <PopoverTrigger asChild>
            <button
              type="button"
              className={`filter-more-btn ${hasAdvancedFilters ? "active" : ""}`}
              aria-label="Más filtros"
            >
              <SlidersHorizontal size={14} />
              Más filtros
              {advancedCount > 0 && (
                <span className="filter-count-badge">{advancedCount}</span>
              )}
            </button>
          </PopoverTrigger>
          <PopoverContent align="start" className="filter-popover-content">
            <div className="filter-popover-panel">
              <div className="filter-popover-header">
                <div className="filter-popover-heading">
                  <SlidersHorizontal
                    size={14}
                    className="filter-heading-icon"
                  />
                  <span>Filtros avanzados</span>
                </div>
                {hasAdvancedFilters && (
                  <button
                    type="button"
                    className="filter-popover-reset"
                    onClick={clearAdvancedFilters}
                  >
                    Restablecer
                  </button>
                )}
              </div>

              <div className="filter-popover-item">
                <label>Producto transferido</label>
                <ModernSelect
                  value={productId}
                  onChange={setProductId}
                  options={[
                    { value: "", label: "Todos los productos" },
                    ...products.map(p => ({ value: p.id, label: p.name })),
                  ]}
                  ariaLabel="Filtrar por producto"
                  minWidth="100%"
                />
              </div>

              <div className="filter-popover-item">
                <label>Estado de remito</label>
                <ModernSelect
                  value={status}
                  onChange={setStatus}
                  options={[
                    { value: "", label: "Todos los estados" },
                    { value: "Confirmada", label: "Confirmada" },
                  ]}
                  ariaLabel="Filtrar por estado"
                  minWidth="100%"
                />
              </div>

              <div className="filter-popover-item">
                <label>Cualquier depósito (origen o destino)</label>
                <ModernSelect
                  value={warehouseId}
                  onChange={setWarehouseId}
                  options={[
                    { value: "", label: "Todos los depósitos" },
                    ...warehouses.map(w => ({ value: w.id, label: w.name })),
                  ]}
                  ariaLabel="Filtrar por cualquier depósito"
                  minWidth="100%"
                />
              </div>
            </div>
          </PopoverContent>
        </Popover>

        {hasFilters && (
          <button
            className="button-secondary filter-clear"
            onClick={clearFilters}
            type="button"
          >
            <X size={14} />
            Limpiar
          </button>
        )}
      </section>
      {error && <ErrorPanel message={error} retry={load} />}
      {loading ? (
        <LoadingPanel />
      ) : items.length ? (
        <div className="table-card transfers-table-card">
          <div className="table-scroll">
            <table className="transfers-table">
              <thead>
                <tr>
                  <th style={{ minWidth: "120px" }}>Remito</th>
                  <th style={{ minWidth: "160px" }}>Origen</th>
                  <th style={{ width: "24px", textAlign: "center", padding: "10px 2px" }}></th>
                  <th style={{ minWidth: "160px" }}>Destino</th>
                  <th style={{ minWidth: "140px" }}>Mercadería movida</th>
                  <th style={{ minWidth: "110px" }}>Estado</th>
                  <th style={{ minWidth: "140px" }}>Fecha</th>
                  <th style={{ textAlign: "right", minWidth: "110px" }}>Acción</th>
                </tr>
              </thead>
              <tbody>
                {items.map(item => (
                  <tr
                    key={item.id}
                    className="clickable-transfer-row"
                    onClick={() => setSelectedTransfer(item)}
                    role="button"
                    tabIndex={0}
                    onKeyDown={e => {
                      if (e.key === "Enter" || e.key === " ") {
                        e.preventDefault();
                        setSelectedTransfer(item);
                      }
                    }}
                  >
                    <td>
                      <div className="transfer-receipt-cell">
                        <FileText size={15} className="receipt-icon" />
                        <b className="receipt-number">{item.receiptNumber}</b>
                      </div>
                    </td>
                    <td>
                      <div className="transfer-point-cell origin">
                        <StoreIcon size={14} className="point-icon origin" />
                        <span className="point-name">
                          {item.originName ?? `Depósito ${item.originWarehouseId}`}
                        </span>
                      </div>
                    </td>
                    <td style={{ textAlign: "center", padding: "0 2px" }}>
                      <ArrowRight size={13} className="route-arrow-icon" />
                    </td>
                    <td>
                      <div className="transfer-point-cell destination">
                        <WarehouseIcon size={14} className="point-icon destination" />
                        <span className="point-name">
                          {item.destinationName ?? `Depósito ${item.destinationWarehouseId}`}
                        </span>
                      </div>
                    </td>
                    <td>
                      <div className="transfer-volume-cell">
                        <span className="transfer-units-pill">
                          <Boxes size={13} />
                          {item.totalUnits != null
                            ? `${item.totalUnits.toLocaleString("es-AR")} un.`
                            : `${item.itemCount ?? 1} ítems`}
                        </span>
                        {item.itemCount != null && (
                          <small className="transfer-skus-caption">
                            {item.itemCount} artículo{item.itemCount === 1 ? "" : "s"}
                          </small>
                        )}
                      </div>
                    </td>
                    <td>
                      <span className="transfer-status-tag">
                        {item.status || "Confirmada"}
                      </span>
                    </td>
                    <td>
                      <span className="transfer-date-cell">{datetime(item.createdAt)}</span>
                    </td>
                    <td style={{ textAlign: "right" }}>
                      <button
                        type="button"
                        className="button-secondary button-sm transfer-detail-btn"
                        onClick={e => {
                          e.stopPropagation();
                          setSelectedTransfer(item);
                        }}
                      >
                        <Eye size={13} />
                        <span>Detalle</span>
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <div className="table-footer transfers-table-footer">
            <span>
              Mostrando <b>{items.length}</b> transferencias registradas
            </span>
          </div>
        </div>
      ) : (
        <EmptyState
          title="Todavía no hay transferencias"
          detail="Cuando muevas mercadería entre depósitos, los remitos van a aparecer acá."
        />
      )}

      {isNewTransferOpen && (
        <NewTransferModal
          isOpen={isNewTransferOpen}
          onClose={() => setIsNewTransferOpen(false)}
          onSuccess={created => {
            load();
            setSelectedTransfer(created);
          }}
        />
      )}

      {selectedTransfer && (
        <TransferDetailModal
          transferId={selectedTransfer.id}
          initialTransfer={selectedTransfer}
          onClose={() => setSelectedTransfer(null)}
        />
      )}
    </>
  );
}
export function TransferReceiptPage() {
  const [, params] = useRoute("/transfers/:id/receipt");
  const [, setLocation] = useLocation();
  const [data, setData] = useState<Awaited<
    ReturnType<typeof transferService.get>
  > | null>(null);
  const [error, setError] = useState("");
  useEffect(() => {
    if (params?.id)
      transferService
        .get(params.id)
        .then(setData)
        .catch(e => setError(e.message));
  }, [params?.id]);
  if (error) return <ErrorPanel message={error} />;
  if (!data) return <LoadingPanel />;
  return (
    <>
      <PageHeader
        eyebrow="Remito"
        title={data.transfer.receiptNumber}
        description="Comprobante de transferencia entre depósitos."
        action={
          <button
            className="button-secondary"
            onClick={() => setLocation("/transfers")}
          >
            <ArrowLeft size={16} />
            Volver
          </button>
        }
      />
      <section className="receipt-card">
        <p>
          <b>Estado:</b> {data.transfer.status}
        </p>
        <p>
          <b>Origen:</b> {data.transfer.originName} · <b>Destino:</b>{" "}
          {data.transfer.destinationName}
        </p>
        {typeof data.transfer.photoData === "string" && (
          <img
            src={data.transfer.photoData}
            alt="Foto asociada a la transferencia"
            style={{
              maxWidth: "100%",
              maxHeight: "180px",
              objectFit: "contain",
            }}
          />
        )}
        {data.items.map(item => (
          <div className="receipt-line" key={item.productId}>
            <span>
              {item.productName} · {item.sku}
            </span>
            <b>{item.quantity} u.</b>
          </div>
        ))}
        <button className="button-primary" onClick={() => window.print()}>
          Imprimir remito
        </button>
      </section>
    </>
  );
}
