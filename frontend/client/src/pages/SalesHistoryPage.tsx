import {
  CalendarDays,
  Eye,
  ReceiptText,
  Search,
  ShoppingCart,
  SlidersHorizontal,
  Store,
  X,
} from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import { useLocation } from "wouter";
import {
  EmptyState,
  ErrorPanel,
  LoadingPanel,
  PageHeader,
  datetime,
  money,
} from "@/components/StockUI";
import { ModernSelect } from "@/components/ModernSelect";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { useAsyncData } from "@/hooks/useAsyncData";
import { saleService } from "@/services/sales";
import { warehouseService, type Warehouse } from "@/services/inventory";
import { productService, type Product } from "@/services/products";
import { NewSaleModal } from "@/components/sales/NewSaleModal";

export default function SalesHistoryPage() {
  const [, setLocation] = useLocation();
  const [isNewSaleOpen, setIsNewSaleOpen] = useState(false);
  const [warehouses, setWarehouses] = useState<Warehouse[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");
  const [warehouseId, setWarehouseId] = useState("");
  const [productId, setProductId] = useState("");
  const [search, setSearch] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [minTotal, setMinTotal] = useState("");
  const [maxTotal, setMaxTotal] = useState("");

  useEffect(() => {
    if (
      typeof window !== "undefined" &&
      (window.location.search.includes("new=1") ||
        window.location.search.includes("new=true"))
    ) {
      setIsNewSaleOpen(true);
      const cleanUrl = window.location.pathname;
      window.history.replaceState({}, document.title, cleanUrl);
    }
  }, []);

  useEffect(() => {
    const timer = window.setTimeout(() => {
      setDebouncedSearch(search);
    }, 220);
    return () => window.clearTimeout(timer);
  }, [search]);

  const {
    data: salesData,
    loading,
    error,
    reload: load,
  } = useAsyncData(
    () => saleService.list(from, to, warehouseId, debouncedSearch, productId),
    [from, to, warehouseId, debouncedSearch, productId]
  );
  const items = salesData?.items ?? [];

  useEffect(() => {
    let cancelled = false;
    Promise.all([warehouseService.list(), productService.list()])
      .then(([warehouseResult, productResult]) => {
        if (!cancelled) {
          setWarehouses(warehouseResult.items);
          setProducts(productResult.items);
        }
      })
      .catch((err: Error) => {
        console.error(
          "Error al cargar depósitos o productos para historial de ventas:",
          err
        );
      });
    return () => {
      cancelled = true;
    };
  }, []);

  const filteredItems = useMemo(
    () =>
      items.filter(
        item =>
          (minTotal === "" || item.totalCents / 100 >= Number(minTotal)) &&
          (maxTotal === "" || item.totalCents / 100 <= Number(maxTotal))
      ),
    [items, minTotal, maxTotal]
  );

  const clearFilters = () => {
    setFrom("");
    setTo("");
    setWarehouseId("");
    setProductId("");
    setSearch("");
    setDebouncedSearch("");
    setMinTotal("");
    setMaxTotal("");
  };

  const clearAdvancedFilters = () => {
    setProductId("");
    setMinTotal("");
    setMaxTotal("");
  };

  const hasAdvancedFilters = Boolean(
    productId || minTotal !== "" || maxTotal !== ""
  );
  const advancedCount =
    (productId ? 1 : 0) + (minTotal !== "" || maxTotal !== "" ? 1 : 0);
  const hasAnyFilter = Boolean(
    search || from || to || warehouseId || hasAdvancedFilters
  );

  return (
    <>
      <PageHeader
        eyebrow="Operación comercial"
        title="Historial de ventas"
        description="Revisá comprobantes emitidos y el total registrado por cada operación."
        action={
          <button
            className="button-primary"
            onClick={() => setIsNewSaleOpen(true)}
          >
            <ShoppingCart size={17} />
            Nueva venta
          </button>
        }
      />

      <section className="filter-bar">
        <label className="search-control">
          <Search size={15} />
          <input
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Buscar comprobante, cliente..."
            aria-label="Buscar comprobante o cliente"
          />
          {search && (
            <button
              type="button"
              className="telegram-search-clear"
              onClick={() => {
                setSearch("");
                setDebouncedSearch("");
              }}
              aria-label="Limpiar búsqueda"
            >
              <X size={12} />
            </button>
          )}
        </label>

        <ModernSelect
          value={warehouseId}
          onChange={setWarehouseId}
          options={[
            { value: "", label: "Todos los depósitos" },
            ...warehouses.map(warehouse => ({
              value: warehouse.id,
              label: warehouse.name,
            })),
          ]}
          icon={<Store size={15} />}
          ariaLabel="Filtrar por depósito"
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
                <label>Producto vendido</label>
                <ModernSelect
                  value={productId}
                  onChange={setProductId}
                  options={[
                    { value: "", label: "Todos los productos" },
                    ...products.map(product => ({
                      value: product.id,
                      label: product.name,
                    })),
                  ]}
                  ariaLabel="Filtrar por producto"
                  minWidth="100%"
                />
              </div>

              <div className="filter-popover-item">
                <label>Importe total ($)</label>
                <div className="filter-popover-grid">
                  <div className="popover-input-wrapper">
                    <span className="popover-input-prefix">$</span>
                    <input
                      type="number"
                      min="0"
                      value={minTotal}
                      onChange={e => setMinTotal(e.target.value)}
                      placeholder="Mínimo"
                      aria-label="Importe mínimo"
                    />
                  </div>
                  <div className="popover-input-wrapper">
                    <span className="popover-input-prefix">$</span>
                    <input
                      type="number"
                      min="0"
                      value={maxTotal}
                      onChange={e => setMaxTotal(e.target.value)}
                      placeholder="Máximo"
                      aria-label="Importe máximo"
                    />
                  </div>
                </div>
              </div>
            </div>
          </PopoverContent>
        </Popover>

        {hasAnyFilter && (
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

      {loading && <LoadingPanel rows={5} />}
      {error && <ErrorPanel message={error} retry={load} />}
      {!loading &&
        !error &&
        (filteredItems.length ? (
          <section className="table-card">
            <div className="table-scroll">
              <table>
                <thead>
                  <tr>
                    <th scope="col">Comprobante</th>
                    <th scope="col">Fecha y hora</th>
                    <th scope="col">Artículos</th>
                    <th scope="col">Cliente</th>
                    <th scope="col">Estado</th>
                    <th scope="col">Total</th>
                    <th scope="col" aria-label="Acciones" />
                  </tr>
                </thead>
                <tbody>
                  {filteredItems.map(item => (
                    <tr
                      key={item.id}
                      className="clickable-sale-row"
                      tabIndex={0}
                      role="button"
                      aria-label={`Ver comprobante ${item.receiptNumber}`}
                      onClick={() => setLocation(`/sales/${item.id}/ticket`)}
                      onKeyDown={e => {
                        if (e.key === "Enter" || e.key === " ") {
                          e.preventDefault();
                          setLocation(`/sales/${item.id}/ticket`);
                        }
                      }}
                    >
                      <td>
                        <div className="receipt-number">
                          <ReceiptText size={17} />
                          <b>{item.receiptNumber}</b>
                        </div>
                      </td>
                      <td>{datetime(item.createdAt)}</td>
                      <td>
                        {item.itemCount} producto
                        {item.itemCount === 1 ? "" : "s"}
                      </td>
                      <td>{item.customerName ?? <small>Mostrador</small>}</td>
                      <td>
                        <span className="status-confirmed">Confirmada</span>
                      </td>
                      <td className="mono strong">{money(item.totalCents)}</td>
                      <td onClick={e => e.stopPropagation()}>
                        <button
                          type="button"
                          className="sales-ticket-btn"
                          onClick={() =>
                            setLocation(`/sales/${item.id}/ticket`)
                          }
                          aria-label={`Ver comprobante ${item.receiptNumber}`}
                        >
                          <Eye size={14} />
                          Ver ticket
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>
        ) : (
          <EmptyState
            title="No hay ventas con estos filtros"
            detail="Probá ampliar el período, cambiar el depósito o ajustar el importe."
            action={
              <button className="button-secondary" onClick={clearFilters}>
                Limpiar filtros
              </button>
            }
          />
        ))}

      {isNewSaleOpen && (
        <NewSaleModal
          isOpen={isNewSaleOpen}
          onClose={() => setIsNewSaleOpen(false)}
          onSuccess={createdSale => {
            setIsNewSaleOpen(false);
            load();
            if (createdSale?.id) {
              toast.success(
                `Comprobante ${createdSale.receiptNumber} emitido (${money(createdSale.totalCents)})`,
                {
                  action: {
                    label: "Ver ticket",
                    onClick: () => setLocation(`/sales/${createdSale.id}/ticket`),
                  },
                }
              );
            }
          }}
        />
      )}
    </>
  );
}
