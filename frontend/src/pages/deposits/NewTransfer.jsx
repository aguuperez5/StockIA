import React, { useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { ArrowDownUp, Search, Plus, Trash2, CircleAlert } from "lucide-react";
import { BackHeading, Panel, Field, SelectField } from "../../components/common";
import { useAppData } from "../../context/AppDataContext";

export default function NewTransfer() {
  const navigate = useNavigate();
  const { deposits, products, transferStock } = useAppData();

  const [origen, setOrigen] = useState(deposits[0]?.id || "");
  const [destino, setDestino] = useState("");
  const [referencia, setReferencia] = useState("");
  const [query, setQuery] = useState("");
  const [lineas, setLineas] = useState([]); // [{ productId, nombre, sku, cantidad }]
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const disponible = (productId) => {
    const p = products.find((pr) => pr.id === productId);
    return p?.stock?.[origen] || 0;
  };

  const results = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return [];
    return products
      .filter((p) => p.nombre.toLowerCase().includes(q) || p.sku.toLowerCase().includes(q))
      .filter((p) => (p.stock?.[origen] || 0) > 0)
      .slice(0, 6);
  }, [products, query, origen]);

  function addLinea(p) {
    setError("");
    setLineas((prev) =>
      prev.some((l) => l.productId === p.id)
        ? prev
        : [...prev, { productId: p.id, nombre: p.nombre, sku: p.sku, cantidad: 1 }]
    );
    setQuery("");
  }

  function setCantidad(productId, value) {
    const n = Math.max(1, Number(value) || 1);
    setLineas((prev) => prev.map((l) => (l.productId === productId ? { ...l, cantidad: n } : l)));
  }

  function removeLinea(productId) {
    setLineas((prev) => prev.filter((l) => l.productId !== productId));
  }

  async function submit(e) {
    e.preventDefault();
    setError("");
    if (!origen || !destino) return setError("Elegí depósito de origen y destino.");
    if (origen === destino) return setError("El destino debe ser distinto al origen.");
    if (lineas.length === 0) return setError("Agregá al menos un producto a transferir.");
    const sinStock = lineas.find((l) => l.cantidad > disponible(l.productId));
    if (sinStock) {
      return setError(`Stock insuficiente de "${sinStock.nombre}" en el origen (disponible: ${disponible(sinStock.productId)}).`);
    }

    setSubmitting(true);
    try {
      for (const l of lineas) {
        await transferStock({
          productId: l.productId,
          fromDepositId: origen,
          toDepositId: destino,
          quantity: l.cantidad,
          reason: referencia.trim() || undefined,
        });
      }
      navigate("/panel/transferencias", { state: { success: `Transferencia de ${lineas.length} producto(s) registrada.` } });
    } catch (err) {
      setError(err.message || "No se pudo registrar la transferencia.");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <section>
      <BackHeading title="Nueva transferencia" subtitle="Mover inventario entre depósitos" to="/panel/transferencias" />

      <form onSubmit={submit} noValidate>
        <div className="two-column align-start">
          <Panel title="RUTA DE TRANSFERENCIA">
            <div className="form-stack">
              <SelectField
                label="ORIGEN (DESDE)"
                options={deposits.map((d) => ({ value: d.id, label: d.nombre }))}
                value={origen}
                onChange={(e) => { setOrigen(e.target.value); setLineas([]); }}
              />
              <div className="route-arrow"><ArrowDownUp size={17} /></div>
              <SelectField
                label="DESTINO (HACIA)"
                placeholder="Seleccionar destino..."
                options={deposits.filter((d) => d.id !== origen).map((d) => ({ value: d.id, label: d.nombre }))}
                value={destino}
                onChange={(e) => setDestino(e.target.value)}
              />
              <Field
                label="Referencia (opcional)"
                placeholder="Número de orden, motivo..."
                value={referencia}
                onChange={(e) => setReferencia(e.target.value)}
              />
            </div>
          </Panel>

          <Panel title="PRODUCTOS A TRANSFERIR">
            <div className="mini-search wide">
              <Search size={14} />
              <input
                placeholder="Buscar producto con stock en el origen..."
                value={query}
                onChange={(e) => setQuery(e.target.value)}
              />
            </div>
            {results.length > 0 && (
              <div className="search-results">
                {results.map((p) => (
                  <button type="button" key={p.id} className="search-result-row" onClick={() => addLinea(p)}>
                    <span><strong>{p.nombre}</strong><small>{p.sku} · Disponible: {p.stock?.[origen] || 0}</small></span>
                    <span className="add-chip"><Plus size={13} /> Agregar</span>
                  </button>
                ))}
              </div>
            )}

            {lineas.length > 0 && (
              <div className="table-wrap" style={{ marginTop: 10 }}>
                <table>
                  <thead><tr><th>PRODUCTO</th><th>DISPONIBLE</th><th>CANTIDAD</th><th></th></tr></thead>
                  <tbody>
                    {lineas.map((l) => (
                      <tr key={l.productId}>
                        <td><strong>{l.nombre}</strong><br /><small>{l.sku}</small></td>
                        <td>{disponible(l.productId)}</td>
                        <td>
                          <input
                            type="number"
                            min="1"
                            max={disponible(l.productId)}
                            value={l.cantidad}
                            onChange={(e) => setCantidad(l.productId, e.target.value)}
                            style={{ width: 70 }}
                          />
                        </td>
                        <td>
                          <button type="button" className="icon-button danger" onClick={() => removeLinea(l.productId)} title="Quitar">
                            <Trash2 size={15} />
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </Panel>
        </div>

        {error && <small className="field-error standalone"><CircleAlert size={12} /> {error}</small>}

        <div className="form-actions">
          <button type="button" className="secondary-button" onClick={() => navigate("/panel/transferencias")}>Cancelar</button>
          <button type="submit" className="primary-button" disabled={submitting}>
            {submitting ? "Registrando..." : "Registrar transferencia"}
          </button>
        </div>
      </form>
    </section>
  );
}
