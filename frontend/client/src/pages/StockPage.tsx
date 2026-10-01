import {
  ArrowLeftRight,
  Check,
  Edit3,
  Filter,
  PackageSearch,
  Plus,
  Search,
  Trash2,
  Warehouse as WarehouseIcon,
  X,
} from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import {
  EmptyState,
  ErrorPanel,
  LoadingPanel,
  PageHeader,
  StockBadge,
} from "@/components/StockUI";
import { ModernSelect } from "@/components/ModernSelect";
import { WarehouseCard } from "@/components/stock/WarehouseCard";
import {
  inventoryService,
  type InventoryItem,
  type Warehouse,
  warehouseService,
} from "@/services/inventory";
import { transferService } from "@/services/backlog";
import { useStockAuth } from "@/contexts/StockAuthContext";

const initialWarehouse = {
  name: "",
  type: "Principal" as Warehouse["type"],
  address: "",
  manager: "",
  capacity: 0,
};

export default function StockPage() {
  const { user } = useStockAuth();
  const canManage =
    user?.appRole === "administrador" || user?.appRole === "deposito";
  const [items, setItems] = useState<InventoryItem[]>([]);
  const [warehouses, setWarehouses] = useState<Warehouse[]>([]);
  const [warehouseId, setWarehouseId] = useState("");
  const [selected, setSelected] = useState<InventoryItem | null>(null);
  const [quantity, setQuantity] = useState("");
  const [note, setNote] = useState("");
  const [moving, setMoving] = useState<InventoryItem | null>(null);
  const [moveDest, setMoveDest] = useState("");
  const [moveQty, setMoveQty] = useState("1");
  const [warehouseForm, setWarehouseForm] = useState(initialWarehouse);
  const [editingWarehouse, setEditingWarehouse] = useState<number | null>(null);
  const [showWarehouseForm, setShowWarehouseForm] = useState(false);
  const [toDeleteWarehouse, setToDeleteWarehouse] = useState<Warehouse | null>(
    null
  );
  const [detail, setDetail] = useState<Awaited<
    ReturnType<typeof warehouseService.summary>
  > | null>(null);
  const [detailTab, setDetailTab] = useState<"products" | "sales">("products");
  const [productSearch, setProductSearch] = useState("");
  const [categoryFilter, setCategoryFilter] = useState("Todas");
  const [stockFilter, setStockFilter] = useState("all");
  const [minQuantity, setMinQuantity] = useState("");
  const [maxQuantity, setMaxQuantity] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);
  const [pending, setPending] = useState(false);

  const loadWarehouses = () =>
    warehouseService
      .list()
      .then(result => setWarehouses(result.items))
      .catch((reason: Error) => setError(reason.message));
  const load = () => {
    setLoading(true);
    setError("");
    Promise.all([
      inventoryService.list(warehouseId || undefined),
      warehouseService.list(),
    ])
      .then(([inventory, deposits]) => {
        setItems(inventory.items);
        setWarehouses(deposits.items);
      })
      .catch((reason: Error) => setError(reason.message))
      .finally(() => setLoading(false));
  };
  useEffect(() => {
    void load();
  }, [warehouseId]);

  const openAdjustment = (item: InventoryItem) => {
    setSelected(item);
    setQuantity(String(item.quantity));
    setNote("");
  };
  const save = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!selected) return;
    if (!Number.isInteger(Number(quantity)) || Number(quantity) < 0) {
      toast.error("La cantidad debe ser un número entero igual o mayor a cero.");
      return;
    }
    setPending(true);
    try {
      await inventoryService.update(
        selected.inventoryId,
        Number(quantity),
        note || "Ajuste manual desde StockIA"
      );
      setSelected(null);
      load();
      toast.success("Inventario actualizado correctamente.");
    } catch (reason) {
      toast.error((reason as Error).message);
    } finally {
      setPending(false);
    }
  };

  const openMove = (item: InventoryItem) => {
    setMoving(item);
    setMoveDest("");
    setMoveQty("1");
  };
  const submitMove = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!moving) return;
    const qty = Number(moveQty);
    if (!moveDest) {
      toast.error("Elegí el depósito de destino.");
      return;
    }
    if (!Number.isInteger(qty) || qty < 1 || qty > moving.quantity) {
      toast.error(`La cantidad debe estar entre 1 y ${moving.quantity}.`);
      return;
    }
    setPending(true);
    try {
      const result = await transferService.create({
        originWarehouseId: moving.warehouseId,
        destinationWarehouseId: Number(moveDest),
        items: [{ productId: moving.productId, quantity: qty }],
      });
      toast.success(
        `Remito ${result.transfer.receiptNumber}: stock movido y reflejado.`
      );
      setMoving(null);
      load();
    } catch (reason) {
      toast.error((reason as Error).message);
    } finally {
      setPending(false);
    }
  };

  const openWarehouse = async (warehouse: Warehouse) => {
    setWarehouseId(String(warehouse.id));
    try {
      setDetail(await warehouseService.summary(warehouse.id));
      setDetailTab("products");
    } catch (reason) {
      toast.error((reason as Error).message);
    }
  };

  const closeWarehouse = () => {
    setDetail(null);
  };

  const startCreate = () => {
    setWarehouseForm(initialWarehouse);
    setEditingWarehouse(null);
    setShowWarehouseForm(true);
  };

  const startEdit = (warehouse: Warehouse) => {
    setWarehouseForm({
      name: warehouse.name,
      type: warehouse.type,
      address: warehouse.address,
      manager: warehouse.manager,
      capacity: warehouse.capacity,
    });
    setEditingWarehouse(warehouse.id);
    setShowWarehouseForm(true);
  };

  const saveWarehouse = async (event: React.FormEvent) => {
    event.preventDefault();
    if (
      !warehouseForm.name.trim() ||
      !warehouseForm.address.trim() ||
      !warehouseForm.manager.trim() ||
      warehouseForm.capacity < 0
    ) {
      toast.error(
        "Completá nombre, dirección, responsable y una capacidad válida."
      );
      return;
    }
    setPending(true);
    try {
      if (editingWarehouse)
        await warehouseService.update(editingWarehouse, warehouseForm);
      else await warehouseService.create(warehouseForm);
      toast.success(
        editingWarehouse ? "Depósito actualizado." : "Depósito creado."
      );
      setShowWarehouseForm(false);
      await loadWarehouses();
      load();
    } catch (reason) {
      toast.error((reason as Error).message);
    } finally {
      setPending(false);
    }
  };

  const confirmRemoveWarehouse = async () => {
    if (!toDeleteWarehouse) return;
    setPending(true);
    try {
      await warehouseService.remove(toDeleteWarehouse.id);
      toast.success(
        `Depósito "${toDeleteWarehouse.name}" eliminado correctamente.`
      );
      if (warehouseId === String(toDeleteWarehouse.id)) setWarehouseId("");
      setToDeleteWarehouse(null);
      await loadWarehouses();
      load();
    } catch (reason) {
      const msg = (reason as Error).message;
      toast.error(msg);
    } finally {
      setPending(false);
    }
  };

  const selectedWarehouse = warehouses.find(
    warehouse => String(warehouse.id) === warehouseId
  );
  const categories = useMemo(
    () => [
      "Todas",
      ...Array.from(
        new Set(
          items
            .map(item => item.category?.trim())
            .filter((c): c is string => Boolean(c && c.length > 0))
        )
      ).sort((a, b) => a.localeCompare(b, "es", { sensitivity: "base" })),
    ],
    [items]
  );
  const filteredItems = useMemo(
    () =>
      items.filter(item => {
        const text =
          `${item.productName} ${item.sku} ${item.category} ${item.warehouseName}`.toLowerCase();
        const matchesText = text.includes(productSearch.trim().toLowerCase());
        const matchesCategory =
          categoryFilter === "Todas" || item.category === categoryFilter;
        const matchesStock =
          stockFilter === "all" ||
          (stockFilter === "out" && item.quantity === 0) ||
          (stockFilter === "low" &&
            item.quantity > 0 &&
            item.quantity <= item.lowStockThreshold) ||
          (stockFilter === "available" &&
            item.quantity > item.lowStockThreshold);
        const matchesMin =
          minQuantity === "" || item.quantity >= Number(minQuantity);
        const matchesMax =
          maxQuantity === "" || item.quantity <= Number(maxQuantity);
        return (
          matchesText &&
          matchesCategory &&
          matchesStock &&
          matchesMin &&
          matchesMax
        );
      }),
    [
      items,
      productSearch,
      categoryFilter,
      stockFilter,
      minQuantity,
      maxQuantity,
    ]
  );
  const clearStockFilters = () => {
    setProductSearch("");
    setCategoryFilter("Todas");
    setStockFilter("all");
    setMinQuantity("");
    setMaxQuantity("");
  };

  return (
    <div className="stock-reference-page">
      <PageHeader
        eyebrow="Inventario y Ubicaciones"
        title="Stock y depósitos"
        description="Elegí un depósito para consultar sus productos, capacidad y alertas, o gestioná las ubicaciones."
        action={
          canManage ? (
            <button className="button-primary" onClick={startCreate}>
              <Plus size={17} />
              Nuevo depósito
            </button>
          ) : undefined
        }
      />
      {error && <ErrorPanel message={error} retry={load} />}

      {/* Modal de Detalle de Depósito a Ancho Completo */}
      {detail && (
        <div
          className="modal-backdrop warehouse-detail-backdrop"
          onClick={closeWarehouse}
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
                onClick={closeWarehouse}
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
                  <h3>Productos en {detail.deposit.name}</h3>
                  <span>{detail.stock.length} artículos en lista</span>
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
                      {detail.stock.length ? (
                        detail.stock.map(item => (
                          <tr key={item.productId}>
                            <td>
                              <b>{item.productName}</b>
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
                            No hay productos en este depósito.
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
      )}

      {/* Formulario de Alta / Edición de Depósito */}
      {canManage && showWarehouseForm && (
        <form
          className="form-card compact-form"
          onSubmit={saveWarehouse}
          noValidate
        >
          <div className="form-section-title">
            <span>
              <WarehouseIcon size={18} />
            </span>
            <div>
              <h2>{editingWarehouse ? "Editar depósito" : "Nuevo depósito"}</h2>
              <p>
                Definí la capacidad máxima de unidades almacenadas y el
                responsable.
              </p>
            </div>
          </div>
          <div className="form-grid two">
            <label className="field">
              <span>Nombre</span>
              <input
                value={warehouseForm.name}
                onChange={event =>
                  setWarehouseForm({
                    ...warehouseForm,
                    name: event.target.value,
                  })
                }
                placeholder="Ej. Depósito Central"
              />
            </label>
            <label className="field">
              <span>Tipo</span>
              <ModernSelect
                value={warehouseForm.type}
                onChange={val =>
                  setWarehouseForm({
                    ...warehouseForm,
                    type: val as Warehouse["type"],
                  })
                }
                options={["Principal", "Sucursal", "Depósito externo"]}
                ariaLabel="Tipo de depósito"
                minWidth="100%"
                className="w-full"
              />
            </label>
            <label className="field">
              <span>Dirección</span>
              <input
                value={warehouseForm.address}
                onChange={event =>
                  setWarehouseForm({
                    ...warehouseForm,
                    address: event.target.value,
                  })
                }
                placeholder="Calle y número"
              />
            </label>
            <label className="field">
              <span>Responsable</span>
              <input
                value={warehouseForm.manager}
                onChange={event =>
                  setWarehouseForm({
                    ...warehouseForm,
                    manager: event.target.value,
                  })
                }
                placeholder="Nombre del encargado"
              />
            </label>
            <label className="field">
              <span>Capacidad (unidades)</span>
              <input
                type="number"
                min="0"
                value={warehouseForm.capacity}
                onChange={event =>
                  setWarehouseForm({
                    ...warehouseForm,
                    capacity: Number(event.target.value),
                  })
                }
              />
            </label>
          </div>
          <div className="form-actions">
            <button
              type="button"
              className="button-secondary"
              onClick={() => setShowWarehouseForm(false)}
            >
              Cancelar
            </button>
            <button className="button-primary" disabled={pending}>
              <Check size={16} />
              {editingWarehouse ? "Guardar cambios" : "Guardar depósito"}
            </button>
          </div>
        </form>
      )}

      {/* Modal de confirmación de eliminación de depósito */}
      {toDeleteWarehouse && (
        <div className="modal-backdrop">
          <div className="modal-card">
            <button
              className="modal-close"
              type="button"
              onClick={() => setToDeleteWarehouse(null)}
              aria-label="Cerrar modal"
            >
              <X size={18} />
            </button>
            <span className="modal-icon danger-icon">
              <Trash2 size={20} />
            </span>
            <p className="eyebrow">Eliminar depósito</p>
            <h2>¿Eliminar "{toDeleteWarehouse.name}"?</h2>
            <p className="modal-copy">
              Esta acción eliminará el depósito. Solo puede realizarse si el
              depósito no tiene stock disponible (debe estar en 0) ni ventas o
              transferencias históricas asociadas.
            </p>
            <div className="form-actions">
              <button
                type="button"
                className="button-secondary"
                onClick={() => setToDeleteWarehouse(null)}
              >
                Cancelar
              </button>
              <button
                type="button"
                className="button-primary danger-btn"
                disabled={pending}
                onClick={confirmRemoveWarehouse}
              >
                <Trash2 size={16} /> Confirmar eliminación
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Tarjetas de depósitos */}
      <section className="warehouse-grid stock-warehouse-grid">
        {warehouses.map(warehouse => (
          <WarehouseCard
            key={warehouse.id}
            warehouse={warehouse}
            isSelected={selectedWarehouse?.id === warehouse.id}
            canManage={canManage}
            onSelect={() => openWarehouse(warehouse)}
            onEdit={() => startEdit(warehouse)}
            onDelete={() => setToDeleteWarehouse(warehouse)}
          />
        ))}
      </section>

      {selectedWarehouse && (
        <div className="stock-deposit-summary">
          <div>
            <span className="eyebrow">Filtro de depósito activo</span>
            <h2>{selectedWarehouse.name}</h2>
            <p>
              {selectedWarehouse.address} · Responsable:{" "}
              {selectedWarehouse.manager}
            </p>
          </div>
          <div>
            <b>{selectedWarehouse.stockTotal ?? 0}</b>
            <span>unidades almacenadas</span>
          </div>
          <div>
            <b>{selectedWarehouse.capacity || "∞"}</b>
            <span>capacidad</span>
          </div>
          <button
            className="button-secondary"
            onClick={() => setWarehouseId("")}
          >
            Ver todos los depósitos
          </button>
        </div>
      )}

      {/* Filtros de la tabla de stock */}
      <div className="stock-toolbar">
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
          icon={<Filter size={15} />}
          ariaLabel="Filtrar por depósito"
        />
        <label className="search-control">
          <Search size={15} />
          <input
            value={productSearch}
            onChange={event => setProductSearch(event.target.value)}
            placeholder="Buscar producto, SKU o depósito"
          />
        </label>
        <ModernSelect
          value={categoryFilter}
          onChange={setCategoryFilter}
          options={categories}
          ariaLabel="Filtrar por categoría"
        />
        <ModernSelect
          value={stockFilter}
          onChange={setStockFilter}
          options={[
            { value: "all", label: "Todo el stock" },
            { value: "available", label: "Disponible" },
            { value: "low", label: "Stock bajo" },
            { value: "out", label: "Sin stock" },
          ]}
          ariaLabel="Filtrar por estado"
        />
        <label className="filter-number">
          <span>Mín:</span>
          <input
            type="number"
            min="0"
            value={minQuantity}
            onChange={event => setMinQuantity(event.target.value)}
            placeholder="0"
            aria-label="Unidades mínimas"
          />
        </label>
        <label className="filter-number">
          <span>Máx:</span>
          <input
            type="number"
            min="0"
            value={maxQuantity}
            onChange={event => setMaxQuantity(event.target.value)}
            placeholder="∞"
            aria-label="Unidades máximas"
          />
        </label>
        <button
          className="button-secondary filter-clear"
          type="button"
          onClick={clearStockFilters}
        >
          Limpiar
        </button>
        <span>
          {filteredItems.length} producto{filteredItems.length === 1 ? "" : "s"}
        </span>
      </div>

      {loading && <LoadingPanel rows={6} />}
      {!loading &&
        !error &&
        (filteredItems.length ? (
          <section className="table-card stock-reference-table">
            <div className="table-card-heading">
              <div>
                <h3>Inventario registrado</h3>
                <span>{filteredItems.length} registros en esta vista</span>
              </div>
              <span>Filtrá por nombre, SKU, categoría, estado o unidades</span>
            </div>
            <div className="table-scroll">
              <table>
                <thead>
                  <tr>
                    <th scope="col">Producto</th>
                    <th scope="col">Depósito</th>
                    <th scope="col">Stock actual</th>
                    <th scope="col">Precio venta</th>
                    <th scope="col">Estado</th>
                    <th scope="col" aria-label="Acciones" />
                  </tr>
                </thead>
                <tbody>
                  {filteredItems.map(item => (
                    <tr key={item.inventoryId}>
                      <td>
                        <div className="product-cell">
                          <span className="product-glyph">
                            {item.productName.slice(0, 1)}
                          </span>
                          <div>
                            <b>{item.productName}</b>
                            <small>
                              {item.sku} · {item.category}
                            </small>
                          </div>
                        </div>
                      </td>
                      <td>{item.warehouseName}</td>
                      <td className="stock-number">
                        <b>{item.quantity}</b> <small>un.</small>
                        <div className="stock-progress">
                          <span
                            style={{
                              width: `${Math.min(100, item.lowStockThreshold ? (item.quantity / (item.lowStockThreshold * 3)) * 100 : 100)}%`,
                            }}
                          />
                        </div>
                      </td>
                      <td className="stock-price">
                        {new Intl.NumberFormat("es-AR", {
                          style: "currency",
                          currency: "ARS",
                          maximumFractionDigits: 0,
                        }).format(item.priceCents / 100)}
                      </td>
                      <td>
                        <StockBadge
                          quantity={item.quantity}
                          threshold={item.lowStockThreshold}
                        />
                      </td>
                      <td>
                        {canManage && (
                          <span className="row-actions">
                            <button
                              className="icon-button"
                              onClick={() => openAdjustment(item)}
                              aria-label={`Ajustar ${item.productName}`}
                              title="Ajustar cantidad"
                            >
                              <Edit3 size={16} />
                            </button>
                            <button
                              className="icon-button"
                              onClick={() => openMove(item)}
                              aria-label={`Transferir ${item.productName}`}
                              title="Transferir entre depósitos"
                            >
                              <ArrowLeftRight size={16} />
                            </button>
                          </span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>
        ) : (
          <EmptyState
            title="No hay productos en esta vista"
            detail="Probá con otro filtro o incorporá stock a un producto."
          />
        ))}

      {/* Modal de ajuste de stock */}
      {selected && (
        <div className="modal-backdrop">
          <form className="modal-card" onSubmit={save}>
            <button
              className="modal-close"
              type="button"
              onClick={() => setSelected(null)}
              aria-label="Cerrar modal"
            >
              <X size={18} />
            </button>
            <span className="modal-icon">
              <PackageSearch size={20} />
            </span>
            <p className="eyebrow">Ajuste de inventario</p>
            <h2>{selected.productName}</h2>
            <p className="modal-copy">
              Depósito: <b>{selected.warehouseName}</b>.
            </p>
            <label className="field">
              <span>Nueva cantidad</span>
              <input
                autoFocus
                type="number"
                min="0"
                value={quantity}
                onChange={event => setQuantity(event.target.value)}
              />
            </label>
            <label className="field">
              <span>Motivo del ajuste</span>
              <input
                value={note}
                onChange={event => setNote(event.target.value)}
              />
            </label>
            <div className="form-actions">
              <button
                className="button-secondary"
                type="button"
                onClick={() => setSelected(null)}
              >
                Cancelar
              </button>
              <button
                className="button-primary"
                disabled={pending}
                type="submit"
              >
                <Check size={16} />
                Registrar ajuste
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Modal de transferencia */}
      {moving && (
        <div className="modal-backdrop">
          <form className="modal-card" onSubmit={submitMove}>
            <button
              className="modal-close"
              type="button"
              onClick={() => setMoving(null)}
              aria-label="Cerrar modal"
            >
              <X size={18} />
            </button>
            <span className="modal-icon">
              <ArrowLeftRight size={20} />
            </span>
            <p className="eyebrow">Transferir entre depósitos</p>
            <h2>{moving.productName}</h2>
            <p className="modal-copy">
              Origen: <b>{moving.warehouseName}</b> ({moving.quantity}{" "}
              disponibles).
            </p>
            <label className="field">
              <span>Depósito de destino</span>
              <ModernSelect
                value={moveDest}
                onChange={setMoveDest}
                placeholder="Seleccioná"
                options={[
                  { value: "", label: "Seleccioná" },
                  ...warehouses
                    .filter(warehouse => warehouse.id !== moving.warehouseId)
                    .map(warehouse => ({
                      value: String(warehouse.id),
                      label: warehouse.name,
                    })),
                ]}
                ariaLabel="Depósito de destino"
                minWidth="100%"
                className="w-full"
              />
            </label>
            <label className="field">
              <span>Cantidad</span>
              <input
                type="number"
                min="1"
                max={moving.quantity}
                value={moveQty}
                onChange={event => setMoveQty(event.target.value)}
              />
            </label>
            <div className="form-actions">
              <button
                className="button-secondary"
                type="button"
                onClick={() => setMoving(null)}
              >
                Cancelar
              </button>
              <button
                className="button-primary"
                disabled={pending}
                type="submit"
              >
                <Check size={16} />
                Confirmar transferencia
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
}
