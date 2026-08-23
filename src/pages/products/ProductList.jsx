import React, { useMemo, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { Plus, Search, SlidersHorizontal, SquarePen, Package } from "lucide-react";
import { Panel, PageHeading, StatusBadge, EmptyState, Banner } from "../../components/common";
import { useAppData } from "../../context/AppDataContext";
import { formatCurrency } from "../../utils/format";

export default function ProductList() {
  const { products, categorias, totalStock, stockLevel } = useAppData();
  const navigate = useNavigate();
  const location = useLocation();
  const successMessage = location.state?.success;

  const [query, setQuery] = useState("");
  const [categoria, setCategoria] = useState("");
  const [estado, setEstado] = useState("");

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return products.filter(p => {
      const matchesQuery = !q || p.nombre.toLowerCase().includes(q) || p.sku.toLowerCase().includes(q);
      const matchesCategoria = !categoria || p.categoria === categoria;
      const level = stockLevel(p);
      const matchesEstado = !estado || level === estado;
      return matchesQuery && matchesCategoria && matchesEstado;
    });
  }, [products, query, categoria, estado, stockLevel]);

  return (
    <section>
      <PageHeading title="Productos" subtitle="Catálogo de productos y niveles de stock">
        <button className="primary-button" onClick={() => navigate("/panel/productos/nuevo")}>
          <Plus size={17} /> Nuevo producto
        </button>
      </PageHeading>

      {successMessage && <Banner tone="success">{successMessage}</Banner>}

      <Panel
        title="FILTROS"
        action={<SlidersHorizontal size={14} className="gray" />}
      >
        <div className="filter-row">
          <div className="mini-search wide">
            <Search size={14} />
            <input
              placeholder="Buscar por nombre o SKU..."
              value={query}
              onChange={e => setQuery(e.target.value)}
            />
          </div>
          <select className="filter-select" value={categoria} onChange={e => setCategoria(e.target.value)}>
            <option value="">Todas las categorías</option>
            {categorias.map(c => <option key={c} value={c}>{c}</option>)}
          </select>
          <select className="filter-select" value={estado} onChange={e => setEstado(e.target.value)}>
            <option value="">Todos los estados</option>
            <option value="Normal">Normal</option>
            <option value="Bajo">Bajo</option>
            <option value="Crítico">Crítico</option>
            <option value="Sin stock">Sin stock</option>
          </select>
        </div>
      </Panel>

      <Panel title={`PRODUCTOS (${filtered.length})`}>
        {filtered.length === 0 ? (
          <EmptyState icon={Package} title="Sin resultados" text="No se encontraron productos con esos filtros." />
        ) : (
          <div className="table-wrap">
            <table>
              <thead>
                <tr>
                  <th>PRODUCTO</th><th>SKU</th><th>CATEGORÍA</th><th>PRECIO</th><th>STOCK TOTAL</th><th>ESTADO</th><th></th>
                </tr>
              </thead>
              <tbody>
                {filtered.map(p => (
                  <tr key={p.id} className="row-clickable" onClick={() => navigate(`/panel/productos/${p.id}/editar`)}>
                    <td><strong>{p.nombre}</strong></td>
                    <td>{p.sku}</td>
                    <td>{p.categoria}</td>
                    <td>{formatCurrency(p.precio)}</td>
                    <td>{totalStock(p)} {p.unidad}</td>
                    <td><StatusBadge level={stockLevel(p)} /></td>
                    <td>
                      <button
                        className="icon-button"
                        onClick={e => { e.stopPropagation(); navigate(`/panel/productos/${p.id}/editar`); }}
                        title="Editar producto"
                      >
                        <SquarePen size={15} />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Panel>
    </section>
  );
}
