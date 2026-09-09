import { Edit3, PackagePlus, Search, SlidersHorizontal } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { useLocation } from "wouter";
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
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);
  const categories = useMemo(() => ["Todas", ...Array.from(new Set(items.map(item => item.category))).sort()], [items]);
  const load = () => { setLoading(true); setError(""); productService.list(search, category).then(result => setItems(result.items)).catch((reason: Error) => setError(reason.message)).finally(() => setLoading(false)); };
  useEffect(() => { const timer = window.setTimeout(load, 220); return () => window.clearTimeout(timer); }, [search, category]);
  return <>
    <PageHeader eyebrow="Catálogo" title="Productos" description="Consultá precios, SKU y disponibilidad. Cada movimiento queda registrado en el inventario." action={canManage ? <button className="button-primary" onClick={() => setLocation("/products/new")}><PackagePlus size={17} />Nuevo producto</button> : undefined} />
    <section className="filter-bar"><label className="search-control"><Search size={17} /><input value={search} onChange={event => setSearch(event.target.value)} placeholder="Buscar por nombre o SKU" aria-label="Buscar productos" /></label><label className="select-control"><SlidersHorizontal size={16} /><select value={category} onChange={event => setCategory(event.target.value)} aria-label="Filtrar por categoría">{categories.map(option => <option key={option}>{option}</option>)}</select></label></section>
    {loading && <LoadingPanel rows={6} />}{error && <ErrorPanel message={error} retry={load} />}
    {!loading && !error && (items.length ? <section className="table-card"><div className="table-scroll"><table><thead><tr><th>Producto</th><th>Categoría</th><th>Precio</th><th>Stock total</th><th>Estado</th><th aria-label="Acciones" /></tr></thead><tbody>{items.map(item => <tr key={item.id}><td><div className="product-cell"><span className="product-glyph">{item.name.slice(0, 1).toUpperCase()}</span><div><b>{item.name}</b><small>{item.sku}</small></div></div></td><td><span className="category-tag">{item.category}</span></td><td className="mono">{money(item.priceCents)}</td><td><b>{item.stock} u.</b><small>Mínimo: {item.lowStockThreshold}</small></td><td><StockBadge quantity={item.stock} threshold={item.lowStockThreshold} /></td><td>{canManage && <button className="icon-button" onClick={() => setLocation(`/products/${item.id}/edit`)} aria-label={`Editar ${item.name}`}><Edit3 size={16} /></button>}</td></tr>)}</tbody></table></div><footer className="table-footer">{items.length} producto{items.length === 1 ? "" : "s"} encontrado{items.length === 1 ? "" : "s"}</footer></section> : <EmptyState title="Todavía no cargaste productos" detail="Incorporá tu primer artículo para empezar a gestionar el inventario." action={canManage ? <button className="button-primary" onClick={() => setLocation("/products/new")}>Incorporar producto</button> : undefined} />)}
  </>;
}
