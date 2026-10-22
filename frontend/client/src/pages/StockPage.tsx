import {
  ArrowLeftRight,
  Check,
  Edit3,
  Filter,
  PackageSearch,
  Plus,
  Search,
  SlidersHorizontal,
  Trash2,
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
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { WarehouseCard } from "@/components/stock/WarehouseCard";
import { WarehouseFormModal } from "@/components/stock/WarehouseFormModal";
import { WarehouseDetailModal } from "@/components/stock/WarehouseDetailModal";
import { NewTransferModal } from "@/components/transfers/NewTransferModal";
import {
  inventoryService,
  type InventoryItem,
  type Warehouse,
  warehouseService,
} from "@/services/inventory";
import { transferService } from "@/services/backlog";
import { useStockAuth } from "@/contexts/StockAuthContext";

const DEFAULT_CATEGORIES = [
  "Almacén",
  "Bebidas",
  "Ferretería",
  "Hogar",
  "Limpieza",
  "Válvulas",
];

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
  const [editingWarehouse, setEditingWarehouse] = useState<Warehouse | null>(null);
  const [showWarehouseForm, setShowWarehouseForm] = useState(false);
  const [toDeleteWarehouse, setToDeleteWarehouse] = useState<Warehouse | null>(
    null
  );
  const [detail, setDetail] = useState<Awaited<
    ReturnType<typeof warehouseService.summary>
  > | null>(null);
  const [productSearch, setProductSearch] = useState("");
  const [categoryFilter, setCategoryFilter] = useState("Todas");
  const [stockFilter, setStockFilter] = useState("all");
  const [minQuantity, setMinQuantity] = useState("");
  const [maxQuantity, setMaxQuantity] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);
  const [pending, setPending] = useState(false);
  const [transferModalState, setTransferModalState] = useState<{
    isOpen: boolean;
    destinationWarehouseId?: number | string;
    productId?: number;
    quantity?: number;
  }>({ isOpen: false });

  // Deep linking: leer parámetros iniciales de la URL (ej. ?filter=low o ?warehouseId=1)
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const filterParam = params.get("filter");
    const warehouseParam = params.get("warehouseId");

    if (filterParam && ["all", "available", "low", "out"].includes(filterParam)) {
      setStockFilter(filterParam);
    }
    if (warehouseParam) {
      setWarehouseId(warehouseParam);
    }
  }, []);

  const loadWarehouses = () =>
    warehouseService
      .list()
      .then(result => setWarehouses(result.items))
      .catch((reason: Error) => setError(reason.message));

  const load = () => {
    setLoading(true);
    setError("");
    const inventoryPromise =
      stockFilter === "low"
        ? inventoryService
            .listLowStock(warehouseId || undefined)
            .then(res => ({ items: res.items }))
        : inventoryService.list(warehouseId || undefined);

    Promise.all([inventoryPromise, warehouseService.list()])
      .then(([inventory, deposits]) => {
        setItems(inventory.items);
        setWarehouses(deposits.items);
      })
      .catch((reason: Error) => setError(reason.message))
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    void load();
  }, [warehouseId, stockFilter]);

  const openQuickTransfer = (item: InventoryItem) => {
    const needed = Math.max(1, item.lowStockThreshold - item.quantity);
    setTransferModalState({
      isOpen: true,
      destinationWarehouseId: item.warehouseId,
      productId: item.productId,
      quantity: needed,
    });
  };

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
    try {
      setDetail(await warehouseService.summary(warehouse.id));
    } catch (reason) {
      toast.error((reason as Error).message);
    }
  };

  const closeWarehouse = () => {
    setDetail(null);
    setWarehouseId("");
  };

  const startCreate = () => {
    setEditingWarehouse(null);
    setShowWarehouseForm(true);
  };

  const startEdit = (warehouse: Warehouse) => {
    setEditingWarehouse(warehouse);
    setShowWarehouseForm(true);
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
  const categories = useMemo(() => {
    const set = new Set<string>(DEFAULT_CATEGORIES);
    items.forEach(item => {
      const c = item.category?.trim();
      if (c) set.add(c);
    });
    return [
      "Todas",
      ...Array.from(set).sort((a, b) =>
        a.localeCompare(b, "es", { sensitivity: "base" })
      ),
    ];
  }, [items]);

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
          (stockFilter === "low" && item.quantity <= item.lowStockThreshold) ||
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

  const clearAdvancedFilters = () => {
    setStockFilter("all");
    setMinQuantity("");
    setMaxQuantity("");
  };

  const hasAdvancedFilters = Boolean(
    stockFilter !== "all" || minQuantity !== "" || maxQuantity !== ""
  );

  const advancedCount =
    (stockFilter !== "all" ? 1 : 0) +
    (minQuantity !== "" || maxQuantity !== "" ? 1 : 0);

  const hasAnyFilter = Boolean(
    productSearch.trim() !== "" ||
      categoryFilter !== "Todas" ||
      warehouseId !== "" ||
      hasAdvancedFilters
  );

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
        <WarehouseDetailModal
          detail={detail}
          categories={categories}
          onClose={closeWarehouse}
        />
      )}

      {/* Modal de Alta / Edición de Depósito */}
      {canManage && (
        <WarehouseFormModal
          isOpen={showWarehouseForm}
          initialData={editingWarehouse}
          onClose={() => {
            setShowWarehouseForm(false);
            setEditingWarehouse(null);
          }}
          onSuccess={async () => {
            await loadWarehouses();
            load();
          }}
        />
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
            isSelected={
              detail?.deposit.id === warehouse.id ||
              (Boolean(warehouseId) && selectedWarehouse?.id === warehouse.id)
            }
            canManage={canManage}
            onSelect={() => openWarehouse(warehouse)}
            onEdit={() => startEdit(warehouse)}
            onDelete={() => setToDeleteWarehouse(warehouse)}
          />
        ))}
      </section>

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

        <Popover>
          <PopoverTrigger asChild>
            <button
              type="button"
              className={`filter-more-btn ${hasAdvancedFilters ? "active" : ""}`}
              aria-label="Filtros avanzados"
            >
              <SlidersHorizontal size={14} />
              <span>Filtros</span>
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
                  <span>Filtros de inventario</span>
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
                <label>Nivel de stock</label>
                <ModernSelect
                  value={stockFilter}
                  onChange={setStockFilter}
                  options={[
                    { value: "all", label: "Todo el stock" },
                    { value: "available", label: "Disponible" },
                    { value: "low", label: "Bajo mínimo" },
                    { value: "out", label: "Sin stock" },
                  ]}
                  ariaLabel="Filtrar por estado"
                  minWidth="100%"
                />
              </div>

              <div className="filter-popover-item">
                <label>Unidades en stock</label>
                <div className="filter-popover-grid">
                  <div className="popover-input-wrapper">
                    <span className="popover-input-prefix">Mín</span>
                    <input
                      type="number"
                      min="0"
                      value={minQuantity}
                      onChange={event => setMinQuantity(event.target.value)}
                      placeholder="0"
                      aria-label="Unidades mínimas"
                    />
                  </div>
                  <div className="popover-input-wrapper">
                    <span className="popover-input-prefix">Máx</span>
                    <input
                      type="number"
                      min="0"
                      value={maxQuantity}
                      onChange={event => setMaxQuantity(event.target.value)}
                      placeholder="∞"
                      aria-label="Unidades máximas"
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
            type="button"
            onClick={clearStockFilters}
          >
            <X size={15} />
            Limpiar
          </button>
        )}
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
                            {(() => {
                              const isOutOfStock = item.quantity === 0;
                              const isLowStock =
                                item.quantity <= item.lowStockThreshold;
                              const isReplenish = isOutOfStock || isLowStock;

                              const title = isOutOfStock
                                ? `⚠️ Sin stock: Pedir transferencia / reposición para "${item.productName}" hacia ${item.warehouseName}`
                                : isLowStock
                                ? `⚠️ Stock bajo (${item.quantity} u.): Pedir transferencia / reposición para "${item.productName}" hacia ${item.warehouseName}`
                                : "Transferir entre depósitos";

                              return (
                                <button
                                  className={`icon-button ${
                                    isOutOfStock
                                      ? "out-of-stock"
                                      : isLowStock
                                      ? "warning"
                                      : ""
                                  }`}
                                  style={{
                                    position: "relative",
                                    ...(isOutOfStock
                                      ? {
                                          color: "#ef4444",
                                          borderColor: "rgba(239, 68, 68, 0.4)",
                                          backgroundColor: "rgba(239, 68, 68, 0.1)",
                                        }
                                      : isLowStock
                                      ? {
                                          color: "#f59e0b",
                                          borderColor: "rgba(245, 158, 11, 0.4)",
                                          backgroundColor: "rgba(245, 158, 11, 0.1)",
                                        }
                                      : {}),
                                  }}
                                  onClick={() =>
                                    isReplenish
                                      ? openQuickTransfer(item)
                                      : openMove(item)
                                  }
                                  aria-label={title}
                                  title={title}
                                >
                                  <ArrowLeftRight size={16} />
                                  {isReplenish && (
                                    <span
                                      style={{
                                        position: "absolute",
                                        top: "-2px",
                                        right: "-2px",
                                        width: "7px",
                                        height: "7px",
                                        borderRadius: "50%",
                                        backgroundColor: isOutOfStock
                                          ? "var(--status-critical)"
                                          : "var(--status-warn)",
                                        boxShadow: "0 0 0 1.5px var(--surface)",
                                      }}
                                    />
                                  )}
                                </button>
                              );
                            })()}
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

      {/* Modal de transferencia rápida completa */}
      {transferModalState.isOpen && (
        <NewTransferModal
          isOpen={transferModalState.isOpen}
          onClose={() => setTransferModalState({ isOpen: false })}
          onSuccess={() => {
            setTransferModalState({ isOpen: false });
            load();
          }}
          initialDestinationWarehouseId={transferModalState.destinationWarehouseId}
          initialProductId={transferModalState.productId}
          initialQuantity={transferModalState.quantity}
        />
      )}
    </div>
  );
}
