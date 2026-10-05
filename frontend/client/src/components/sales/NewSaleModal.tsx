import {
  AlertTriangle,
  Building2,
  CheckCircle2,
  Filter,
  PackagePlus,
  Plus,
  ReceiptText,
  Search,
  ShoppingCart,
  Sparkles,
  Store,
  Warehouse as WarehouseIcon,
  X,
} from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import { ModernSelect } from "@/components/ModernSelect";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { EmptyState, LoadingPanel, money } from "@/components/StockUI";
import PhotoCapture, { type DetectedProduct } from "@/components/PhotoCapture";
import { preloadCartFromDetections } from "@/lib/cartPreload";
import { calculateLinePricing, unitPriceForQuantity } from "@/lib/pricing";
import { ProductModal } from "@/components/products/ProductModal";
import {
  inventoryService,
  warehouseService,
  type InventoryItem,
  type Warehouse,
} from "@/services/inventory";
import { saleService } from "@/services/sales";
import { customerService, type Customer, type RecognitionDetection } from "@/services/backlog";
import { SaleCartLine, type CartLine } from "@/components/sales/SaleCartLine";
import { useStockAuth } from "@/contexts/StockAuthContext";

export interface NewSaleModalProps {
  isOpen?: boolean;
  onClose: () => void;
  onSuccess?: (createdSale: {
    id: number;
    receiptNumber: string;
    totalCents: number;
    photoData?: string;
  }) => void;
}

export function NewSaleModal({
  isOpen = true,
  onClose,
  onSuccess,
}: NewSaleModalProps) {
  const { user } = useStockAuth();
  const canCreateProduct = user?.appRole === "administrador";

  const [allInventory, setAllInventory] = useState<InventoryItem[]>([]);
  const [available, setAvailable] = useState<InventoryItem[]>([]);
  const [warehouses, setWarehouses] = useState<Warehouse[]>([]);
  const [cart, setCart] = useState<CartLine[]>([]);
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [customerId, setCustomerId] = useState("");
  const [query, setQuery] = useState("");
  const [selectedWarehouseFilter, setSelectedWarehouseFilter] = useState<string>("");
  const [categoryFilter, setCategoryFilter] = useState<string>("Todas");
  const [photo, setPhoto] = useState<{ data: string; mimeType: string }>();
  const [loading, setLoading] = useState(true);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState("");

  // Estado para el panel de análisis y verificación de stock
  const [analyzedProducts, setAnalyzedProducts] = useState<DetectedProduct[] | null>(null);
  const [createProductSku, setCreateProductSku] = useState<string | null>(null);
  const [switchWarehouseConfirm, setSwitchWarehouseConfirm] = useState<{
    item: InventoryItem;
    targetWarehouseName: string;
  } | null>(null);

  const load = () => {
    setLoading(true);
    setError("");
    Promise.all([
      inventoryService.list(),
      customerService.list(),
      warehouseService.list(),
    ])
      .then(([inventoryResult, customerResult, warehouseResult]) => {
        setAllInventory(inventoryResult.items);
        setAvailable(inventoryResult.items.filter(item => item.quantity > 0));
        setCustomers(customerResult.items);
        setWarehouses(warehouseResult.items);
      })
      .catch((reason: Error) => setError(reason.message))
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    load();
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [onClose]);

  // Categorías disponibles
  const categories = useMemo(
    () => [
      "Todas",
      ...Array.from(
        new Set(
          available
            .map(item => item.category?.trim())
            .filter((c): c is string => Boolean(c && c.length > 0))
        )
      ).sort((a, b) => a.localeCompare(b, "es", { sensitivity: "base" })),
    ],
    [available]
  );

  // Depósito activo en la venta (si el carrito ya tiene artículos)
  const activeWarehouseId = cart.length > 0 ? cart[0].warehouseId : null;
  const activeWarehouseName = cart.length > 0 ? cart[0].warehouseName : null;

  // Filtrado del catálogo según búsqueda, depósito y categoría
  const shown = useMemo(() => {
    return available.filter(item => {
      const matchesText =
        `${item.productName} ${item.sku} ${item.warehouseName}`
          .toLowerCase()
          .includes(query.toLowerCase());
      const matchesWarehouse =
        !selectedWarehouseFilter ||
        String(item.warehouseId) === selectedWarehouseFilter;
      const matchesCategory =
        categoryFilter === "Todas" || item.category === categoryFilter;
      return matchesText && matchesWarehouse && matchesCategory;
    });
  }, [available, query, selectedWarehouseFilter, categoryFilter]);

  // Agregar un artículo del catálogo al carrito
  const add = (item: InventoryItem) => {
    if (activeWarehouseId && activeWarehouseId !== item.warehouseId) {
      setSwitchWarehouseConfirm({
        item,
        targetWarehouseName: item.warehouseName,
      });
      return;
    }
    setError("");
    setCart(current => {
      const present = current.find(
        line => line.inventoryId === item.inventoryId
      );
      if (present) {
        return current.map(line => {
          if (line.inventoryId !== item.inventoryId) return line;
          const nextQty = Math.min(line.quantity, line.cartQuantity + 1);
          const pricing = calculateLinePricing(
            line.priceCents,
            line.priceRules,
            nextQty
          );
          return {
            ...line,
            cartQuantity: nextQty,
            effectiveUnitPriceCents: pricing.unitPriceCents,
            appliedRuleLabel: pricing.appliedRuleLabel,
          };
        });
      }
      const initialPricing = calculateLinePricing(
        item.priceCents,
        item.priceRules,
        1
      );
      return [
        ...current,
        {
          ...item,
          cartQuantity: 1,
          effectiveUnitPriceCents: initialPricing.unitPriceCents,
          appliedRuleLabel: initialPricing.appliedRuleLabel,
        },
      ];
    });
  };

  // Confirmar cambio de depósito vaciando el carrito
  const confirmSwitchWarehouse = () => {
    if (!switchWarehouseConfirm) return;
    const { item } = switchWarehouseConfirm;
    const initialPricing = calculateLinePricing(
      item.priceCents,
      item.priceRules,
      1
    );
    setCart([
      {
        ...item,
        cartQuantity: 1,
        effectiveUnitPriceCents: initialPricing.unitPriceCents,
        appliedRuleLabel: initialPricing.appliedRuleLabel,
      },
    ]);
    setSwitchWarehouseConfirm(null);
    toast.info(
      `Se cambió el depósito a "${item.warehouseName}" y se reinició la venta.`
    );
  };

  // Modificar cantidad o quitar línea
  const change = (inventoryId: number, next: number) =>
    setCart(current =>
      current.flatMap(line => {
        if (line.inventoryId !== inventoryId) return [line];
        if (next <= 0) return [];
        const nextQty = Math.min(line.quantity, next);
        const pricing = calculateLinePricing(
          line.priceCents,
          line.priceRules,
          nextQty
        );
        return [
          {
            ...line,
            cartQuantity: nextQty,
            effectiveUnitPriceCents: pricing.unitPriceCents,
            appliedRuleLabel: pricing.appliedRuleLabel,
          },
        ];
      })
    );

  const computedTotal = cart.reduce((sum, line) => {
    const effectivePrice =
      line.effectiveUnitPriceCents ??
      unitPriceForQuantity(line.priceCents, line.priceRules, line.cartQuantity);
    return sum + effectivePrice * line.cartQuantity;
  }, 0);

  const totalCartUnits = cart.reduce((sum, line) => sum + line.cartQuantity, 0);

  // Manejo de productos detectados por el análisis y precarga en el carrito
  const handleDetected = (items: DetectedProduct[]) => {
    setAnalyzedProducts(items);
    if (!items.length) {
      toast.info("No se encontraron productos coincidentes en el catálogo.");
      return;
    }
    toast.success(`Se analizaron ${items.length} producto(s) en el catálogo.`);
  };

  const handleAnalysisComplete = (result: {
    status?: string;
    items: DetectedProduct[];
    detections?: RecognitionDetection[];
  }) => {
    setAnalyzedProducts(result.items);
    if (!result.items.length) return;

    // Precargar carrito con productos locales detectados y sus cantidades
    const preload = preloadCartFromDetections({
      detectedItems: result.items,
      availableInventory: available,
      currentWarehouseId: activeWarehouseId,
      isAmbiguous: result.status === "ambiguous",
    });

    if (preload.cart.length > 0) {
      setCart(preload.cart);
      toast.success(
        `Se precargaron ${preload.cart.length} producto(s) en el comprobante con sus cantidades sugeridas.`
      );
    }

    // Informar recortes por falta de stock
    for (const tr of preload.trimmed) {
      toast.info(
        `Stock de "${tr.productName}" limitado a ${tr.available} u. disponibles (solicitado: ${tr.requested}).`
      );
    }

    if (preload.hasDifferentWarehouses && !activeWarehouseId) {
      toast.warning(
        "Se detectaron existencias en depósitos distintos. La venta se fijó en un único depósito; podés cambiarlo si es necesario."
      );
    }
  };

  const addProductFromWarehouse = (productId: number, warehouseId: number) => {
    const invItem = available.find(
      inv => inv.productId === productId && inv.warehouseId === warehouseId
    );
    if (!invItem || invItem.quantity <= 0) {
      toast.error(
        "No hay stock disponible de este producto en el depósito seleccionado."
      );
      return;
    }
    add(invItem);
    if (activeWarehouseId === null || activeWarehouseId === warehouseId) {
      toast.success(
        `"${invItem.productName}" agregado desde ${invItem.warehouseName}.`
      );
    }
  };

  // Verificación de stock de los productos analizados
  const analysisDetails = useMemo(() => {
    if (!analyzedProducts || !analyzedProducts.length) return null;

    const itemsWithStocks = analyzedProducts.map(prod => {
      const stocksByWarehouse = warehouses.map(w => {
        const inv = allInventory.find(
          i => i.productId === prod.id && i.warehouseId === w.id
        );
        return {
          warehouseId: w.id,
          warehouseName: w.name,
          quantity: inv ? inv.quantity : 0,
          inventoryItem: inv && inv.quantity > 0 ? inv : null,
        };
      });

      const totalQuantity = stocksByWarehouse.reduce(
        (acc, s) => acc + s.quantity,
        0
      );
      const warehousesWithStock = stocksByWarehouse.filter(s => s.quantity > 0);

      return {
        ...prod,
        stocksByWarehouse,
        totalQuantity,
        warehousesWithStock,
      };
    });

    const allWarehousesWithAnyStock = new Set<number>();
    itemsWithStocks.forEach(item => {
      item.warehousesWithStock.forEach(s =>
        allWarehousesWithAnyStock.add(s.warehouseId)
      );
    });

    const hasDifferentWarehouses = allWarehousesWithAnyStock.size > 1;
    const hasCartConflict =
      activeWarehouseId !== null &&
      itemsWithStocks.some(
        item =>
          item.warehousesWithStock.length > 0 &&
          !item.warehousesWithStock.some(
            s => s.warehouseId === activeWarehouseId
          )
      );

    return {
      items: itemsWithStocks,
      showAlert: hasDifferentWarehouses || hasCartConflict,
      hasCartConflict,
    };
  }, [analyzedProducts, warehouses, allInventory, activeWarehouseId]);

  const confirmSale = async () => {
    if (!cart.length) {
      setError("Agregá al menos un producto para registrar la venta.");
      return;
    }
    setPending(true);
    setError("");
    try {
      const result = await saleService.create(
        cart.map(line => ({
          productId: line.productId,
          warehouseId: line.warehouseId,
          quantity: line.cartQuantity,
        })),
        customerId ? Number(customerId) : undefined,
        photo
      );
      toast.success("Venta confirmada exitosamente.");
      if (onSuccess) {
        onSuccess(result.sale);
      }
      onClose();
    } catch (reason) {
      const message = reason instanceof Error ? reason.message : String(reason);
      load();
      setError(message);
    } finally {
      setPending(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="modal-backdrop" onClick={onClose} role="presentation">
      <div
        className="modal-card new-sale-modal"
        role="dialog"
        aria-modal="true"
        aria-labelledby="new-sale-modal-title"
        onClick={e => e.stopPropagation()}
      >
        {/* Encabezado */}
        <header className="modal-header new-sale-modal-header">
          <div className="new-sale-title-group">
            <span className="new-sale-icon-badge">
              <ShoppingCart size={22} />
            </span>
            <div>
              <span className="modal-eyebrow">Operación comercial · Punto de venta</span>
              <h2 id="new-sale-modal-title">Nueva Venta</h2>
              <p className="modal-desc">
                Cargá los productos, verificá existencias en depósito y registrá la operación.
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

        {/* Cuerpo del Modal */}
        <div className="new-sale-modal-body">
          {error && (
            <div className="alert-panel error">
              <AlertTriangle size={16} />
              <span>{error}</span>
            </div>
          )}

          {loading ? (
            <div className="new-sale-loading">
              <LoadingPanel rows={4} />
            </div>
          ) : (
            <div className="new-sale-modal-grid">
              {/* COLUMNA IZQUIERDA: VISIÓN AI Y CATÁLOGO */}
              <div className="new-sale-catalog-col">
                {/* 1. MÓDULO DE RECONOCIMIENTO INTELIGENTE (STOCKIA VISION) - SIEMPRE VISIBLE */}
                <div className="sale-vision-hero-card">
                  <div className="sale-vision-hero-top">
                    <div className="sale-vision-brand">
                      <span className="sale-vision-sparkle-icon">
                        <Sparkles size={16} />
                      </span>
                      <div>
                        <div className="sale-vision-title-row">
                          <h3 className="sale-vision-title">StockIA Vision · IA de Reconocimiento</h3>
                        </div>
                        <p className="sale-vision-desc">
                          Escaneá comprobantes físicos, abrí la cámara o analizá artículos para detectar stock al instante.
                        </p>
                      </div>
                    </div>
                    {photo && (
                      <div className="sale-photo-status-pill">
                        <span>✓ Comprobante adjunto</span>
                        <button
                          type="button"
                          className="remove-photo-link"
                          onClick={() => setPhoto(undefined)}
                          title="Eliminar foto adjunta"
                          aria-label="Eliminar foto adjunta"
                        >
                          <X size={12} />
                        </button>
                      </div>
                    )}
                  </div>

                  <div className="sale-vision-capture-wrapper">
                    <PhotoCapture
                      scanMode="sales"
                      onPhoto={(data, mimeType) => setPhoto({ data, mimeType })}
                      onDetected={handleDetected}
                      onAnalysisComplete={handleAnalysisComplete}
                      canCreateProduct={canCreateProduct}
                      onCreateProduct={code => setCreateProductSku(code)}
                    />
                  </div>
                </div>

                {/* 2. PANEL DE RESULTADOS DE ANÁLISIS Y VERIFICACIÓN DE STOCK POR DEPÓSITO */}
                {analysisDetails && (
                  <div className="analysis-verification-box modal-analysis-box">
                    <div className="analysis-verification-header">
                      <div className="analysis-header-title">
                        <Sparkles size={18} className="analysis-icon" />
                        <div>
                          <h3>Resultado del análisis y verificación de stock</h3>
                          <p>Revisá las existencias en cada depósito antes de despachar.</p>
                        </div>
                      </div>
                      <button
                        type="button"
                        className="button-ghost close-analysis-btn"
                        onClick={() => setAnalyzedProducts(null)}
                        title="Cerrar panel de análisis"
                      >
                        <X size={15} /> Cerrar
                      </button>
                    </div>

                    {analysisDetails.showAlert && (
                      <div className="analysis-alert-banner">
                        <AlertTriangle size={20} className="alert-icon-warning" />
                        <div>
                          <strong>¡Atención! Productos detectados en diferentes depósitos</strong>
                          <p>
                            {analysisDetails.hasCartConflict
                              ? `La venta actual está asociada a "${activeWarehouseName}", pero algunos de los productos analizados solo disponen de stock en otros depósitos.`
                              : "Los productos analizados tienen existencias distribuidas en diferentes depósitos. Cada venta debe despacharse desde un único depósito."}
                          </p>
                          <small>Seleccioná abajo desde qué depósito querés despachar cada ítem.</small>
                        </div>
                      </div>
                    )}

                    <div className="analysis-products-list">
                      {analysisDetails.items.map(prod => (
                        <div className="analysis-product-card" key={prod.id}>
                          <div className="analysis-product-info">
                            <div className="analysis-product-title">
                              <b>{prod.name}</b>
                              <span className="analysis-product-sku">SKU: {prod.sku}</span>
                            </div>
                            <div className="analysis-product-meta">
                              {prod.priceCents ? (
                                <span className="analysis-price">{money(prod.priceCents)}</span>
                              ) : null}
                              {prod.matchMethod && (
                                <span
                                  className={`analysis-match-evidence ${prod.reviewRequired ? "needs-review" : ""}`}
                                >
                                  {{
                                    barcode_ocr: "Barras + número impreso (OCR)",
                                    barcode: "Código de barras",
                                    ocr_code: "Número impreso (OCR)",
                                    ocr_name: "Texto del envase (OCR)",
                                  }[prod.matchMethod]}
                                  {prod.reviewRequired ? " · verificá el producto" : " · corroborado por OCR"}
                                </span>
                              )}
                              <span
                                className={`analysis-total-stock ${prod.totalQuantity > 0 ? "stock-ok" : "stock-zero"}`}
                              >
                                {prod.totalQuantity > 0
                                  ? `Total: ${prod.totalQuantity} u. en red`
                                  : "Sin stock disponible"}
                              </span>
                            </div>
                          </div>

                          <div className="analysis-warehouses-grid">
                            {prod.stocksByWarehouse.map(stockInfo => {
                              const isCurrentActive = activeWarehouseId === stockInfo.warehouseId;
                              const hasStock = stockInfo.quantity > 0;
                              const isMismatch = activeWarehouseId !== null && !isCurrentActive;

                              return (
                                <div
                                  key={stockInfo.warehouseId}
                                  className={`analysis-warehouse-pill ${hasStock ? "has-stock" : "no-stock"} ${isCurrentActive ? "active-warehouse" : ""}`}
                                >
                                  <div className="warehouse-pill-data">
                                    <Building2 size={14} />
                                    <div>
                                      <span className="warehouse-name">{stockInfo.warehouseName}</span>
                                      <span className="warehouse-qty">
                                        {hasStock
                                          ? `${stockInfo.quantity} u. disponibles`
                                          : "0 u. (Agotado)"}
                                      </span>
                                    </div>
                                  </div>

                                  <div className="warehouse-pill-action">
                                    {isMismatch ? (
                                      <button
                                        type="button"
                                        className="button-secondary button-xs"
                                        disabled={!hasStock}
                                        onClick={() =>
                                          stockInfo.inventoryItem && add(stockInfo.inventoryItem)
                                        }
                                        title={`Cambiar venta a ${stockInfo.warehouseName}`}
                                      >
                                        Vender desde aquí
                                      </button>
                                    ) : (
                                      <button
                                        type="button"
                                        className="button-primary button-xs"
                                        disabled={!hasStock}
                                        onClick={() =>
                                          addProductFromWarehouse(prod.id, stockInfo.warehouseId)
                                        }
                                      >
                                        <Plus size={12} /> {isCurrentActive ? "Agregar" : "Seleccionar"}
                                      </button>
                                    )}
                                  </div>
                                </div>
                              );
                            })}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* 3. SECCIÓN DE CATÁLOGO GENERAL Y AGREGADO MANUAL */}
                <div className="catalog-manual-section">
                  <div className="catalog-manual-header">
                    <div className="catalog-manual-title-group">
                      <Store size={16} />
                      <h4>Agregar productos manualmente</h4>
                    </div>
                    <span className="catalog-manual-count">
                      {shown.length} producto{shown.length === 1 ? "" : "s"} disponible{shown.length === 1 ? "" : "s"}
                    </span>
                  </div>

                  {/* Herramientas de búsqueda y filtros */}
                  <div className="new-sale-filters-bar">
                    <div className="filter-item-wrapper">
                      <ModernSelect
                        value={selectedWarehouseFilter}
                        onChange={setSelectedWarehouseFilter}
                        options={[
                          { value: "", label: "Todos los depósitos" },
                          ...warehouses.map(w => ({ value: w.id, label: w.name })),
                        ]}
                        icon={<WarehouseIcon size={14} />}
                        ariaLabel="Filtrar por depósito"
                        className="w-full"
                      />
                    </div>

                    <div className="filter-item-wrapper">
                      <ModernSelect
                        value={categoryFilter}
                        onChange={setCategoryFilter}
                        options={categories}
                        icon={<Filter size={14} />}
                        ariaLabel="Filtrar por categoría"
                        className="w-full"
                      />
                    </div>

                    <div className="new-sale-search-input">
                      <Search size={14} />
                      <input
                        value={query}
                        onChange={e => setQuery(e.target.value)}
                        placeholder="Buscar por producto o SKU..."
                        aria-label="Buscar producto"
                      />
                      {query && (
                        <button
                          type="button"
                          className="clear-search-btn"
                          onClick={() => setQuery("")}
                        >
                          <X size={12} />
                        </button>
                      )}
                    </div>
                  </div>

                  {/* Banner de depósito fijado */}
                  {activeWarehouseName && (
                    <div className="active-warehouse-indicator-bar compact">
                      <WarehouseIcon size={14} />
                      <span>
                        Venta fijada en: <b>{activeWarehouseName}</b> (todos los artículos deben pertenecer a este depósito).
                      </span>
                    </div>
                  )}

                  {/* Cuadrícula de productos disponibles */}
                  {shown.length ? (
                    <div className="new-sale-cards-grid">
                      {shown.map(item => {
                        const isMismatch =
                          activeWarehouseId !== null &&
                          activeWarehouseId !== item.warehouseId;
                        const inCart = cart.find(
                          l => l.inventoryId === item.inventoryId
                        );

                        return (
                          <div
                            key={item.inventoryId}
                            className={`new-sale-card ${isMismatch ? "is-mismatch" : ""} ${inCart ? "is-in-cart" : ""}`}
                            onClick={() => add(item)}
                          >
                            <div className="card-top">
                              <span className="card-glyph">
                                {item.productName.slice(0, 1)}
                              </span>
                              <div className="card-text">
                                <b className="card-title">{item.productName}</b>
                                <div className="card-tags">
                                  <span className="card-sku">{item.sku}</span>
                                  <span className="card-depot">{item.warehouseName}</span>
                                </div>
                              </div>
                            </div>

                            <div className="card-bottom">
                              <div className="card-pricing">
                                <span className="card-price">{money(item.priceCents)}</span>
                                <span className="card-stock">
                                  Disp: <b>{item.quantity} u.</b>
                                </span>
                              </div>

                              <button
                                type="button"
                                className={`card-add-btn ${inCart ? "btn-active" : ""}`}
                                onClick={e => {
                                  e.stopPropagation();
                                  add(item);
                                }}
                              >
                                <Plus size={13} />
                                {inCart ? `En venta (${inCart.cartQuantity})` : "Sumar"}
                              </button>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  ) : (
                    <EmptyState
                      title="No encontramos artículos con stock"
                      detail={
                        selectedWarehouseFilter
                          ? "El depósito seleccionado no tiene unidades disponibles que coincidan con la búsqueda."
                          : "Probá cambiar el filtro o la búsqueda."
                      }
                    />
                  )}
                </div>
              </div>

              {/* COLUMNA DERECHA: RESUMEN Y CARRITO */}
              <aside className="new-sale-cart-aside">
                <div className="cart-aside-header">
                  <div className="aside-title">
                    <ShoppingCart size={17} />
                    <h4>Comprobante de Venta</h4>
                  </div>
                  {cart.length > 0 && (
                    <span className="aside-count-badge">
                      {totalCartUnits} u. en {cart.length} ítem{cart.length === 1 ? "" : "s"}
                    </span>
                  )}
                </div>

                {/* Selector de Cliente */}
                <div className="cart-field-row">
                  <label className="field-label">Cliente (opcional)</label>
                  <ModernSelect
                    value={customerId}
                    onChange={setCustomerId}
                    options={[
                      { value: "", label: "Consumidor final / Mostrador" },
                      ...customers.map(c => ({
                        value: c.id,
                        label: c.name,
                      })),
                    ]}
                    ariaLabel="Cliente"
                    minWidth="100%"
                    className="w-full"
                  />
                </div>

                {/* Depósito activo */}
                {activeWarehouseName && (
                  <div className="cart-warehouse-badge">
                    <Store size={14} />
                    <span>
                      Despacho: <b>{activeWarehouseName}</b>
                    </span>
                  </div>
                )}

                {/* Lista de productos en el carrito */}
                <div className="cart-lines-container">
                  {cart.length ? (
                    <div className="cart-lines-scroll">
                      {cart.map(line => (
                        <SaleCartLine
                          key={line.inventoryId}
                          line={line}
                          onChangeQuantity={change}
                        />
                      ))}
                    </div>
                  ) : (
                    <div className="cart-empty-panel">
                      <PackagePlus size={26} />
                      <p>La venta está vacía</p>
                      <span>Hacé clic en "+ Sumar" sobre los productos para agregarlos.</span>
                    </div>
                  )}
                </div>

                {/* Totales y botón de confirmación */}
                <div className="cart-bottom-card">
                  <div className="cart-total-row">
                    <span className="total-title">Total a cobrar:</span>
                    <b className="total-amount">{money(computedTotal)}</b>
                  </div>

                  <div className="cart-actions-row">
                    <button
                      type="button"
                      className="button-secondary"
                      onClick={onClose}
                      disabled={pending}
                    >
                      Cancelar
                    </button>
                    <button
                      type="button"
                      className="button-primary sale-confirm-btn"
                      onClick={confirmSale}
                      disabled={pending || !cart.length}
                    >
                      {pending ? (
                        <>
                          <div className="spinner-sm" /> Confirmando...
                        </>
                      ) : (
                        <>
                          <CheckCircle2 size={16} /> Confirmar venta
                        </>
                      )}
                    </button>
                  </div>

                  <p className="cart-legal-hint">
                    <ReceiptText size={13} />
                    Descuenta stock automáticamente del depósito asignado.
                  </p>
                </div>
              </aside>
            </div>
          )}
        </div>

        {/* MODAL PARA CAMBIO DE DEPÓSITO CUANDO EL CARRITO YA TIENE ARTÍCULOS */}
        <AlertDialog
          open={Boolean(switchWarehouseConfirm)}
          onOpenChange={open => {
            if (!open) setSwitchWarehouseConfirm(null);
          }}
        >
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>¿Cambiar de depósito?</AlertDialogTitle>
              <AlertDialogDescription>
                La venta actual contiene artículos despachados desde{" "}
                <strong>"{activeWarehouseName}"</strong>.
                <br />
                <br />
                Para agregar{" "}
                <strong>"{switchWarehouseConfirm?.item.productName}"</strong>{" "}
                desde{" "}
                <strong>"{switchWarehouseConfirm?.targetWarehouseName}"</strong>,
                se vaciará el comprobante actual ya que cada venta debe procesarse
                desde un único depósito.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel onClick={() => setSwitchWarehouseConfirm(null)}>
                Cancelar
              </AlertDialogCancel>
              <AlertDialogAction onClick={confirmSwitchWarehouse}>
                Vaciar e iniciar en {switchWarehouseConfirm?.targetWarehouseName}
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
        {/* ALTA DE PRODUCTO CON SKU PRECARGADO DESDE RECONOCIMIENTO */}
        {createProductSku && (
          <ProductModal
            editId={null}
            initialSku={createProductSku}
            onClose={() => setCreateProductSku(null)}
            onSuccess={() => {
              setCreateProductSku(null);
              load();
            }}
          />
        )}
      </div>
    </div>
  );
}
