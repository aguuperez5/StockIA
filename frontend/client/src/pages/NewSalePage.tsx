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
import { useLocation } from "wouter";
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
import {
  EmptyState,
  ErrorPanel,
  LoadingPanel,
  PageHeader,
  money,
} from "@/components/StockUI";
import PhotoCapture, { type DetectedProduct } from "@/components/PhotoCapture";
import {
  inventoryService,
  warehouseService,
  type InventoryItem,
  type Warehouse,
} from "@/services/inventory";
import { saleService } from "@/services/sales";
import { customerService, type Customer } from "@/services/backlog";
import { SaleCartLine, type CartLine } from "@/components/sales/SaleCartLine";

export default function NewSalePage() {
  const [, setLocation] = useLocation();
  const [allInventory, setAllInventory] = useState<InventoryItem[]>([]);
  const [available, setAvailable] = useState<InventoryItem[]>([]);
  const [warehouses, setWarehouses] = useState<Warehouse[]>([]);
  const [cart, setCart] = useState<CartLine[]>([]);
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [customerId, setCustomerId] = useState("");
  const [query, setQuery] = useState("");
  const [selectedWarehouseFilter, setSelectedWarehouseFilter] =
    useState<string>("");
  const [categoryFilter, setCategoryFilter] = useState<string>("Todas");
  const [photo, setPhoto] = useState<{ data: string; mimeType: string }>();
  const [loading, setLoading] = useState(true);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState("");

  // Estado para el panel de análisis y verificación de stock
  const [analyzedProducts, setAnalyzedProducts] = useState<
    DetectedProduct[] | null
  >(null);
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
  }, []);

  // Categorías disponibles sin blancos ni duplicados
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
        return current.map(line =>
          line.inventoryId === item.inventoryId
            ? {
                ...line,
                cartQuantity: Math.min(line.quantity, line.cartQuantity + 1),
              }
            : line
        );
      }
      return [...current, { ...item, cartQuantity: 1 }];
    });
  };

  // Confirmar cambio de depósito vaciando el carrito
  const confirmSwitchWarehouse = () => {
    if (!switchWarehouseConfirm) return;
    const { item } = switchWarehouseConfirm;
    setCart([{ ...item, cartQuantity: 1 }]);
    setSwitchWarehouseConfirm(null);
    toast.info(
      `Se cambió el depósito a "${item.warehouseName}" y se reinició la venta.`
    );
  };

  // Modificar cantidad o quitar línea
  const change = (inventoryId: number, next: number) =>
    setCart(current =>
      current.flatMap(line =>
        line.inventoryId === inventoryId
          ? next <= 0
            ? []
            : [{ ...line, cartQuantity: Math.min(line.quantity, next) }]
          : [line]
      )
    );

  const computedTotal = cart.reduce(
    (sum, line) => sum + line.priceCents * line.cartQuantity,
    0
  );

  // Manejo de productos detectados por el análisis
  const handleDetected = (items: DetectedProduct[]) => {
    setAnalyzedProducts(items);
    if (!items.length) {
      toast.info("No se encontraron productos coincidentes en el catálogo.");
      return;
    }
    toast.success(`Se analizaron ${items.length} producto(s) en el catálogo.`);
  };

  // Agregar un producto analizado seleccionando un depósito específico
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

    // Para cada producto analizado, obtener las existencias por depósito
    const itemsWithStocks = analyzedProducts.map(prod => {
      const stocksByWarehouse = warehouses.map(w => {
        // Buscar en el inventario cargado
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

    // Determinar si hay alerta de diferentes depósitos
    // 1. Algún producto tiene stock en más de un depósito
    // 2. O los productos analizados tienen stock en depósitos distintos entre sí
    // 3. O hay un depósito activo en el carrito y los productos analizados no tienen stock en ese depósito activo
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
          item.stocksByWarehouse.find(s => s.warehouseId === activeWarehouseId)
            ?.quantity === 0 && item.totalQuantity > 0
      );

    const showAlert = hasDifferentWarehouses || hasCartConflict;

    return {
      items: itemsWithStocks,
      showAlert,
      hasDifferentWarehouses,
      hasCartConflict,
      allWarehousesWithAnyStock: Array.from(allWarehousesWithAnyStock),
    };
  }, [analyzedProducts, warehouses, allInventory, activeWarehouseId]);

  const confirm = async () => {
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
      setLocation(`/sales/${result.sale.id}/ticket`);
    } catch (reason) {
      const message = reason instanceof Error ? reason.message : String(reason);
      load();
      setError(message);
      window.setTimeout(
        () =>
          document
            .querySelector(".error-panel")
            ?.scrollIntoView({ behavior: "smooth", block: "center" }),
        80
      );
    } finally {
      setPending(false);
    }
  };

  return (
    <>
      <PageHeader
        eyebrow="Operación comercial"
        title="Nueva venta"
        description="Analizá productos por foto o búsqueda, verificá stock por depósito y confirmá la venta."
      />

      {error && <ErrorPanel message={error} retry={load} />}
      {loading && <LoadingPanel rows={5} />}

      {!loading && (
        <section className="sale-layout">
          <div className="catalog-panel">
            {/* Módulo de captura y análisis por foto o texto */}
            <PhotoCapture
              onPhoto={(data, mimeType) => setPhoto({ data, mimeType })}
              onDetected={handleDetected}
            />

            {/* PANEL DE RESULTADOS DE ANÁLISIS Y VERIFICACIÓN DE STOCK */}
            {analysisDetails && (
              <div className="analysis-verification-box">
                <div className="analysis-verification-header">
                  <div className="analysis-header-title">
                    <Sparkles size={18} className="analysis-icon" />
                    <div>
                      <h3>Resultado del análisis y verificación de stock</h3>
                      <p>
                        Revisá las existencias en cada depósito antes de
                        despachar.
                      </p>
                    </div>
                  </div>
                  <button
                    type="button"
                    className="button-ghost close-analysis-btn"
                    onClick={() => setAnalyzedProducts(null)}
                    title="Cerrar panel de análisis"
                  >
                    <X size={16} /> Cerrar
                  </button>
                </div>

                {/* ALERTA VISUAL DESTACADA SI HAY PRODUCTOS EN DIFERENTES DEPÓSITOS */}
                {analysisDetails.showAlert && (
                  <div className="analysis-alert-banner">
                    <AlertTriangle size={22} className="alert-icon-warning" />
                    <div>
                      <strong>
                        ¡Atención! Productos detectados en diferentes depósitos
                      </strong>
                      <p>
                        {analysisDetails.hasCartConflict
                          ? `La venta actual está asociada a "${activeWarehouseName}", pero algunos de los productos analizados solo disponen de stock en otros depósitos.`
                          : "Los productos analizados tienen existencias distribuidas en diferentes depósitos. Recordá que por regla del sistema cada venta debe despacharse desde un único depósito."}
                      </p>
                      <small>
                        Seleccioná abajo desde qué depósito querés despachar
                        cada ítem.
                      </small>
                    </div>
                  </div>
                )}

                {/* LISTADO DE PRODUCTOS ANALIZADOS Y VERIFICACIÓN POR DEPÓSITO */}
                <div className="analysis-products-list">
                  {analysisDetails.items.map(prod => (
                    <div className="analysis-product-card" key={prod.id}>
                      <div className="analysis-product-info">
                        <div className="analysis-product-title">
                          <b>{prod.name}</b>
                          <span className="analysis-product-sku">
                            SKU: {prod.sku}
                          </span>
                        </div>
                        <div className="analysis-product-meta">
                          {prod.priceCents ? (
                            <span className="analysis-price">
                              {money(prod.priceCents)}
                            </span>
                          ) : null}
                          {prod.matchMethod && (
                            <span
                              className={`analysis-match-evidence ${prod.reviewRequired ? "needs-review" : ""}`}
                            >
                              {
                                {
                                  barcode_ocr: "Código + OCR",
                                  barcode: "Código de barras",
                                  ocr_code: "Código leído",
                                  ocr_name: "Nombre leído",
                                }[prod.matchMethod]
                              }
                              {prod.reviewRequired
                                ? " · verificá el producto"
                                : " · corroborado por OCR"}
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

                      {/* Desglose de stock en cada depósito */}
                      <div className="analysis-warehouses-grid">
                        {prod.stocksByWarehouse.map(stockInfo => {
                          const isCurrentActive =
                            activeWarehouseId === stockInfo.warehouseId;
                          const hasStock = stockInfo.quantity > 0;
                          const isMismatch =
                            activeWarehouseId !== null && !isCurrentActive;

                          return (
                            <div
                              key={stockInfo.warehouseId}
                              className={`analysis-warehouse-pill ${hasStock ? "has-stock" : "no-stock"} ${isCurrentActive ? "active-warehouse" : ""}`}
                            >
                              <div className="warehouse-pill-data">
                                <Building2 size={14} />
                                <div>
                                  <span className="warehouse-name">
                                    {stockInfo.warehouseName}
                                  </span>
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
                                      stockInfo.inventoryItem &&
                                      add(stockInfo.inventoryItem)
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
                                      addProductFromWarehouse(
                                        prod.id,
                                        stockInfo.warehouseId
                                      )
                                    }
                                  >
                                    <Plus size={12} />{" "}
                                    {isCurrentActive
                                      ? "Agregar"
                                      : "Seleccionar"}
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

            {/* SECCIÓN DE CATÁLOGO GENERAL Y FILTROS */}
            <div className="catalog-heading">
              <div>
                <h2>Catálogo de productos</h2>
                <p>
                  {activeWarehouseName
                    ? `Venta activa desde: ${activeWarehouseName}`
                    : "Elegí artículos del listado para armar la venta."}
                </p>
              </div>

              <div className="catalog-filters-row">
                <ModernSelect
                  value={selectedWarehouseFilter}
                  onChange={setSelectedWarehouseFilter}
                  options={[
                    { value: "", label: "Todos los depósitos" },
                    ...warehouses.map(w => ({ value: w.id, label: w.name })),
                  ]}
                  icon={<WarehouseIcon size={14} />}
                  ariaLabel="Filtrar por depósito"
                />

                <ModernSelect
                  value={categoryFilter}
                  onChange={setCategoryFilter}
                  options={categories}
                  icon={<Filter size={14} />}
                  ariaLabel="Filtrar por categoría"
                />

                <label className="sale-search">
                  <Search size={14} />
                  <input
                    value={query}
                    onChange={e => setQuery(e.target.value)}
                    placeholder="Buscar artículo o SKU"
                    aria-label="Buscar producto"
                  />
                </label>

                {(query ||
                  selectedWarehouseFilter ||
                  categoryFilter !== "Todas") && (
                  <button
                    type="button"
                    className="button-secondary"
                    style={{
                      minHeight: "38px",
                      height: "38px",
                      padding: "0 10px",
                      fontSize: "11px",
                      gap: "4px",
                    }}
                    onClick={() => {
                      setQuery("");
                      setSelectedWarehouseFilter("");
                      setCategoryFilter("Todas");
                    }}
                  >
                    <X size={13} /> Limpiar
                  </button>
                )}
              </div>
            </div>

            {/* AVISO DE DEPÓSITO FIJADO EN CARRITO */}
            {activeWarehouseName && (
              <div className="active-warehouse-indicator-bar">
                <WarehouseIcon size={15} />
                <span>
                  Depósito fijado: <b>{activeWarehouseName}</b>. Todos los
                  artículos del comprobante deben ser de este depósito.
                </span>
              </div>
            )}

            {shown.length ? (
              <div className="sale-catalog">
                {shown.map(item => (
                  <button
                    key={item.inventoryId}
                    className={`catalog-product ${activeWarehouseId && activeWarehouseId !== item.warehouseId ? "item-other-warehouse" : ""}`}
                    onClick={() => add(item)}
                    type="button"
                  >
                    <span className="product-glyph">
                      {item.productName.slice(0, 1)}
                    </span>
                    <div>
                      <b>{item.productName}</b>
                      <small>
                        {item.sku} ·{" "}
                        <span className="item-depot-tag">
                          {item.warehouseName}
                        </span>
                      </small>
                    </div>
                    <strong>{item.quantity} u.</strong>
                    <Plus size={16} />
                  </button>
                ))}
              </div>
            ) : (
              <EmptyState
                title="No encontramos artículos"
                detail={
                  selectedWarehouseFilter
                    ? "No hay productos con stock en el depósito seleccionado para esta búsqueda."
                    : "Probá otra búsqueda o revisá el stock disponible."
                }
              />
            )}
          </div>

          {/* ASIDE DEL DETALLE DE VENTA / CARRITO */}
          <aside className="sale-summary">
            <div className="summary-head">
              <span>
                <ShoppingCart size={19} />
              </span>
              <div>
                <p className="eyebrow">Comprobante</p>
                <h2>Detalle de venta</h2>
              </div>
            </div>

            {activeWarehouseName && (
              <div className="cart-warehouse-badge">
                <Store size={14} />
                <span>
                  Despacho: <b>{activeWarehouseName}</b>
                </span>
              </div>
            )}

            <label className="field">
              <span>Cliente (opcional)</span>
              <ModernSelect
                value={customerId}
                onChange={setCustomerId}
                options={[
                  { value: "", label: "Venta mostrador" },
                  ...customers.map(customer => ({
                    value: customer.id,
                    label: customer.name,
                  })),
                ]}
                ariaLabel="Cliente"
                minWidth="100%"
                className="w-full"
              />
              {!loading && !customers.length && (
                <small className="field-hint">
                  Todavía no hay clientes: registralos en la sección Clientes
                  para asociarlos.
                </small>
              )}
            </label>

            {cart.length ? (
              <div className="cart-lines">
                {cart.map(line => (
                  <SaleCartLine
                    key={line.inventoryId}
                    line={line}
                    onChangeQuantity={change}
                  />
                ))}
              </div>
            ) : (
              <div className="cart-empty">
                <PackagePlus size={25} />
                <p>La venta todavía está vacía.</p>
                <small>
                  Elegí productos del catálogo o del panel de análisis para
                  armar el comprobante.
                </small>
              </div>
            )}

            <div className="ticket-total">
              <span>Total estimado</span>
              <b>{money(computedTotal)}</b>
            </div>

            <button
              type="button"
              className="button-primary sale-confirm"
              onClick={confirm}
              disabled={pending || !cart.length}
            >
              {pending ? (
                "Confirmando venta…"
              ) : (
                <>
                  <CheckCircle2 size={17} />
                  Confirmar venta
                </>
              )}
            </button>

            <p className="sale-note">
              <ReceiptText size={14} />
              El backend aplica el tramo de precio correspondiente y descuenta
              el stock en el depósito asignado.
            </p>
          </aside>
        </section>
      )}

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
    </>
  );
}
