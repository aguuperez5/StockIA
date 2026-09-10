import { Edit3, PackagePlus, RotateCcw, Search, SlidersHorizontal, Trash2 } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { useLocation } from "wouter";
import { toast } from "sonner";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { EmptyState, ErrorPanel, LoadingPanel, PageHeader, money, StockBadge } from "@/components/StockUI";
import { productService, type Product } from "@/services/products";
import { useStockAuth } from "@/contexts/StockAuthContext";

export default function ProductsPage() {
  const [, setLocation] = useLocation();
  const { user } = useStockAuth();
  const canManage = user?.appRole === "administrador";
  const [items, setItems] = useState<Product[]>([]);
  const [search, setSearch] = useState("");
  const [category, setCategory] = useState("Todas");
  const [showInactive, setShowInactive] = useState(false);
  const reactivate = async (item: Product) => {
    try { await productService.setActive(item.id, true); toast.success(`"${item.name}" reactivado.`); load(); }
    catch (reason) { setError((reason as Error).message); }
  };
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);
  const [toDelete, setToDelete] = useState<Product | null>(null);
  const [deleting, setDeleting] = useState(false);
  const confirmDelete = async () => {
    if (!toDelete) return;
    setDeleting(true);
    try {
      await productService.remove(toDelete.id);
      toast.success(`"${toDelete.name}" dado de baja.`);
      setToDelete(null);
      load();
    } catch (reason) { setError((reason as Error).message); setToDelete(null); }
    finally { setDeleting(false); }
  };
  const categories = useMemo(() => ["Todas", ...Array.from(new Set(items.map(item => item.category))).sort()], [items]);
  const load = () => { setLoading(true); setError(""); productService.list(search, category, showInactive).then(result => setItems(result.items)).catch((reason: Error) => setError(reason.message)).finally(() => setLoading(false)); };
  useEffect(() => { const timer = window.setTimeout(load, 220); return () => window.clearTimeout(timer); }, [search, category, showInactive]);
  return <>
    <PageHeader eyebrow="Catálogo" title="Productos" description="Consultá precios, SKU y disponibilidad. Cada movimiento queda registrado en el inventario." action={canManage ? <button className="button-primary" onClick={() => setLocation("/products/new")}><PackagePlus size={17} />Nuevo producto</button> : undefined} />
    <section className="filter-bar"><label className="search-control"><Search size={17} /><input value={search} onChange={event => setSearch(event.target.value)} placeholder="Buscar por nombre o SKU" aria-label="Buscar productos" /></label><label className="select-control"><SlidersHorizontal size={16} /><select value={category} onChange={event => setCategory(event.target.value)} aria-label="Filtrar por categoría">{categories.map(option => <option key={option}>{option}</option>)}</select></label>{canManage && <label className="check-control"><input type="checkbox" checked={showInactive} onChange={event => setShowInactive(event.target.checked)} />Ver dados de baja</label>}</section>
    {loading && <LoadingPanel rows={6} />}{error && <ErrorPanel message={error} retry={load} />}
    {!loading && !error && (items.length ? <section className="table-card"><div className="table-scroll"><table><thead><tr><th>Producto</th><th>Categoría</th><th>Precio</th><th>Stock total</th><th>Estado</th><th aria-label="Acciones" /></tr></thead><tbody>{items.map(item => <tr key={item.id}><td><div className="product-cell">{item.imageUrl ? <img src={item.imageUrl} alt="" className="product-thumb" loading="lazy" onError={e => { (e.target as HTMLImageElement).style.display = "none"; }} /> : <span className="product-glyph">{item.name.slice(0, 1).toUpperCase()}</span>}<div><b>{item.name}</b><small>{item.sku}</small></div></div></td><td><span className="category-tag">{item.category}</span></td><td className="mono">{money(item.priceCents)}</td><td><b>{item.stock} u.</b><small>Mínimo: {item.lowStockThreshold}</small></td><td>{item.active ? <StockBadge quantity={item.stock} threshold={item.lowStockThreshold} /> : <span className="status-pill inactive">Dado de baja</span>}</td><td>{canManage && (item.active ? <span className="row-actions"><button className="icon-button" onClick={() => setLocation(`/products/${item.id}/edit`)} aria-label={`Editar ${item.name}`}><Edit3 size={16} /></button><button className="icon-button danger" onClick={() => setToDelete(item)} aria-label={`Dar de baja ${item.name}`}><Trash2 size={16} /></button></span> : <button className="icon-button" onClick={() => void reactivate(item)} aria-label={`Reactivar ${item.name}`} title="Reactivar"><RotateCcw size={16} /></button>)}</td></tr>)}</tbody></table></div><footer className="table-footer">{items.length} producto{items.length === 1 ? "" : "s"} encontrado{items.length === 1 ? "" : "s"}</footer></section> : <EmptyState title="Todavía no cargaste productos" detail="Incorporá tu primer artículo para empezar a gestionar el inventario." action={canManage ? <button className="button-primary" onClick={() => setLocation("/products/new")}>Incorporar producto</button> : undefined} />)}
    <AlertDialog open={!!toDelete} onOpenChange={open => { if (!open) setToDelete(null); }}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Dar de baja "{toDelete?.name}"</AlertDialogTitle>
          <AlertDialogDescription>El producto dejará de aparecer en el catálogo y no se podrá vender, pero se conserva en el historial de ventas y movimientos. {toDelete && toDelete.stock > 0 ? "Tiene stock cargado: primero debe quedar en cero." : "Podés reactivarlo cuando quieras con “Ver dados de baja”."}</AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel disabled={deleting}>Cancelar</AlertDialogCancel>
          <AlertDialogAction onClick={event => { event.preventDefault(); void confirmDelete(); }} disabled={deleting} className="bg-red-700 hover:bg-red-800">{deleting ? "Dando de baja…" : "Dar de baja"}</AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  </>;
}
