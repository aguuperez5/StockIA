import { useEffect, useMemo, useState } from "react";
import {
  AlertCircle,
  ArrowRight,
  Boxes,
  Camera,
  CheckCircle2,
  Filter,
  Minus,
  Package,
  Plus,
  Search,
  Store,
  Trash2,
  Warehouse,
  X,
} from "lucide-react";
import { toast } from "sonner";
import { ModernSelect } from "@/components/ModernSelect";
import PhotoCapture from "@/components/PhotoCapture";
import {
  inventoryService,
  warehouseService,
  type InventoryItem,
  type Warehouse as WarehouseType,
} from "@/services/inventory";
import { transferService, type Transfer } from "@/services/backlog";

export interface NewTransferModalProps {
  isOpen?: boolean;
  onClose: () => void;
  onSuccess?: (createdTransfer: Transfer) => void;
}

export function NewTransferModal({
  isOpen = true,
  onClose,
  onSuccess,
}: NewTransferModalProps) {
  const [warehouses, setWarehouses] = useState<WarehouseType[]>([]);
  const [inventory, setInventory] = useState<InventoryItem[]>([]);
  const [loadingData, setLoadingData] = useState(true);
  const [loadError, setLoadError] = useState("");

  const [origin, setOrigin] = useState("");
  const [destination, setDestination] = useState("");
  const [selected, setSelected] = useState<Record<number, number>>({});
  const [productSearch, setProductSearch] = useState("");
  const [categoryFilter, setCategoryFilter] = useState("Todas");
  const [photo, setPhoto] = useState<{ data: string; mimeType: string } | undefined>();
  const [showPhotoSection, setShowPhotoSection] = useState(false);
  const [submitError, setSubmitError] = useState("");
  const [pending, setPending] = useState(false);

  // Carga inicial de depósitos e inventario
  useEffect(() => {
    let cancelled = false;
    setLoadingData(true);
    setLoadError("");

    Promise.all([warehouseService.list(), inventoryService.list()])
      .then(([wRes, iRes]) => {
        if (!cancelled) {
          setWarehouses(wRes.items);
          setInventory(iRes.items);
          setLoadingData(false);
        }
      })
      .catch(err => {
        if (!cancelled) {
          setLoadError(err instanceof Error ? err.message : String(err));
          setLoadingData(false);
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
  }, [onClose]);

  // Candidatos disponibles en el depósito de origen elegido
  const originCandidates = useMemo(() => {
    if (!origin) return [];
    return inventory.filter(
      item => String(item.warehouseId) === origin && item.quantity > 0
    );
  }, [inventory, origin]);

  // Categorías de los productos en este depósito
  const categories = useMemo(() => {
    const list = Array.from(
      new Set(
        originCandidates
          .map(item => item.category?.trim())
          .filter((c): c is string => Boolean(c && c.length > 0))
      )
    ).sort((a, b) => a.localeCompare(b, "es", { sensitivity: "base" }));
    return ["Todas", ...list];
  }, [originCandidates]);

  // Productos mostrados según búsqueda y categoría
  const filteredCandidates = useMemo(() => {
    return originCandidates.filter(item => {
      const text = `${item.productName} ${item.sku} ${item.category}`.toLowerCase();
      const matchesSearch =
        !productSearch.trim() ||
        text.includes(productSearch.trim().toLowerCase());
      const matchesCategory =
        categoryFilter === "Todas" || item.category === categoryFilter;
      return matchesSearch && matchesCategory;
    });
  }, [originCandidates, productSearch, categoryFilter]);

  const availableOf = (productId: number) =>
    originCandidates.find(i => i.productId === productId)?.quantity ?? 0;

  const handleOriginChange = (val: string) => {
    setOrigin(val);
    setSelected({});
    setProductSearch("");
    setCategoryFilter("Todas");
    setSubmitError("");
    if (destination === val) {
      setDestination("");
    }
  };

  const handleDestinationChange = (val: string) => {
    setDestination(val);
    setSubmitError("");
  };

  const addItem = (item: InventoryItem) => {
    setSelected(prev => ({
      ...prev,
      [item.productId]: Math.min(item.quantity, (prev[item.productId] ?? 0) + 1),
    }));
  };

  const stepItem = (productId: number, delta: number) => {
    setSelected(prev => {
      const maxAvailable = availableOf(productId);
      const current = prev[productId] ?? 0;
      const next = Math.max(0, Math.min(maxAvailable, current + delta));
      if (next === 0) {
        const { [productId]: _, ...rest } = prev;
        return rest;
      }
      return { ...prev, [productId]: next };
    });
  };

  const removeItem = (productId: number) => {
    setSelected(prev => {
      const { [productId]: _, ...rest } = prev;
      return rest;
    });
  };

  const chosenItems = useMemo(() => {
    return Object.entries(selected).map(([productIdStr, quantity]) => {
      const productId = Number(productIdStr);
      const itemInfo = originCandidates.find(i => i.productId === productId);
      return {
        productId,
        quantity,
        name: itemInfo?.productName ?? `Producto #${productId}`,
        sku: itemInfo?.sku ?? "",
        category: itemInfo?.category ?? "General",
        maxAvailable: itemInfo?.quantity ?? quantity,
      };
    });
  }, [selected, originCandidates]);

  const totalUnits = chosenItems.reduce((acc, i) => acc + i.quantity, 0);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!origin) {
      setSubmitError("Elegí el depósito de origen del despacho.");
      return;
    }
    if (!destination) {
      setSubmitError("Elegí el depósito de destino receptor.");
      return;
    }
    if (origin === destination) {
      setSubmitError("El depósito de origen y el de destino deben ser distintos.");
      return;
    }
    if (chosenItems.length === 0) {
      setSubmitError("Agregá al menos un producto a transferir.");
      return;
    }

    setPending(true);
    setSubmitError("");

    try {
      const payload = chosenItems.map(i => ({
        productId: i.productId,
        quantity: i.quantity,
      }));

      const res = await transferService.create({
        originWarehouseId: Number(origin),
        destinationWarehouseId: Number(destination),
        items: payload,
        photo,
      });

      toast.success(
        `Transferencia ${res.transfer.receiptNumber || `ID #${res.transfer.id}`} confirmada con éxito.`
      );
      if (onSuccess) {
        onSuccess(res.transfer);
      }
      onClose();
    } catch (err) {
      setSubmitError(err instanceof Error ? err.message : String(err));
    } finally {
      setPending(false);
    }
  };

  if (!isOpen) return null;

  const originObj = warehouses.find(w => String(w.id) === origin);
  const destObj = warehouses.find(w => String(w.id) === destination);

  return (
    <div className="modal-backdrop" onClick={onClose} role="presentation">
      <div
        className="modal-card new-transfer-modal"
        role="dialog"
        aria-modal="true"
        aria-labelledby="new-transfer-modal-title"
        onClick={e => e.stopPropagation()}
      >
        {/* Encabezado */}
        <header className="modal-header new-transfer-modal-header">
          <div className="new-transfer-title-group">
            <span className="new-transfer-icon-badge">
              <Boxes size={22} />
            </span>
            <div>
              <span className="modal-eyebrow">Logística · Movimiento entre depósitos</span>
              <h2 id="new-transfer-modal-title">Nueva Transferencia de Stock</h2>
              <p className="modal-desc">
                Generá un remito transaccional y trasladá mercadería entre depósitos en tiempo real.
              </p>
            </div>
          </div>
          <button
            type="button"
            className="modal-close-btn"
            onClick={onClose}
            aria-label="Cerrar ventana"
          >
            <X size={18} />
          </button>
        </header>

        {/* Formulario */}
        <form onSubmit={handleSubmit} className="new-transfer-form">
          <div className="new-transfer-modal-body">
            {loadError && (
              <div className="alert-panel error">
                <AlertCircle size={16} />
                <span>{loadError}</span>
              </div>
            )}
            {submitError && (
              <div className="alert-panel error">
                <AlertCircle size={16} />
                <span>{submitError}</span>
              </div>
            )}

            {/* SECCIÓN 1: RUTA DE TRANSFERENCIA (ORIGEN Y DESTINO) */}
            <div className="new-transfer-route-card">
              <div className="route-select-col">
                <label className="route-select-label">
                  <Store size={14} className="icon-origin" />
                  <span>Depósito de Origen (Despacho)</span>
                </label>
                <ModernSelect
                  value={origin}
                  onChange={handleOriginChange}
                  options={[
                    { value: "", label: "Seleccioná depósito emisor..." },
                    ...warehouses.map(w => ({
                      value: String(w.id),
                      label: `${w.name} (${w.type || "Depósito"})`,
                    })),
                  ]}
                  ariaLabel="Depósito de origen"
                  minWidth="100%"
                  className="w-full"
                />
                {originObj && (
                  <span className="warehouse-sub-hint">
                    Ubicación: {originObj.address || "Sede principal"}
                  </span>
                )}
              </div>

              <div className="route-arrow-center">
                <div className="route-arrow-bubble">
                  <ArrowRight size={16} />
                </div>
              </div>

              <div className="route-select-col">
                <label className="route-select-label">
                  <Warehouse size={14} className="icon-dest" />
                  <span>Depósito de Destino (Recepción)</span>
                </label>
                <ModernSelect
                  value={destination}
                  onChange={handleDestinationChange}
                  options={[
                    { value: "", label: "Seleccioná depósito receptor..." },
                    ...warehouses
                      .filter(w => String(w.id) !== origin)
                      .map(w => ({
                        value: String(w.id),
                        label: `${w.name} (${w.type || "Depósito"})`,
                      })),
                  ]}
                  ariaLabel="Depósito de destino"
                  minWidth="100%"
                  className="w-full"
                />
                {destObj && (
                  <span className="warehouse-sub-hint">
                    Ubicación: {destObj.address || "Recepción"}
                  </span>
                )}
              </div>
            </div>

            {/* SECCIÓN 2: ARTÍCULOS EN EL REMITO (SELECCIONADOS) */}
            <div className="transfer-cart-section">
              <div className="transfer-cart-header">
                <div className="cart-title">
                  <h4>Mercadería a transferir</h4>
                  <span className="cart-subtitle">
                    Productos que formarán parte de este remito
                  </span>
                </div>
                {chosenItems.length > 0 && (
                  <span className="cart-total-badge">
                    <CheckCircle2 size={13} />
                    {totalUnits} unidades · {chosenItems.length} producto{chosenItems.length === 1 ? "" : "s"}
                  </span>
                )}
              </div>

              {chosenItems.length === 0 ? (
                <div className="transfer-cart-empty">
                  <Package size={18} className="cart-empty-icon" />
                  <div className="cart-empty-text">
                    <span className="cart-empty-main">Aún no agregaste productos a este remito.</span>
                    <span className="cart-empty-sub">
                      {origin
                        ? "Hacé clic en \"+ Agregar\" en los artículos de abajo para sumarlos a este movimiento."
                        : "Elegí el depósito de origen para cargar los productos con stock disponible."}
                    </span>
                  </div>
                </div>
              ) : (
                <div className="transfer-cart-list">
                  {chosenItems.map(item => (
                    <div key={item.productId} className="transfer-cart-item">
                      <div className="cart-item-info">
                        <b className="cart-item-name">{item.name}</b>
                        <div className="cart-item-meta">
                          <span className="cart-item-sku">{item.sku}</span>
                          <span className="cart-item-category">{item.category}</span>
                          <span className="cart-item-avail">
                            Disponible en origen: {item.maxAvailable} un.
                          </span>
                        </div>
                      </div>

                      <div className="cart-item-actions">
                        <div className="cart-stepper">
                          <button
                            type="button"
                            className="stepper-btn"
                            onClick={() => stepItem(item.productId, -1)}
                            title="Quitar una unidad"
                          >
                            <Minus size={13} />
                          </button>
                          <span className="stepper-val">{item.quantity}</span>
                          <button
                            type="button"
                            className="stepper-btn"
                            onClick={() => stepItem(item.productId, 1)}
                            disabled={item.quantity >= item.maxAvailable}
                            title={
                              item.quantity >= item.maxAvailable
                                ? "Límite de stock disponible alcanzado"
                                : "Sumar una unidad"
                            }
                          >
                            <Plus size={13} />
                          </button>
                        </div>

                        <button
                          type="button"
                          className="cart-remove-btn"
                          onClick={() => removeItem(item.productId)}
                          title="Eliminar del remito"
                        >
                          <Trash2 size={14} />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* SECCIÓN 3: CATÁLOGO DE EXISTENCIAS DISPONIBLES EN ORIGEN */}
            <div className="origin-catalog-section">
              <div className="catalog-header-bar">
                <div>
                  <h4>Existencias en depósito de origen</h4>
                  <p>
                    {origin
                      ? `Mostrando stock disponible en ${originObj?.name || "el depósito emisor"}`
                      : "Elegí el depósito de origen primero para cargar el catálogo"}
                  </p>
                </div>

                {origin && originCandidates.length > 0 && (
                  <div className="catalog-tools-row">
                    <ModernSelect
                      value={categoryFilter}
                      onChange={setCategoryFilter}
                      options={categories.map(c => ({ value: c, label: c }))}
                      icon={<Filter size={13} />}
                      ariaLabel="Filtrar por categoría"
                    />

                    <div className="catalog-search-wrap">
                      <Search size={14} />
                      <input
                        type="text"
                        placeholder="Buscar por producto o SKU..."
                        value={productSearch}
                        onChange={e => setProductSearch(e.target.value)}
                      />
                      {productSearch && (
                        <button
                          type="button"
                          className="clear-search-btn"
                          onClick={() => setProductSearch("")}
                        >
                          <X size={12} />
                        </button>
                      )}
                    </div>
                  </div>
                )}
              </div>

              {!origin ? (
                <div className="catalog-notice-box">
                  <Store size={20} />
                  <span>Seleccioná el depósito de origen arriba para consultar su inventario.</span>
                </div>
              ) : originCandidates.length === 0 ? (
                <div className="catalog-notice-box">
                  <AlertCircle size={20} />
                  <span>El depósito de origen seleccionado no cuenta con stock disponible para transferir.</span>
                </div>
              ) : filteredCandidates.length === 0 ? (
                <div className="catalog-notice-box">
                  <Search size={20} />
                  <span>No se encontraron productos coincidentes con los filtros actuales.</span>
                </div>
              ) : (
                <div className="catalog-items-grid">
                  {filteredCandidates.map(item => {
                    const currentSelected = selected[item.productId] ?? 0;
                    const isSelected = currentSelected > 0;
                    const isMax = currentSelected >= item.quantity;

                    return (
                      <div
                        key={item.productId}
                        className={`catalog-pick-card ${isSelected ? "is-selected" : ""}`}
                        onClick={() => !isMax && addItem(item)}
                      >
                        <div className="pick-card-main">
                          <span className="pick-card-glyph">{item.productName[0]}</span>
                          <div className="pick-card-text">
                            <b className="pick-card-title">{item.productName}</b>
                            <div className="pick-card-tags">
                              <span className="pick-sku">{item.sku}</span>
                              <span className="pick-cat">{item.category}</span>
                            </div>
                          </div>
                        </div>

                        <div className="pick-card-side">
                          <div className="pick-stock-info">
                            <span className="stock-label">Disponible:</span>
                            <span className="stock-number">{item.quantity} un.</span>
                          </div>

                          <button
                            type="button"
                            className={`pick-add-btn ${isSelected ? "btn-active" : ""}`}
                            disabled={isMax}
                            onClick={e => {
                              e.stopPropagation();
                              addItem(item);
                            }}
                          >
                            <Plus size={13} />
                            {isSelected ? `En remito (${currentSelected})` : "Agregar"}
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

            {/* SECCIÓN 4: CONSTANCIA FOTOGRÁFICA / COMPROBANTE ADJUNTO (OPCIONAL) */}
            <div className="photo-optional-toggle">
              <button
                type="button"
                className="button-ghost photo-toggle-btn"
                onClick={() => setShowPhotoSection(!showPhotoSection)}
              >
                <Camera size={15} />
                <span>
                  {showPhotoSection
                    ? "Ocultar captura de comprobante"
                    : photo
                    ? "Comprobante fotográfico adjunto (Hacé clic para ver o cambiar)"
                    : "Adjuntar constancia fotográfica o remito firmado (opcional)"}
                </span>
                {photo && <span className="attached-pill">1 foto adjunta</span>}
              </button>

              {showPhotoSection && (
                <div className="photo-embed-wrapper">
                  <PhotoCapture
                    onPhoto={(data, mimeType) => setPhoto({ data, mimeType })}
                    onDetected={detected => {
                      detected.forEach(p => {
                        const match = originCandidates.find(i => i.productId === p.id);
                        if (match) addItem(match);
                      });
                    }}
                  />
                  {photo && (
                    <div className="photo-current-preview">
                      <span>Vista previa de constancia adjunta:</span>
                      <img src={photo.data} alt="Remito adjunto" className="photo-thumb" />
                      <button
                        type="button"
                        className="button-link text-xs danger-text"
                        onClick={() => setPhoto(undefined)}
                      >
                        Eliminar foto adjunta
                      </button>
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>

          {/* Pie del modal con acciones */}
          <footer className="modal-footer new-transfer-modal-footer">
            <div className="footer-summary-text">
              {chosenItems.length > 0 ? (
                <span>
                  Listo para mover <b>{totalUnits} unidades</b> de {originObj?.name || "origen"} a {destObj?.name || "destino"}
                </span>
              ) : (
                <span>Completá origen, destino y agregá productos al remito</span>
              )}
            </div>

            <div className="footer-buttons">
              <button
                type="button"
                className="button-secondary"
                onClick={onClose}
                disabled={pending}
              >
                Cancelar
              </button>
              <button
                type="submit"
                className="button-primary"
                disabled={
                  pending ||
                  !origin ||
                  !destination ||
                  origin === destination ||
                  chosenItems.length === 0
                }
              >
                {pending ? (
                  <>
                    <div className="spinner-sm" /> Confirmando...
                  </>
                ) : (
                  <>
                    <CheckCircle2 size={16} /> Confirmar transferencia
                  </>
                )}
              </button>
            </div>
          </footer>
        </form>
      </div>
    </div>
  );
}
