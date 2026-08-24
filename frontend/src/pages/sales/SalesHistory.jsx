import React, { useMemo, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { Search, ChevronDown, ChevronUp, Plus, Receipt } from "lucide-react";
import { Panel, PageHeading, Banner, EmptyState } from "../../components/common";
import { useAppData } from "../../context/AppDataContext";
import { formatCurrency, formatDateTime } from "../../utils/format";

const PERIODOS = [
  { value: "", label: "Todas las fechas" },
  { value: "hoy", label: "Hoy" },
  { value: "semana", label: "Últimos 7 días" },
];

export default function SalesHistory() {
  const { sales, deposits } = useAppData();
  const navigate = useNavigate();
  const location = useLocation();
  const successMessage = location.state?.success;

  const [query, setQuery] = useState("");
  const [metodoPago, setMetodoPago] = useState("");
  const [periodo, setPeriodo] = useState("");
  const [expandedId, setExpandedId] = useState(null);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    const now = new Date();
    return sales.filter(s => {
      const matchesQuery = !q || s.cliente.toLowerCase().includes(q) || s.numero.includes(q);
      const matchesMetodo = !metodoPago || s.metodoPago === metodoPago;
      let matchesPeriodo = true;
      if (periodo === "hoy") {
        matchesPeriodo = new Date(s.fecha).toDateString() === now.toDateString();
      } else if (periodo === "semana") {
        matchesPeriodo = now - new Date(s.fecha) <= 7 * 24 * 60 * 60 * 1000;
      }
      return matchesQuery && matchesMetodo && matchesPeriodo;
    });
  }, [sales, query, metodoPago, periodo]);

  const totalPeriodo = filtered.reduce((a, s) => a + s.total, 0);
  const depositoNombre = (id) => deposits.find(d => d.id === id)?.nombre || "—";

  return (
    <section>
      <PageHeading title="Historial de ventas" subtitle="Todas las ventas registradas en el sistema">
        <button className="primary-button" onClick={() => navigate("/panel/nueva-venta")}><Plus size={17} /> Nueva venta</button>
      </PageHeading>

      {successMessage && <Banner tone="success">{successMessage}</Banner>}

      <Panel title="FILTROS">
        <div className="filter-row">
          <div className="mini-search wide">
            <Search size={14} />
            <input placeholder="Buscar por N° de venta o cliente..." value={query} onChange={e => setQuery(e.target.value)} />
          </div>
          <select className="filter-select" value={metodoPago} onChange={e => setMetodoPago(e.target.value)}>
            <option value="">Todos los métodos de pago</option>
            <option value="Efectivo">Efectivo</option>
            <option value="Tarjeta de débito">Tarjeta de débito</option>
            <option value="Tarjeta de crédito">Tarjeta de crédito</option>
            <option value="Transferencia">Transferencia</option>
          </select>
          <select className="filter-select" value={periodo} onChange={e => setPeriodo(e.target.value)}>
            {PERIODOS.map(p => <option key={p.value} value={p.value}>{p.label}</option>)}
          </select>
        </div>
      </Panel>

      <Panel title={`VENTAS (${filtered.length}) · TOTAL ${formatCurrency(totalPeriodo)}`}>
        {filtered.length === 0 ? (
          <EmptyState icon={Receipt} title="Sin ventas" text="No se encontraron ventas con esos filtros." />
        ) : (
          <div className="table-wrap">
            <table>
              <thead>
                <tr><th>N°</th><th>CLIENTE</th><th>DEPÓSITO</th><th>ÍTEMS</th><th>MÉTODO</th><th>TOTAL</th><th>FECHA</th><th></th></tr>
              </thead>
              <tbody>
                {filtered.map(s => (
                  <React.Fragment key={s.numero}>
                    <tr className="row-clickable" onClick={() => setExpandedId(expandedId === s.numero ? null : s.numero)}>
                      <td>#{s.numero}</td>
                      <td>{s.cliente}</td>
                      <td>{depositoNombre(s.depositoId)}</td>
                      <td>{s.items.reduce((a, it) => a + it.cantidad, 0)}</td>
                      <td>{s.metodoPago}</td>
                      <td><strong>{formatCurrency(s.total)}</strong></td>
                      <td>{formatDateTime(s.fecha)}</td>
                      <td>{expandedId === s.numero ? <ChevronUp size={14} /> : <ChevronDown size={14} />}</td>
                    </tr>
                    {expandedId === s.numero && (
                      <tr className="detail-row">
                        <td colSpan={8}>
                          <div className="sale-detail">
                            <table>
                              <thead><tr><th>Producto</th><th>Cantidad</th><th>Precio unit.</th><th>Subtotal</th></tr></thead>
                              <tbody>
                                {s.items.map(it => (
                                  <tr key={it.productId + s.numero}>
                                    <td>{it.nombre}</td>
                                    <td>{it.cantidad}</td>
                                    <td>{formatCurrency(it.precio)}</td>
                                    <td>{formatCurrency(it.subtotal)}</td>
                                  </tr>
                                ))}
                              </tbody>
                            </table>
                            {s.notas && <p className="helper">Notas: {s.notas}</p>}
                          </div>
                        </td>
                      </tr>
                    )}
                  </React.Fragment>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Panel>
    </section>
  );
}
