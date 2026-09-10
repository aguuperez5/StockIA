import { Minus, Plus, Trash2 } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { useLocation } from "wouter";
import { toast } from "sonner";
import PhotoCapture from "@/components/PhotoCapture";
import { EmptyState, ErrorPanel, PageHeader, SubmitButton } from "@/components/StockUI";
import { inventoryService, warehouseService, type InventoryItem, type Warehouse } from "@/services/inventory";
import { transferService } from "@/services/backlog";

export default function NewTransferPage() {
  const [, setLocation] = useLocation();
  const [warehouses, setWarehouses] = useState<Warehouse[]>([]);
  const [items, setItems] = useState<InventoryItem[]>([]);
  const [origin, setOrigin] = useState("");
  const [destination, setDestination] = useState("");
  const [selected, setSelected] = useState<Record<number, number>>({});
  const [photo, setPhoto] = useState<{ data: string; mimeType: string }>();
  const [error, setError] = useState("");
  const [pending, setPending] = useState(false);
  useEffect(() => { Promise.all([warehouseService.list(), inventoryService.list()]).then(([w, i]) => { setWarehouses(w.items); setItems(i.items); }).catch(e => setError(e.message)); }, []);
  const candidates = items.filter(i => String(i.warehouseId) === origin && i.quantity > 0);
  const availableOf = (productId: number) => candidates.find(i => i.productId === productId)?.quantity ?? 0;
  const changeOrigin = (value: string) => { setOrigin(value); setSelected({}); };
  const add = (item: InventoryItem) => setSelected(s => ({ ...s, [item.productId]: Math.min(item.quantity, (s[item.productId] ?? 0) + 1) }));
  const step = (productId: number, delta: number) => setSelected(s => {
    const next = Math.max(0, Math.min(availableOf(productId), (s[productId] ?? 0) + delta));
    if (next === 0) { const { [productId]: _drop, ...rest } = s; return rest; }
    return { ...s, [productId]: next };
  });
  const chosen = useMemo(() => Object.entries(selected).map(([productId, quantity]) => ({ productId: Number(productId), quantity, name: candidates.find(i => i.productId === Number(productId))?.productName ?? `Producto ${productId}` })), [selected, candidates]);
  const totalUnits = chosen.reduce((n, l) => n + l.quantity, 0);
  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!origin || !destination || origin === destination) { setError("Elegí dos depósitos distintos."); return; }
    const payload = chosen.map(({ productId, quantity }) => ({ productId, quantity }));
    if (!payload.length) { setError("Agregá al menos un producto."); return; }
    setPending(true); setError("");
    try {
      const result = await transferService.create({ originWarehouseId: Number(origin), destinationWarehouseId: Number(destination), items: payload, photo });
      toast.success(`Remito ${result.transfer.receiptNumber} confirmado.`);
      setLocation(`/transfers/${result.transfer.id}/receipt`);
    } catch (e) { setError((e as Error).message); }
    finally { setPending(false); }
  };
  return <>
    <PageHeader eyebrow="Logística" title="Nueva transferencia" description="Generá un remito y mové mercadería de forma transaccional entre depósitos." />
    {error && <ErrorPanel message={error} />}
    <form className="form-card" onSubmit={submit}>
      <div className="form-section"><div className="form-grid two">
        <label className="field"><span>Depósito de origen</span><select value={origin} onChange={e => changeOrigin(e.target.value)}><option value="">Seleccioná</option>{warehouses.map(w => <option key={w.id} value={w.id}>{w.name}</option>)}</select></label>
        <label className="field"><span>Depósito de destino</span><select value={destination} onChange={e => setDestination(e.target.value)}><option value="">Seleccioná</option>{warehouses.filter(w => String(w.id) !== origin).map(w => <option key={w.id} value={w.id}>{w.name}</option>)}</select></label>
      </div></div>
      <PhotoCapture onPhoto={(data, mimeType) => setPhoto({ data, mimeType })} onDetected={detected => detected.forEach(p => { const stock = candidates.find(i => i.productId === p.id); if (stock) add(stock); })} />
      <div className="form-section">
        <div className="form-section-title"><div><h2>Carga manual</h2><p>{origin ? "Tocá un artículo para sumarlo; ajustá cantidades con + y −." : "Primero elegí el depósito de origen."}</p></div></div>
        {!origin ? <EmptyState title="Sin origen seleccionado" detail="Elegí desde qué depósito sale la mercadería para ver el stock disponible." /> : candidates.length ? <div className="sale-catalog">{candidates.map(item => {
          const qty = selected[item.productId] ?? 0;
          return <div className="catalog-product transfer-line" key={item.productId}>
            <button type="button" className="transfer-add" onClick={() => add(item)} aria-label={`Agregar ${item.productName}`}><span className="product-glyph">{item.productName[0]}</span><span><b>{item.productName}</b><small>{item.sku} · disponible: {item.quantity}</small></span><Plus size={16} /></button>
            {qty > 0 && <span className="quantity-stepper"><button type="button" onClick={() => step(item.productId, -1)} aria-label={`Quitar uno de ${item.productName}`}><Minus size={13} /></button><span>{qty}</span><button type="button" disabled={qty >= item.quantity} onClick={() => step(item.productId, 1)} aria-label={`Agregar uno de ${item.productName}`}><Plus size={13} /></button><button type="button" className="remove-line" onClick={() => step(item.productId, -qty)} aria-label={`Quitar ${item.productName}`}><Trash2 size={15} /></button></span>}
          </div>;
        })}</div> : <EmptyState title="Sin stock en este depósito" detail="El origen elegido no tiene existencias para mover." />}
      </div>
      {chosen.length > 0 && <div className="form-section transfer-summary"><h2>Resumen del remito</h2><p>{totalUnits} unidad{totalUnits === 1 ? "" : "es"} · {chosen.length} artículo{chosen.length === 1 ? "" : "s"}</p></div>}
      <div className="form-actions"><button type="button" className="button-secondary" onClick={() => setLocation("/transfers")}>Cancelar</button><SubmitButton pending={pending}>Confirmar transferencia</SubmitButton></div>
    </form>
  </>;
}
