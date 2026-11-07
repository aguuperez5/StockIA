import { useMemo, useState } from "react";
import { ArrowUpDown, Filter, PackageSearch, Search, X } from "lucide-react";
import { StockBadge } from "@/components/StockUI";
import { ModernSelect } from "@/components/ModernSelect";
import { warehouseService } from "@/services/inventory";

const DEFAULT_CATEGORIES = [
  "Almacén",
  "Bebidas",
  "Ferretería",
  "Hogar",
  "Limpieza",
  "Válvulas",
];

export interface WarehouseDetailModalProps {
  detail: Awaited<ReturnType<typeof warehouseService.summary>>;
  categories: string[];
  onClose: () => void;
}

export function WarehouseDetailModal({
  detail,
  categories,
  onClose,
}: WarehouseDetailModalProps) {
  const [detailTab, setDetailTab] = useState<"products" | "sales">("products");
  const [modalSearch, setModalSearch] = useState("");
  const [modalCategory, setModalCategory] = useState("Todas");
  const [modalStockFilter, setModalStockFilter] = useState("all");
  const [modalSort, setModalSort] = useState("name_asc");

  const modalCategories = useMemo(() => {
    const set = new Set<string>(DEFAULT_CATEGORIES);
    categories.forEach(c => {
      if (c && c !== "Todas") set.add(c);
    });
    if (detail?.stock) {
      detail.stock.forEach(item => {
        const cat = item.category?.trim();
        if (cat) set.add(cat);
      });
    }
    const sorted = Array.from(set).sort((a, b) =>
      a.localeCompare(b, "es", { sensitivity: "base" })
    );
    return [
      { value: "Todas", label: "Todas las categorías" },
      ...sorted.map(cat => ({ value: cat, label: cat })),
    ];
  }, [detail?.stock, categories]);

  const stockStatusOptions = [
    { value: "all", label: "Todo el stock" },
    { value: "available", label: "Disponible (> mín.)" },
    { value: "low", label: "Stock bajo / Crítico" },
    { value: "out", label: "Sin existencias (0 u.)" },
  ];

  const sortOptions = [
    { value: "name_asc", label: "Nombre (A - Z)" },
    { value: "name_desc", label: "Nombre (Z - A)" },
    { value: "stock_desc", label: "Mayor cantidad" },
    { value: "stock_asc", label: "Menor cantidad" },
    { value: "price_desc", label: "Mayor precio" },
    { value: "price_asc", label: "Menor precio" },
  ];

  const filteredModalStock = useMemo(() => {
    if (!detail?.stock) return [];
    const list = detail.stock.filter(item => {
      if (modalSearch.trim()) {
        const query = modalSearch.trim().toLowerCase();
        const matchesName = item.productName.toLowerCase().includes(query);
        const matchesSku = item.sku.toLowerCase().includes(query);
        const matchesCat = (item.category || "").toLowerCase().includes(query);
        if (!matchesName && !matchesSku && !matchesCat) return false;
      }
      if (modalCategory !== "Todas") {
        const cat = item.category?.trim() || "General";
        if (cat.toLowerCase() !== modalCategory.toLowerCase()) return false;
      }
      const threshold = item.threshold ?? 5;
      if (modalStockFilter === "available" && item.quantity <= threshold) {
        return false;
      }
      if (
        modalStockFilter === "low" &&
        !(item.quantity > 0 && item.quantity <= threshold)
      ) {
        return false;
      }
      if (modalStockFilter === "out" && item.quantity > 0) {
        return false;
      }
      return true;
    });

    list.sort((a, b) => {
      switch (modalSort) {
        case "name_desc":
          return b.productName.localeCompare(a.productName, "es", {
            sensitivity: "base",
          });
        case "stock_desc":
          return b.quantity - a.quantity;
        case "stock_asc":
          return a.quantity - b.quantity;
        case "price_desc":
          return b.priceCents - a.priceCents;
        case "price_asc":
          return a.priceCents - b.priceCents;
        case "name_asc":
        default:
          return a.productName.localeCompare(b.productName, "es", {
            sensitivity: "base",
          });
      }
    });

    return list;
  }, [
    detail?.stock,
    modalSearch,
    modalCategory,
    modalStockFilter,
    modalSort,
  ]);

  return (
    <div
      className="modal-backdrop warehouse-detail-backdrop"
      onClick={onClose}
    >
      <section
        className="warehouse-detail-screen warehouse-detail-modal"
        role="dialog"
        aria-modal="true"
        aria-labelledby="warehouse-detail-title"
        onClick={event => event.stopPropagation()}
      >
        <div className="warehouse-detail-header">
          <div>
            <span className="eyebrow">Detalle del depósito</span>
            <h2 id="warehouse-detail-title">{detail.deposit.name}</h2>
            <p>
              {detail.deposit.address} · Responsable:{" "}
              {detail.deposit.manager}
            </p>
          </div>
          <button
            className="modal-close"
            type="button"
            onClick={onClose}
            aria-label="Cerrar detalle"
          >
            ×
          </button>
        </div>

        <div className="metric-grid warehouse-detail-metrics">
          <div className="metric-card">
            <div>
              <p>Unidades en stock</p>
              <h2>
                {detail.stock.reduce(
                  (total, item) => total + item.quantity,
                  0
                )}
              </h2>
            </div>
          </div>
          <div className="metric-card">
            <div>
              <p>Productos almacenados</p>
              <h2>
                {detail.stock.filter(item => item.quantity > 0).length}
              </h2>
            </div>
          </div>
          <div className="metric-card">
            <div>
              <p>Ventas registradas</p>
              <h2>{detail.sales.length}</h2>
            </div>
          </div>
          <div className="metric-card">
            <div>
              <p>Total vendido</p>
              <h2>
                {new Intl.NumberFormat("es-AR", {
                  style: "currency",
                  currency: "ARS",
                  maximumFractionDigits: 0,
                }).format(
                  detail.sales.reduce(
                    (total, sale) => total + sale.totalCents,
                    0
                  ) / 100
                )}
              </h2>
            </div>
          </div>
        </div>

        <div className="warehouse-detail-tabs">
          <button
            type="button"
            className={`warehouse-tab-btn ${detailTab === "products" ? "active" : ""}`}
            onClick={() => setDetailTab("products")}
          >
            Productos en este depósito ({detail.stock.length})
          </button>
          <button
            type="button"
            className={`warehouse-tab-btn ${detailTab === "sales" ? "active" : ""}`}
            onClick={() => setDetailTab("sales")}
          >
            Historial de ventas ({detail.sales.length})
          </button>
        </div>

        {detailTab === "products" ? (
          <section className="table-card warehouse-full-table">
            <div className="table-card-heading">
              <div>
                <h3>Productos en {detail.deposit.name}</h3>
                <span>
                  {filteredModalStock.length} de {detail.stock.length} artículo
                  {detail.stock.length === 1 ? "" : "s"}
                </span>
              </div>
            </div>

            <div className="warehouse-detail-filter-bar">
              <label className="search-control">
                <Search size={14} />
                <input
                  value={modalSearch}
                  onChange={e => setModalSearch(e.target.value)}
                  placeholder="Buscar producto o SKU..."
                  aria-label="Buscar producto en depósito"
                />
              </label>

              <ModernSelect
                value={modalCategory}
                onChange={setModalCategory}
                options={modalCategories}
                labelPrefix="Categoría:"
                icon={<Filter size={14} />}
                ariaLabel="Filtrar por categoría"
              />

              <ModernSelect
                value={modalStockFilter}
                onChange={setModalStockFilter}
                options={stockStatusOptions}
                labelPrefix="Estado:"
                icon={<PackageSearch size={14} />}
                ariaLabel="Filtrar por estado de stock"
              />

              <ModernSelect
                value={modalSort}
                onChange={setModalSort}
                options={sortOptions}
                labelPrefix="Ordenar:"
                icon={<ArrowUpDown size={14} />}
                ariaLabel="Ordenar productos"
              />

              {(modalSearch ||
                modalCategory !== "Todas" ||
                modalStockFilter !== "all" ||
                modalSort !== "name_asc") && (
                <button
                  type="button"
                  className="button-secondary filter-clear"
                  onClick={() => {
                    setModalSearch("");
                    setModalCategory("Todas");
                    setModalStockFilter("all");
                    setModalSort("name_asc");
                  }}
                  title="Limpiar filtros"
                >
                  <X size={14} /> Limpiar
                </button>
              )}
            </div>

            <div className="table-scroll">
              <table>
                <thead>
                  <tr>
                    <th scope="col">Producto</th>
                    <th scope="col">SKU</th>
                    <th scope="col">Categoría</th>
                    <th scope="col">Unidades</th>
                    <th scope="col">Precio venta</th>
                    <th scope="col">Estado</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredModalStock.length ? (
                    filteredModalStock.map(item => (
                      <tr key={item.productId}>
                        <td>
                          <div className="product-cell">
                            {item.imageUrl ? (
                              <img
                                src={item.imageUrl}
                                alt={item.productName}
                                className="product-thumb"
                                loading="lazy"
                                referrerPolicy="no-referrer"
                                onError={e => {
                                  const target = e.target as HTMLImageElement;
                                  target.style.display = "none";
                                  const parent = target.parentElement;
                                  if (parent && !parent.querySelector(".product-glyph")) {
                                    const fallback = document.createElement("span");
                                    fallback.className = "product-glyph";
                                    fallback.textContent = (item.productName || "?").slice(0, 1).toUpperCase();
                                    parent.insertBefore(fallback, target);
                                  }
                                }}
                              />
                            ) : (
                              <span className="product-glyph">
                                {(item.productName || "?").slice(0, 1).toUpperCase()}
                              </span>
                            )}
                            <div>
                              <b>{item.productName}</b>
                            </div>
                          </div>
                        </td>
                        <td>{item.sku}</td>
                        <td>{item.category || "General"}</td>
                        <td>
                          <b>{item.quantity}</b> un.
                        </td>
                        <td>
                          {new Intl.NumberFormat("es-AR", {
                            style: "currency",
                            currency: "ARS",
                            maximumFractionDigits: 0,
                          }).format(item.priceCents / 100)}
                        </td>
                        <td>
                          <StockBadge
                            quantity={item.quantity}
                            threshold={item.threshold}
                          />
                        </td>
                      </tr>
                    ))
                  ) : (
                    <tr>
                      <td
                        colSpan={6}
                        style={{
                          textAlign: "center",
                          padding: "28px",
                          color: "var(--muted-ink)",
                        }}
                      >
                        {detail.stock.length
                          ? "No se encontraron productos que coincidan con la búsqueda o filtros."
                          : "No hay productos en este depósito."}
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </section>
        ) : (
          <section className="table-card warehouse-full-table">
            <div className="table-card-heading">
              <h3>Ventas despachadas desde {detail.deposit.name}</h3>
              <span>{detail.sales.length} comprobantes registrados</span>
            </div>
            <div className="table-scroll">
              <table>
                <thead>
                  <tr>
                    <th scope="col">Fecha</th>
                    <th scope="col">Cliente</th>
                    <th scope="col">Unidades despachadas</th>
                    <th scope="col">Total de la venta</th>
                  </tr>
                </thead>
                <tbody>
                  {detail.sales.length ? (
                    detail.sales.map(sale => (
                      <tr key={sale.id}>
                        <td>
                          {new Intl.DateTimeFormat("es-AR", {
                            dateStyle: "short",
                            timeStyle: "short",
                          }).format(new Date(sale.createdAt))}
                        </td>
                        <td>
                          <b>{sale.customerName}</b>
                        </td>
                        <td>{sale.itemCount} un.</td>
                        <td>
                          <b>
                            {new Intl.NumberFormat("es-AR", {
                              style: "currency",
                              currency: "ARS",
                              maximumFractionDigits: 0,
                            }).format(sale.totalCents / 100)}
                          </b>
                        </td>
                      </tr>
                    ))
                  ) : (
                    <tr>
                      <td
                        colSpan={4}
                        style={{
                          textAlign: "center",
                          padding: "28px",
                          color: "var(--muted-ink)",
                        }}
                      >
                        No se registran ventas desde este depósito.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </section>
        )}
      </section>
    </div>
  );
}
