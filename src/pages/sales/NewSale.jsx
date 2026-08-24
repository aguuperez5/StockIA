import React, { useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  Camera, Check, Upload, Search, Plus, Minus, Trash2, ShoppingCart, CircleAlert
} from "lucide-react";
import { BackHeading, Panel, SelectField, TextAreaField } from "../../components/common";
import { useAppData } from "../../context/AppDataContext";
import { formatCurrency } from "../../utils/format";

const IVA_RATE = 0.21;

export default function NewSale() {
  const navigate = useNavigate();
  const { products, deposits, clients, addSale } = useAppData();

  const [selectedImage, setSelectedImage] = useState(null);
  const [detected, setDetected] = useState(false);

  const [clienteId, setClienteId] = useState("");
  const [depositoId, setDepositoId] = useState(deposits[0]?.id || "");
  const [metodoPago, setMetodoPago] = useState("Efectivo");
  const [notas, setNotas] = useState("");

  const [query, setQuery] = useState("");
  const [cart, setCart] = useState([]); // [{productId, nombre, precio, cantidad, unidad}]
  const [formError, setFormError] = useState("");
  const [cartError, setCartError] = useState("");

  function onFile(e) {
    const file = e.target.files?.[0];
    if (!file) return;
    setSelectedImage(URL.createObjectURL(file));
    setTimeout(() => setDetected(true), 600);
  }

  const disponiblePorProducto = (productId) => {
    const p = products.find(pr => pr.id === productId);
    if (!p) return 0;
    return p.stock[depositoId] || 0;
  };

  const results = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return [];
    return products
      .filter(p => p.nombre.toLowerCase().includes(q) || p.sku.toLowerCase().includes(q))
      .slice(0, 6);
  }, [products, query]);

  function addToCart(product) {
    setCartError("");
    setCart(prev => {
      const existing = prev.find(it => it.productId === product.id);
      if (existing) {
        return prev.map(it =>
          it.productId === product.id ? { ...it, cantidad: it.cantidad + 1 } : it
        );
      }
      return [...prev, { productId: product.id, nombre: product.nombre, precio: product.precio, unidad: product.unidad, cantidad: 1 }];
    });
    setQuery("");
  }

  function changeQty(productId, delta) {
    setCartError("");
    setCart(prev =>
      prev.map(it => {
        if (it.productId !== productId) return it;
        const next = it.cantidad + delta;
        return { ...it, cantidad: Math.max(1, next) };
      })
    );
  }

  function setQty(productId, value) {
    const n = Number(value);
    setCartError("");
    setCart(prev =>
      prev.map(it => (it.productId === productId ? { ...it, cantidad: isNaN(n) || n < 1 ? 1 : n } : it))
    );
  }

  function removeFromCart(productId) {
    setCart(prev => prev.filter(it => it.productId !== productId));
  }

  const subtotal = cart.reduce((a, it) => a + it.precio * it.cantidad, 0);
  const iva = subtotal * IVA_RATE;
  const total = subtotal + iva;

  function submit(e) {
    e.preventDefault();
    setFormError("");
    setCartError("");

    if (!depositoId) {
      setFormError("Seleccioná el depósito de origen.");
      return;
    }
    if (cart.length === 0) {
      setFormError("Agregá al menos un producto a la venta.");
      return;
    }
    const sinStock = cart.find(it => it.cantidad > disponiblePorProducto(it.productId));
    if (sinStock) {
      setCartError(`No hay stock suficiente de "${sinStock.nombre}" en el depósito seleccionado (disponible: ${disponiblePorProducto(sinStock.productId)}).`);
      return;
    }

    const clienteNombre = clients.find(c => c.id === clienteId)?.nombre || "Mostrador";
    addSale({
      cliente: clienteNombre,
      depositoId,
      metodoPago,
      notas,
      items: cart.map(it => ({ productId: it.productId, cantidad: it.cantidad, precio: it.precio })),
    });

    navigate("/panel/ventas", { state: { success: `Venta registrada correctamente por ${formatCurrency(total)}.` } });
  }

  return (
    <section>
      <BackHeading title="Nueva Venta" subtitle="Procesar una transacción de cliente" to="/panel" />

      <form onSubmit={submit} noValidate>
        <div className="two-column">
          <Panel title="CONFIGURACIÓN">
            <div className="form-stack">
              <SelectField
                label="Cliente"
                placeholder="Mostrador (sin cliente registrado)"
                options={clients.map(c => ({ value: c.id, label: c.nombre }))}
                value={clienteId}
                onChange={e => setClienteId(e.target.value)}
              />
              <SelectField
                label="Depósito de origen"
                options={deposits.map(d => ({ value: d.id, label: d.nombre }))}
                value={depositoId}
                onChange={e => setDepositoId(e.target.value)}
              />
              <SelectField
                label="Método de pago"
                options={["Efectivo", "Tarjeta de débito", "Tarjeta de crédito", "Transferencia"]}
                value={metodoPago}
                onChange={e => setMetodoPago(e.target.value)}
              />
              <TextAreaField
                label="Notas (opcional)"
                placeholder="Notas internas para esta venta..."
                value={notas}
                onChange={e => setNotas(e.target.value)}
              />
            </div>
          </Panel>

          <Panel title="DETECCIÓN DE PRODUCTOS (IA)">
            <p className="helper">Tomá una foto de los productos. La IA detectará ítems, cantidades y precios automáticamente.</p>
            <div className={`camera-box ${selectedImage ? "has-image" : ""}`}>
              {selectedImage ? <img src={selectedImage} alt="Vista previa" /> : (
                <>
                  <Camera size={23}/>
                  <strong>Tomar Foto</strong>
                  <small>Usar cámara para detección IA</small>
                </>
              )}
            </div>
            <div className="or-divider"><span>o</span></div>
            <label className="upload-button">
              <Upload size={17}/>
              Subir imagen
              <input type="file" accept="image/*" onChange={onFile} />
            </label>
            <small className="formats">Formatos: JPG, PNG, HEIC · Máx. 20 MB</small>
            {detected && <div className="success-note"><Check size={16}/> Imagen cargada. Detección simulada lista.</div>}
          </Panel>
        </div>

        <Panel title="SELECCIÓN MANUAL DE PRODUCTOS">
          <div className="manual-select">
            <div className="mini-search wide">
              <Search size={14} />
              <input
                placeholder="Buscar producto por nombre o SKU para agregarlo..."
                value={query}
                onChange={e => setQuery(e.target.value)}
              />
            </div>
            {results.length > 0 && (
              <div className="search-results">
                {results.map(p => (
                  <button type="button" key={p.id} className="search-result-row" onClick={() => addToCart(p)}>
                    <span><strong>{p.nombre}</strong><small>{p.sku} · Stock en depósito: {p.stock[depositoId] || 0}</small></span>
                    <span className="add-chip"><Plus size={13} /> Agregar</span>
                  </button>
                ))}
              </div>
            )}
          </div>

          {cart.length === 0 ? (
            <div className="empty-detection" style={{ margin: "12px 13px" }}>
              <ShoppingCart size={24} />
              <p>Buscá productos arriba para agregarlos a la venta.</p>
            </div>
          ) : (
            <div className="table-wrap">
              <table>
                <thead>
                  <tr><th>PRODUCTO</th><th>PRECIO UNIT.</th><th>CANTIDAD</th><th>SUBTOTAL</th><th></th></tr>
                </thead>
                <tbody>
                  {cart.map(it => (
                    <tr key={it.productId}>
                      <td><strong>{it.nombre}</strong></td>
                      <td>{formatCurrency(it.precio)}</td>
                      <td>
                        <div className="qty-control">
                          <button type="button" onClick={() => changeQty(it.productId, -1)}><Minus size={13} /></button>
                          <input
                            type="number"
                            min="1"
                            value={it.cantidad}
                            onChange={e => setQty(it.productId, e.target.value)}
                          />
                          <button type="button" onClick={() => changeQty(it.productId, 1)}><Plus size={13} /></button>
                        </div>
                      </td>
                      <td><strong>{formatCurrency(it.precio * it.cantidad)}</strong></td>
                      <td>
                        <button type="button" className="icon-button danger" onClick={() => removeFromCart(it.productId)} title="Quitar">
                          <Trash2 size={15} />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {cartError && <small className="field-error standalone" style={{ margin: "0 13px 10px" }}><CircleAlert size={12} /> {cartError}</small>}

          <div className="sale-totals">
            <div><span>Subtotal</span><b>{formatCurrency(subtotal)}</b></div>
            <div><span>IVA (21%)</span><b>{formatCurrency(iva)}</b></div>
            <div className="total-row"><span>Total</span><b>{formatCurrency(total)}</b></div>
          </div>
        </Panel>

        {formError && <small className="field-error standalone"><CircleAlert size={12} /> {formError}</small>}

        <div className="form-actions">
          <button type="button" className="secondary-button" onClick={() => navigate("/panel")}>Cancelar</button>
          <button type="submit" className="primary-button">Registrar venta</button>
        </div>
      </form>
    </section>
  );
}
