import React, { useMemo, useState } from "react";
import { Search, PackageSearch } from "lucide-react";
import { Panel, PageHeading, StatusBadge, EmptyState } from "../../components/common";
import { useAppData } from "../../context/AppDataContext";

export default function StockQuery() {
  const { products, deposits } = useAppData();
  const [query, setQuery] = useState("");
  const [depositoId, setDepositoId] = useState("");
  const [soloBajo, setSoloBajo] = useState(false);

  const rows = useMemo(() => {
    const q = query.trim().toLowerCase();
    const list = [];
    for (const p of products) {
      const depositosAMostrar = depositoId ? deposits.filter(d => d.id === depositoId) : deposits;
      for (const d of depositosAMostrar) {
        const cantidad = p.stock[d.id] || 0;
        const estado = cantidad <= 0 ? "Sin stock" : cantidad <= p.stockMinimo ? "Crítico" : cantidad <= p.stockMinimo * 1.5 ? "Bajo" : "Normal";
        if (q && !p.nombre.toLowerCase().includes(q) && !p.sku.toLowerCase().includes(q)) continue;
        if (soloBajo && !["Crítico", "Bajo", "Sin stock"].includes(estado)) continue;
        list.push({ id: `${p.id}-${d.id}`, producto: p, deposito: d, cantidad, estado });
      }
    }
    return list;
  }, [products, deposits, query, depositoId, soloBajo]);

  const totalItems = rows.reduce((a, r) => a + r.cantidad, 0);

  return (
    <section>
      <PageHeading title="Consulta de stock" subtitle="Stock disponible por producto y depósito" />

      <Panel title="FILTROS">
        <div className="filter-row">
          <div className="mini-search wide">
            <Search size={14} />
            <input placeholder="Buscar por producto o SKU..." value={query} onChange={e => setQuery(e.target.value)} />
          </div>
          <select className="filter-select" value={depositoId} onChange={e => setDepositoId(e.target.value)}>
            <option value="">Todos los depósitos</option>
            {deposits.map(d => <option key={d.id} value={d.id}>{d.nombre}</option>)}
          </select>
          <label className="check-row filter-check">
            <input type="checkbox" checked={soloBajo} onChange={e => setSoloBajo(e.target.checked)} />
            <span>Sólo stock bajo/crítico</span>
          </label>
        </div>
      </Panel>

      <Panel title={`RESULTADOS (${rows.length} · ${totalItems} unidades)`}>
        {rows.length === 0 ? (
          <EmptyState icon={PackageSearch} title="Sin resultados" text="No hay stock que coincida con los filtros seleccionados." />
        ) : (
          <div className="table-wrap">
            <table>
              <thead>
                <tr><th>PRODUCTO</th><th>SKU</th><th>DEPÓSITO</th><th>CANTIDAD</th><th>MÍNIMO</th><th>ESTADO</th></tr>
              </thead>
              <tbody>
                {rows.map(r => (
                  <tr key={r.id}>
                    <td><strong>{r.producto.nombre}</strong></td>
                    <td>{r.producto.sku}</td>
                    <td>{r.deposito.nombre}</td>
                    <td>{r.cantidad} {r.producto.unidad}</td>
                    <td>{r.producto.stockMinimo}</td>
                    <td><StatusBadge level={r.estado} /></td>
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
