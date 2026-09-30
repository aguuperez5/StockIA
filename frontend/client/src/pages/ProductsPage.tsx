import {
  Edit3,
  PackagePlus,
  RotateCcw,
  Search,
  SlidersHorizontal,
  Trash2,
  X,
} from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { useLocation } from "wouter";
import { toast } from "sonner";
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
  StockBadge,
} from "@/components/StockUI";
import { ModernSelect } from "@/components/ModernSelect";
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
  const [stockFilter, setStockFilter] = useState("all");
  const [minPrice, setMinPrice] = useState("");
  const [maxPrice, setMaxPrice] = useState("");
  const reactivate = async (item: Product) => {
    try {
      await productService.setActive(item.id, true);
      toast.success(`"${item.name}" reactivado.`);
      load();
    } catch (reason) {
      setError((reason as Error).message);
    }
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
    } catch (reason) {
      setError((reason as Error).message);
      setToDelete(null);
    } finally {
      setDeleting(false);
    }
  };
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
        const price = item.priceCents / 100;
        const matchesStock =
          stockFilter === "all" ||
          (stockFilter === "out" && item.stock === 0) ||
          (stockFilter === "low" &&
            item.stock > 0 &&
            item.stock <= item.lowStockThreshold) ||
          (stockFilter === "available" && item.stock > item.lowStockThreshold);
        const matchesMin = minPrice === "" || price >= Number(minPrice);
        const matchesMax = maxPrice === "" || price <= Number(maxPrice);
        return matchesStock && matchesMin && matchesMax;
      }),
    [items, stockFilter, minPrice, maxPrice]
  );
  const clearFilters = () => {
    setSearch("");
    setCategory("Todas");
    setStockFilter("all");
    setMinPrice("");
    setMaxPrice("");
    setShowInactive(false);
  };
  const load = () => {
    setLoading(true);
    setError("");
    productService
      .list(search, category, showInactive)
      .then(result => setItems(result.items))
      .catch((reason: Error) => setError(reason.message))
      .finally(() => setLoading(false));
  };
  useEffect(() => {
    const timer = window.setTimeout(load, 220);
    return () => window.clearTimeout(timer);
  }, [search, category, showInactive]);
  return (
    <>
      <PageHeader
        eyebrow="Catálogo"
        title="Productos"
        description="Consultá precios, SKU y disponibilidad. Cada movimiento queda registrado en el inventario."
        action={
          canManage ? (
            <button
              className="button-primary"
              onClick={() => setLocation("/products/new")}
            >
              <PackagePlus size={17} />
              Nuevo producto
            </button>
          ) : undefined
        }
      />
      <section className="filter-bar">
        <label className="search-control">
          <Search size={16} />
          <input
            value={search}
            onChange={event => setSearch(event.target.value)}
            placeholder="Buscar por nombre o SKU"
            aria-label="Buscar productos"
          />
        </label>
        <ModernSelect
          value={category}
          onChange={setCategory}
          options={categories}
          icon={<SlidersHorizontal size={15} />}
          ariaLabel="Filtrar por categoría"
        />
        <ModernSelect
          value={stockFilter}
          onChange={setStockFilter}
          options={[
            { value: "all", label: "Todo el stock" },
            { value: "available", label: "Stock disponible" },
            { value: "low", label: "Stock bajo" },
            { value: "out", label: "Sin stock" },
          ]}
          ariaLabel="Filtrar por estado de stock"
        />
        <label className="filter-number">
          <span>Desde:</span>
          <input
            type="number"
            min="0"
            value={minPrice}
            onChange={event => setMinPrice(event.target.value)}
            placeholder="$ mín"
            aria-label="Precio mínimo"
          />
        </label>
        <label className="filter-number">
          <span>Hasta:</span>
          <input
            type="number"
            min="0"
            value={maxPrice}
            onChange={event => setMaxPrice(event.target.value)}
            placeholder="$ máx"
            aria-label="Precio máximo"
          />
        </label>
        {canManage && (
          <label className="check-control">
            <input
              type="checkbox"
              checked={showInactive}
              onChange={event => setShowInactive(event.target.checked)}
            />
            Ver dados de baja
          </label>
        )}
        <button
          className="button-secondary filter-clear"
          onClick={clearFilters}
          type="button"
        >
          <X size={15} />
          Limpiar
        </button>
      </section>
      {loading && <LoadingPanel rows={6} />}
      {error && <ErrorPanel message={error} retry={load} />}
      {!loading &&
        !error &&
        (filteredItems.length ? (
          <section className="table-card">
            <div className="table-scroll">
              <table>
                <thead>
                  <tr>
                    <th scope="col">Producto</th>
                    <th scope="col">Categoría</th>
                    <th scope="col">Precio</th>
                    <th scope="col">Stock total</th>
                    <th scope="col">Estado</th>
                    <th scope="col" aria-label="Acciones" />
                  </tr>
                </thead>
                <tbody>
                  {filteredItems.map(item => (
                    <tr key={item.id}>
                      <td>
                        <div className="product-cell">
                          {item.imageUrl ? (
                            <img
                              src={item.imageUrl}
                              alt={item.name}
                              className="product-thumb"
                              loading="lazy"
                              onError={e => {
                                (e.target as HTMLImageElement).style.display =
                                  "none";
                              }}
                            />
                          ) : (
                            <span className="product-glyph">
                              {item.name.slice(0, 1).toUpperCase()}
                            </span>
                          )}
                          <div>
                            <b>{item.name}</b>
                            <small>{item.sku}</small>
                          </div>
                        </div>
                      </td>
                      <td>
                        <span className="category-tag">{item.category}</span>
                      </td>
                      <td className="mono">{money(item.priceCents)}</td>
                      <td>
                        <b>{item.stock} u.</b>
                        <small>Mínimo: {item.lowStockThreshold}</small>
                      </td>
                      <td>
                        {item.active ? (
                          <StockBadge
                            quantity={item.stock}
                            threshold={item.lowStockThreshold}
                          />
                        ) : (
                          <span className="status-pill inactive">
                            Dado de baja
                          </span>
                        )}
                      </td>
                      <td>
                        {canManage &&
                          (item.active ? (
                            <span className="row-actions">
                              <button
                                className="icon-button"
                                onClick={() =>
                                  setLocation(`/products/${item.id}/edit`)
                                }
                                aria-label={`Editar ${item.name}`}
                              >
                                <Edit3 size={16} />
                              </button>
                              <button
                                className="icon-button danger"
                                onClick={() => setToDelete(item)}
                                aria-label={`Dar de baja ${item.name}`}
                              >
                                <Trash2 size={16} />
                              </button>
                            </span>
                          ) : (
                            <button
                              className="icon-button"
                              onClick={() => void reactivate(item)}
                              aria-label={`Reactivar ${item.name}`}
                              title="Reactivar"
                            >
                              <RotateCcw size={16} />
                            </button>
                          ))}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <footer className="table-footer">
              {filteredItems.length} producto
              {filteredItems.length === 1 ? "" : "s"} encontrado
              {filteredItems.length === 1 ? "" : "s"}
            </footer>
          </section>
        ) : (
          <EmptyState
            title="No hay productos con estos filtros"
            detail="Probá cambiar la categoría, el estado de stock o el rango de precio."
            action={
              <button className="button-secondary" onClick={clearFilters}>
                Limpiar filtros
              </button>
            }
          />
        ))}
      <AlertDialog
        open={!!toDelete}
        onOpenChange={open => {
          if (!open) setToDelete(null);
        }}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Dar de baja "{toDelete?.name}"</AlertDialogTitle>
            <AlertDialogDescription>
              El producto dejará de aparecer en el catálogo y no se podrá
              vender, pero se conserva en el historial de ventas y movimientos.{" "}
              {toDelete && toDelete.stock > 0
                ? "Tiene stock cargado: primero debe quedar en cero."
                : "Podés reactivarlo cuando quieras con “Ver dados de baja”."}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={deleting}>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={event => {
                event.preventDefault();
                void confirmDelete();
              }}
              disabled={deleting}
              className="bg-red-700 hover:bg-red-800"
            >
              {deleting ? "Dando de baja…" : "Dar de baja"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
