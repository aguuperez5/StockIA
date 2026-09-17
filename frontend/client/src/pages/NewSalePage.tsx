import { CheckCircle2, Minus, PackagePlus, Plus, ReceiptText, ShoppingCart, Trash2, Warehouse as WarehouseIcon } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { useLocation } from "wouter";
import { EmptyState, ErrorPanel, LoadingPanel, PageHeader, money } from "@/components/StockUI";
import PhotoCapture from "@/components/PhotoCapture";
import { inventoryService, warehouseService, type InventoryItem, type Warehouse } from "@/services/inventory";
import { saleService } from "@/services/sales";
import { customerService, type Customer } from "@/services/backlog";

type CartLine = InventoryItem & { cartQuantity: number };

export default function NewSalePage() {
  const [, setLocation] = useLocation();
  const [available, setAvailable] = useState<InventoryItem[]>([]);
  const [warehouses, setWarehouses] = useState<Warehouse[]>([]);
  const [warehouseId, setWarehouseId] = useState("");
  const [cart, setCart] = useState<CartLine[]>([]);
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [customerId, setCustomerId] = useState("");
  const [query, setQuery] = useState("");
  const [photo, setPhoto] = useState<{ data: string; mimeType: string }>();
  const [loading, setLoading] = useState(true);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState("");

  const load = () => {
    setLoading(true);
    setError("");
    Promise.all([inventoryService.list(), customerService.list(), warehouseService.list()])
      .then(([inventoryResult, customerResult, warehouseResult]) => {
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

  const activeWarehouseId = cart.length > 0 ? String(cart[0].warehouseId) : warehouseId;

  const shown = useMemo(() => {
    return available.filter(item => {
      const matchesWarehouse = activeWarehouseId ? String(item.warehouseId) === activeWarehouseId : true;
      const matchesQuery = `${item.productName} ${item.sku} ${item.warehouseName}`.toLowerCase().includes(query.toLowerCase());
      return matchesWarehouse && matchesQuery;
    });
  }, [available, query, activeWarehouseId]);

  const add = (item: InventoryItem) => {
    if (cart.length > 0 && cart[0].warehouseId !== item.warehouseId) {
      setError(`Esta venta corresponde al depósito "${cart[0].warehouseName}". Una venta debe ser despachada desde un único depósito.`);
      return;
    }
    setError("");
    if (!warehouseId) setWarehouseId(String(item.warehouseId));
    setCart(current => {
      const present = current.find(line => line.inventoryId === item.inventoryId);
      if (present) {
        return current.map(line =>
          line.inventoryId === item.inventoryId
            ? { ...line, cartQuantity: Math.min(line.quantity, line.cartQuantity + 1) }
            : line
        );
      }
      return [...current, { ...item, cartQuantity: 1 }];
    });
  };

  const addDetected = (productId: number) => {
    const item = available.find(candidate => candidate.productId === productId && (!activeWarehouseId || String(candidate.warehouseId) === activeWarehouseId));
    if (item) add(item);
  };

  const change = (inventoryId: number, next: number) => {
    setCart(current => {
      const nextCart = current.flatMap(line =>
        line.inventoryId === inventoryId
          ? next <= 0
            ? []
            : [{ ...line, cartQuantity: Math.min(line.quantity, next) }]
          : [line]
      );
      if (!nextCart.length) setError("");
      return nextCart;
    });
  };

  const computedTotal = cart.reduce((sum, line) => sum + line.priceCents * line.cartQuantity, 0);

  const confirm = async () => {
    if (!cart.length) {
      setError("Agregá al menos un producto para registrar la venta.");
      return;
    }
    setPending(true);
    setError("");
    try {
      const result = await saleService.create(
        cart.map(line => ({ productId: line.productId, warehouseId: line.warehouseId, quantity: line.cartQuantity })),
        customerId ? Number(customerId) : undefined,
        photo
      );
      setLocation(`/sales/${result.sale.id}/ticket`);
    } catch (reason) {
      const message = (reason as Error).message;
      console.error("[Nueva venta] No se pudo confirmar:", message);
      load();
      setError(message);
      window.setTimeout(() => document.querySelector(".error-panel")?.scrollIntoView({ behavior: "smooth", block: "center" }), 80);
    } finally {
      setPending(false);
    }
  };

  return (
    <>
      <PageHeader
        eyebrow="Operación comercial"
        title="Nueva venta"
        description="Cargá artículos manualmente o por foto y asociá un cliente si corresponde."
      />
      {error && <ErrorPanel message={error} retry={load} title="No se pudo completar esta venta" />}
      {loading && <LoadingPanel rows={5} />}
      {!loading && (
        <section className="sale-layout">
          <div className="catalog-panel">
            <PhotoCapture
              onPhoto={(data, mimeType) => setPhoto({ data, mimeType })}
              onDetected={items => items.forEach(item => addDetected(item.id))}
            />
            <div className="catalog-heading">
              <div>
                <h2>Agregar productos</h2>
                <p>
                  {cart.length > 0
                    ? `Despacho asignado a: ${cart[0].warehouseName}`
                    : "Disponibles según cada depósito."}
                </p>
              </div>
              <div style={{ display: "flex", gap: "0.5rem", alignItems: "center", flexWrap: "wrap" }}>
                <select
                  value={activeWarehouseId}
                  onChange={e => {
                    const nextId = e.target.value;
                    if (cart.length > 0 && nextId && nextId !== String(cart[0].warehouseId)) {
                      if (!window.confirm("Cambiar de depósito vaciará los artículos seleccionados en el comprobante actual. ¿Continuar?")) return;
                      setCart([]);
                    }
                    setWarehouseId(nextId);
                  }}
                  style={{ padding: "0.4rem 0.6rem", borderRadius: "6px", border: "1px solid var(--border, #d0d7d5)", fontSize: "0.875rem" }}
                  aria-label="Filtrar por depósito"
                >
                  <option value="">Todos los depósitos</option>
                  {warehouses.map(w => (
                    <option key={w.id} value={w.id}>
                      {w.name}
                    </option>
                  ))}
                </select>
                <label className="sale-search">
                  <span>⌕</span>
                  <input value={query} onChange={e => setQuery(e.target.value)} placeholder="Buscar artículo o SKU" />
                </label>
              </div>
            </div>
            {shown.length ? (
              <div className="sale-catalog">
                {shown.map(item => (
                  <button key={item.inventoryId} className="catalog-product" onClick={() => add(item)} type="button">
                    <span className="product-glyph">{item.productName.slice(0, 1)}</span>
                    <div>
                      <b>{item.productName}</b>
                      <small>
                        {item.sku} · {item.warehouseName}
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
                  activeWarehouseId
                    ? "No hay artículos disponibles con ese criterio en el depósito seleccionado."
                    : "Probá otra búsqueda o revisá el stock disponible."
                }
              />
            )}
          </div>
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
            <label className="field">
              <span>Cliente (opcional)</span>
              <select value={customerId} onChange={e => setCustomerId(e.target.value)}>
                <option value="">Venta mostrador</option>
                {customers.map(customer => (
                  <option key={customer.id} value={customer.id}>
                    {customer.name}
                  </option>
                ))}
              </select>
              {!loading && !customers.length && (
                <small className="field-hint">Todavía no hay clientes: registralos en la sección Clientes para asociarlos.</small>
              )}
            </label>
            {cart.length ? (
              <div className="cart-lines">
                {cart.map(line => (
                  <div className="cart-line" key={line.inventoryId}>
                    <div>
                      <b>{line.productName}</b>
                      <small>
                        {line.warehouseName} · {money(line.priceCents)} c/u
                      </small>
                    </div>
                    <button className="remove-line" onClick={() => change(line.inventoryId, 0)} aria-label={`Quitar ${line.productName}`}>
                      <Trash2 size={15} />
                    </button>
                    <div className="line-bottom">
                      <div className="quantity-stepper">
                        <button onClick={() => change(line.inventoryId, line.cartQuantity - 1)}>
                          <Minus size={13} />
                        </button>
                        <span>{line.cartQuantity}</span>
                        <button
                          disabled={line.cartQuantity >= line.quantity}
                          onClick={() => change(line.inventoryId, line.cartQuantity + 1)}
                        >
                          <Plus size={13} />
                        </button>
                      </div>
                      <strong>{money(line.priceCents * line.cartQuantity)}</strong>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="cart-empty">
                <PackagePlus size={25} />
                <p>La venta todavía está vacía.</p>
                <small>Elegí productos de la lista para armar el comprobante.</small>
              </div>
            )}
            <div className="ticket-total">
              <span>Total estimado</span>
              <b>{money(computedTotal)}</b>
            </div>
            <button className="button-primary sale-confirm" onClick={confirm} disabled={pending || !cart.length}>
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
              El backend aplica el tramo de precio correspondiente y actualiza el stock.
            </p>
          </aside>
        </section>
      )}
    </>
  );
}
