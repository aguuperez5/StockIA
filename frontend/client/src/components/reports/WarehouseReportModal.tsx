import { useEffect, useMemo, useState } from "react";
import {
  AlertTriangle,
  Award,
  Boxes,
  Calendar,
  CheckCircle2,
  DollarSign,
  Download,
  Package,
  Search,
  ShoppingBag,
  Store,
  TrendingUp,
  User,
  X,
} from "lucide-react";
import { day, money } from "@/components/StockUI";
import { warehouseService } from "@/services/inventory";

export interface WarehouseBreakdownItem {
  id: number;
  name: string;
  count: number;
  totalCents: number;
  percentage: number;
}

export interface WarehouseReportModalProps {
  warehouse: WarehouseBreakdownItem;
  from?: string;
  to?: string;
  totalCompanySalesCents?: number;
  onClose: () => void;
}

type SummaryData = Awaited<ReturnType<typeof warehouseService.summary>>;

export function WarehouseReportModal({
  warehouse,
  from = "",
  to = "",
  onClose,
}: WarehouseReportModalProps) {
  const [summary, setSummary] = useState<SummaryData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [activeTab, setActiveTab] = useState<"overview" | "inventory" | "sales">("overview");

  // Filtros de inventario
  const [inventorySearch, setInventorySearch] = useState("");
  const [inventoryFilter, setInventoryFilter] = useState<"all" | "low" | "inStock">("all");

  useEffect(() => {
    let isMounted = true;
    setLoading(true);
    setError("");

    warehouseService
      .summary(warehouse.id, from, to)
      .then(res => {
        if (isMounted) {
          setSummary(res);
          setLoading(false);
        }
      })
      .catch(err => {
        if (isMounted) {
          setError(err instanceof Error ? err.message : String(err));
          setLoading(false);
        }
      });

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => {
      isMounted = false;
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [warehouse.id, from, to, onClose]);

  // Ventas del período (ya filtradas exactamente por el backend en PostgreSQL)
  const periodSales = useMemo(() => {
    return summary?.sales || [];
  }, [summary?.sales]);

  // Estadísticas de stock del depósito
  const stockStats = useMemo(() => {
    if (!summary?.stock) {
      return {
        totalUnits: 0,
        totalValuationCents: 0,
        lowStockItems: [],
        positiveItemsCount: 0,
      };
    }

    let totalUnits = 0;
    let totalValuationCents = 0;
    const lowStockItems: typeof summary.stock = [];
    let positiveItemsCount = 0;

    for (const item of summary.stock) {
      totalUnits += item.quantity;
      totalValuationCents += item.quantity * item.priceCents;
      if (item.quantity > 0) positiveItemsCount++;
      if (item.quantity <= item.threshold) {
        lowStockItems.push(item);
      }
    }

    return {
      totalUnits,
      totalValuationCents,
      lowStockItems,
      positiveItemsCount,
    };
  }, [summary?.stock]);

  // Top productos vendidos en este depósito (si las ventas traen detalle o por items)
  const topDepositProducts = useMemo(() => {
    if (!periodSales.length) return [];
    const map = new Map<
      number,
      { productId: number; productName: string; sku: string; units: number; revenueCents: number }
    >();

    periodSales.forEach(sale => {
      if (sale.items && sale.items.length > 0) {
        sale.items.forEach(item => {
          const cur = map.get(item.productId) || {
            productId: item.productId,
            productName: item.productName,
            sku: item.sku,
            units: 0,
            revenueCents: 0,
          };
          cur.units += item.quantity;
          cur.revenueCents += item.quantity * item.priceCents;
          map.set(item.productId, cur);
        });
      }
    });

    return Array.from(map.values()).sort((a, b) => b.revenueCents - a.revenueCents).slice(0, 8);
  }, [periodSales]);

  // Inventario filtrado
  const filteredStock = useMemo(() => {
    if (!summary?.stock) return [];
    return summary.stock.filter(item => {
      if (inventoryFilter === "low" && item.quantity > item.threshold) return false;
      if (inventoryFilter === "inStock" && item.quantity <= 0) return false;
      if (inventorySearch.trim()) {
        const q = inventorySearch.toLowerCase();
        const matchesName = item.productName.toLowerCase().includes(q);
        const matchesSku = item.sku.toLowerCase().includes(q);
        const matchesCategory = item.category.toLowerCase().includes(q);
        if (!matchesName && !matchesSku && !matchesCategory) return false;
      }
      return true;
    });
  }, [summary?.stock, inventoryFilter, inventorySearch]);

  const avgTicket =
    warehouse.count > 0 ? Math.round(warehouse.totalCents / warehouse.count) : 0;

  // Exportar CSV del reporte individual del depósito
  const exportWarehouseCsv = () => {
    const rows: string[][] = [
      [`REPORTE DE RENDIMIENTO LOGÍSTICO: ${warehouse.name.toUpperCase()}`],
      ["Período", `${from || "Histórico"} hasta ${to || "Hoy"}`],
      [
        "Ubicación",
        summary?.deposit.address || summary?.deposit.type || "No especificada",
      ],
      ["Responsable", summary?.deposit.manager || "Sin asignar"],
      [],
      ["--- RESUMEN EJECUTIVO DEL PERÍODO ---"],
      ["Facturación total ($)", String(warehouse.totalCents / 100)],
      ["Comprobantes cobrados", String(warehouse.count)],
      ["Ticket promedio ($)", String(avgTicket / 100)],
      ["Aporte a la facturación global", `${warehouse.percentage}%`],
      ["Unidades físicas en stock", String(stockStats.totalUnits)],
      ["Valuación total del inventario ($)", String(stockStats.totalValuationCents / 100)],
      ["Artículos bajo stock mínimo", String(stockStats.lowStockItems.length)],
      [],
      ["--- INVENTARIO ACTUAL EN ESTE DEPÓSITO ---"],
      [
        "Producto",
        "SKU",
        "Categoría",
        "Stock disponible",
        "Mínimo sugerido",
        "Precio unitario ($)",
        "Valuación total ($)",
        "Estado",
      ],
      ...(summary?.stock.map(item => [
        item.productName,
        item.sku,
        item.category,
        String(item.quantity),
        String(item.threshold),
        String(item.priceCents / 100),
        String((item.quantity * item.priceCents) / 100),
        item.quantity <= item.threshold ? "BAJO STOCK" : "NORMAL",
      ]) ?? []),
      [],
      ["--- COMPROBANTES DE VENTA EN EL PERÍODO ---"],
      ["ID Venta", "Fecha", "Cliente", "Artículos", "Total ($)"],
      ...(periodSales.map(sale => [
        `#${sale.id}`,
        day(sale.createdAt),
        sale.customerName,
        String(sale.itemCount),
        String(sale.totalCents / 100),
      ]) ?? []),
    ];

    const csvCell = (val: string) => {
      const safe = /^[\t\r ]*[=+\-@]/.test(val) ? `'${val}` : val;
      return `"${safe.replace(/"/g, '""')}"`;
    };
    const csvContent = rows.map(r => r.map(csvCell).join(",")).join("\n");
    const blob = new Blob(["\uFEFF", csvContent], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `reporte-deposito-${warehouse.name.toLowerCase().replace(/\s+/g, "_")}.csv`;
    link.click();
    window.setTimeout(() => URL.revokeObjectURL(url), 1000);
  };

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div
        className="modal-card warehouse-report-modal"
        role="dialog"
        aria-modal="true"
        aria-labelledby="warehouse-modal-title"
        onClick={e => e.stopPropagation()}
      >
        {/* Encabezado del Modal */}
        <header className="modal-header warehouse-modal-header">
          <div className="warehouse-title-group">
            <span className="warehouse-icon-badge">
              <Store size={22} />
            </span>
            <div>
              <div className="warehouse-eyebrow">
                <span>Reporte de Desempeño Logístico</span>
                <span className="share-pill">{warehouse.percentage}% de ventas totales</span>
              </div>
              <h2 id="warehouse-modal-title">{warehouse.name}</h2>
              <div className="warehouse-meta-tags">
                {summary?.deposit.address && (
                  <span>
                    <b>Ubicación:</b> {summary.deposit.address}
                  </span>
                )}
                {summary?.deposit.manager && (
                  <span>
                    <User size={12} /> {summary.deposit.manager}
                  </span>
                )}
                <span>
                  <Calendar size={12} /> {from || "Histórico"} a {to || "Hoy"}
                </span>
              </div>
            </div>
          </div>

          <div className="warehouse-modal-actions">
            <button
              type="button"
              className="button-secondary button-sm"
              onClick={exportWarehouseCsv}
              title="Descargar CSV del depósito"
            >
              <Download size={14} /> Exportar CSV
            </button>
            <button
              type="button"
              className="modal-close-btn"
              onClick={onClose}
              aria-label="Cerrar reporte"
            >
              <X size={18} />
            </button>
          </div>
        </header>

        {/* KPIs Principales del Depósito */}
        <section className="metric-grid warehouse-kpi-grid">
          <article className="metric-card">
            <span className="metric-icon-bubble">
              <DollarSign size={18} />
            </span>
            <div>
              <p>Facturación período</p>
              <h2>{money(warehouse.totalCents)}</h2>
              <small>
                {warehouse.count} venta{warehouse.count === 1 ? "" : "s"} registrada
                {warehouse.count === 1 ? "" : "s"}
              </small>
            </div>
          </article>

          <article className="metric-card">
            <span className="metric-icon-bubble">
              <ShoppingBag size={18} />
            </span>
            <div>
              <p>Ticket promedio</p>
              <h2>{money(avgTicket)}</h2>
              <small>Gasto medio en esta sucursal</small>
            </div>
          </article>

          <article className="metric-card">
            <span className="metric-icon-bubble">
              <Boxes size={18} />
            </span>
            <div>
              <p>Existencias en depósito</p>
              <h2>
                {stockStats.totalUnits.toLocaleString("es-AR")} <small>un.</small>
              </h2>
              <small>{stockStats.positiveItemsCount} productos con stock activo</small>
            </div>
          </article>

          <article className="metric-card">
            <span className="metric-icon-bubble">
              <TrendingUp size={18} />
            </span>
            <div>
              <p>Valuación de inventario</p>
              <h2>{money(stockStats.totalValuationCents)}</h2>
              <small>A precio de lista actual</small>
            </div>
          </article>
        </section>

        {/* Pestañas de Navegación del Depósito */}
        <nav className="warehouse-modal-tabs">
          <button
            type="button"
            className={`wtab ${activeTab === "overview" ? "active" : ""}`}
            onClick={() => setActiveTab("overview")}
          >
            <TrendingUp size={14} /> Resumen y desempeño
          </button>
          <button
            type="button"
            className={`wtab ${activeTab === "inventory" ? "active" : ""}`}
            onClick={() => setActiveTab("inventory")}
          >
            <Boxes size={14} /> Inventario en depósito
            {stockStats.lowStockItems.length > 0 && (
              <span className="tab-alert-pill" title="Artículos bajo stock mínimo">
                {stockStats.lowStockItems.length}
              </span>
            )}
          </button>
          <button
            type="button"
            className={`wtab ${activeTab === "sales" ? "active" : ""}`}
            onClick={() => setActiveTab("sales")}
          >
            <ShoppingBag size={14} /> Comprobantes del período ({periodSales.length})
          </button>
        </nav>

        {/* Contenido del Modal según pestaña */}
        <div className="warehouse-modal-body">
          {loading && (
            <div className="warehouse-modal-loading">
              <div className="spinner" />
              <span>Cargando detalle del depósito...</span>
            </div>
          )}

          {error && (
            <div className="error-panel" style={{ margin: "16px 0" }}>
              <AlertTriangle size={18} />
              <span>{error}</span>
            </div>
          )}

          {!loading && !error && (
            <>
              {/* VISTA 1: RESUMEN Y TOP PRODUCTOS */}
              {activeTab === "overview" && (
                <div className="wmodal-overview-grid">
                  {/* 1. Top productos vendidos en este depósito (Rotación comercial primero) */}
                  <div className="wmodal-subcard">
                    <div className="wmodal-subcard-header">
                      <div className="card-tag success">
                        <Award size={13} />
                        <span>Rotación comercial</span>
                      </div>
                      <h4>Productos con mayor recaudación</h4>
                    </div>

                    {topDepositProducts.length > 0 ? (
                      <div className="table-scroll">
                        <table>
                          <thead>
                            <tr>
                              <th scope="col" style={{ width: "32px" }}>
                                #
                              </th>
                              <th scope="col">Producto</th>
                              <th scope="col">Unidades</th>
                              <th scope="col">Facturación</th>
                            </tr>
                          </thead>
                          <tbody>
                            {topDepositProducts.map((p, idx) => (
                              <tr key={p.productId}>
                                <td>
                                  <span className={`rank-pill rank-${idx + 1}`}>{idx + 1}</span>
                                </td>
                                <td>
                                  <b>{p.productName}</b>
                                  {p.sku && <small>{p.sku}</small>}
                                </td>
                                <td>{p.units.toLocaleString("es-AR")} un.</td>
                                <td>
                                  <b>{money(p.revenueCents)}</b>
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    ) : periodSales.length > 0 ? (
                      <div className="empty-subcard-notice">
                        <CheckCircle2 size={18} color="var(--brand)" />
                        <span>
                          Se registraron {periodSales.length} ventas en el período por un total de{" "}
                          <b>{money(warehouse.totalCents)}</b>.
                        </span>
                      </div>
                    ) : (
                      <div className="empty-subcard-notice">
                        <Package size={18} />
                        <span>No se registraron ventas en este depósito durante el período.</span>
                      </div>
                    )}
                  </div>

                  {/* 2. Alertas y monitoreo de stock en este depósito (debajo) */}
                  <div className="wmodal-subcard">
                    <div className="wmodal-subcard-header">
                      <div className="card-tag alert">
                        <AlertTriangle size={13} />
                        <span>Monitoreo de stock</span>
                      </div>
                      <h4>Salud del inventario en {warehouse.name}</h4>
                    </div>

                    {stockStats.lowStockItems.length > 0 ? (
                      <div className="low-stock-alert-box">
                        <div className="alert-message-header">
                          <AlertTriangle size={16} color="var(--status-warn)" />
                          <span>
                            Hay <b>{stockStats.lowStockItems.length} productos</b> en este
                            depósito por debajo o en su nivel de stock mínimo.
                          </span>
                        </div>
                        <ul className="low-stock-items-preview">
                          {stockStats.lowStockItems.slice(0, 4).map(item => (
                            <li key={item.productId}>
                              <span>{item.productName}</span>
                              <b>
                                {item.quantity} / {item.threshold} un.
                              </b>
                            </li>
                          ))}
                        </ul>
                        <button
                          type="button"
                          className="button-link text-xs"
                          onClick={() => {
                            setActiveTab("inventory");
                            setInventoryFilter("low");
                          }}
                        >
                          Ver todos los faltantes en inventario →
                        </button>
                      </div>
                    ) : (
                      <div className="ok-stock-box">
                        <CheckCircle2 size={20} color="var(--status-ok)" />
                        <div>
                          <b>Inventario en niveles óptimos</b>
                          <p>
                            Ningún artículo en este depósito se encuentra por debajo de su umbral de
                            alerta.
                          </p>
                        </div>
                      </div>
                    )}

                    <div className="warehouse-info-strip">
                      <div className="info-strip-item">
                        <span className="strip-label">Tipo de depósito:</span>
                        <span className="strip-value">{summary?.deposit.type || "Principal"}</span>
                      </div>
                      {summary?.deposit.capacity ? (
                        <div className="info-strip-item">
                          <span className="strip-label">Capacidad máxima:</span>
                          <span className="strip-value">{summary.deposit.capacity} un.</span>
                        </div>
                      ) : null}
                      <div className="info-strip-item">
                        <span className="strip-label">Artículos diferentes:</span>
                        <span className="strip-value">{summary?.stock.length ?? 0} SKUs</span>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* VISTA 2: INVENTARIO COMPLETO EN EL DEPÓSITO */}
              {activeTab === "inventory" && (
                <div className="wmodal-inventory-tab">
                  <div className="inventory-filters-bar">
                    <div className="search-field">
                      <Search size={14} className="search-icon" />
                      <input
                        type="text"
                        placeholder="Buscar producto por nombre o SKU..."
                        value={inventorySearch}
                        onChange={e => setInventorySearch(e.target.value)}
                      />
                      {inventorySearch && (
                        <button
                          type="button"
                          className="search-clear"
                          onClick={() => setInventorySearch("")}
                        >
                          <X size={12} />
                        </button>
                      )}
                    </div>

                    <div className="filter-pills-group">
                      <button
                        type="button"
                        className={`filter-pill ${inventoryFilter === "all" ? "active" : ""}`}
                        onClick={() => setInventoryFilter("all")}
                      >
                        Todos ({summary?.stock.length ?? 0})
                      </button>
                      <button
                        type="button"
                        className={`filter-pill ${inventoryFilter === "low" ? "active" : ""}`}
                        onClick={() => setInventoryFilter("low")}
                      >
                        Stock bajo ({stockStats.lowStockItems.length})
                      </button>
                      <button
                        type="button"
                        className={`filter-pill ${inventoryFilter === "inStock" ? "active" : ""}`}
                        onClick={() => setInventoryFilter("inStock")}
                      >
                        Con existencias ({stockStats.positiveItemsCount})
                      </button>
                    </div>
                  </div>

                  <div className="table-scroll wmodal-table-scroll">
                    <table>
                      <thead>
                        <tr>
                          <th scope="col">Producto / SKU</th>
                          <th scope="col">Categoría</th>
                          <th scope="col">Stock en depósito</th>
                          <th scope="col">Mínimo</th>
                          <th scope="col">Precio unitario</th>
                          <th scope="col">Valuación</th>
                          <th scope="col">Estado</th>
                        </tr>
                      </thead>
                      <tbody>
                        {filteredStock.length > 0 ? (
                          filteredStock.map(item => {
                            const isLow = item.quantity <= item.threshold;
                            const isZero = item.quantity === 0;
                            return (
                              <tr key={item.productId}>
                                <td>
                                  <b>{item.productName}</b>
                                  <small>{item.sku}</small>
                                </td>
                                <td>
                                  <span className="category-pill">
                                    {item.category || "General"}
                                  </span>
                                </td>
                                <td>
                                  <b
                                    style={{
                                      color: isZero
                                        ? "var(--status-critical-text)"
                                        : isLow
                                        ? "var(--status-warn-text)"
                                        : "inherit",
                                    }}
                                  >
                                    {item.quantity} un.
                                  </b>
                                </td>
                                <td>{item.threshold} un.</td>
                                <td>{money(item.priceCents)}</td>
                                <td>
                                  <b>{money(item.quantity * item.priceCents)}</b>
                                </td>
                                <td>
                                  {isZero ? (
                                    <span className="priority-pill pill-critical">SIN STOCK</span>
                                  ) : isLow ? (
                                    <span className="priority-pill pill-high">STOCK BAJO</span>
                                  ) : (
                                    <span className="priority-pill pill-ok">NORMAL</span>
                                  )}
                                </td>
                              </tr>
                            );
                          })
                        ) : (
                          <tr>
                            <td colSpan={7} className="empty-table-cell">
                              <span>No se encontraron artículos con los filtros aplicados.</span>
                            </td>
                          </tr>
                        )}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}

              {/* VISTA 3: COMPROBANTES DE VENTA DEL PERÍODO */}
              {activeTab === "sales" && (
                <div className="wmodal-sales-tab">
                  <div className="table-scroll wmodal-table-scroll">
                    <table>
                      <thead>
                        <tr>
                          <th scope="col">Comprobante</th>
                          <th scope="col">Fecha y hora</th>
                          <th scope="col">Cliente</th>
                          <th scope="col">Unidades vendidas</th>
                          <th scope="col">Monto total</th>
                        </tr>
                      </thead>
                      <tbody>
                        {periodSales.length > 0 ? (
                          periodSales.map(sale => (
                            <tr key={sale.id}>
                              <td>
                                <b>#{sale.id}</b>
                              </td>
                              <td>{day(sale.createdAt)}</td>
                              <td>{sale.customerName}</td>
                              <td>
                                <b>{sale.itemCount}</b> un.
                              </td>
                              <td>
                                <b className="highlight-number">{money(sale.totalCents)}</b>
                              </td>
                            </tr>
                          ))
                        ) : (
                          <tr>
                            <td colSpan={5} className="empty-table-cell">
                              <span>
                                No hay comprobantes de venta registrados en este depósito para el
                                período seleccionado.
                              </span>
                            </td>
                          </tr>
                        )}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}
            </>
          )}
        </div>

        {/* Pie del modal */}
        <footer className="modal-footer warehouse-modal-footer">
          <span className="footer-legend">
            Depósito ID: #{warehouse.id} · Aporte a facturación global: {warehouse.percentage}%
          </span>
          <button type="button" className="button-secondary" onClick={onClose}>
            Cerrar reporte
          </button>
        </footer>
      </div>
    </div>
  );
}
