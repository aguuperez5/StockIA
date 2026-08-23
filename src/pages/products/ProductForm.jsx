import React, { useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { Tag, DollarSign, Boxes, Warehouse } from "lucide-react";
import { BackHeading, Panel, Field, TextAreaField, SelectField } from "../../components/common";
import { useAppData } from "../../context/AppDataContext";
import { required, numberGreaterThan, numberGreaterOrEqual, validateForm } from "../../utils/validators";

const unidades = ["unidad", "metro", "kg", "litro", "caja", "par"];

export default function ProductForm({ mode }) {
  const isEdit = mode === "edit";
  const { id } = useParams();
  const navigate = useNavigate();
  const { getProduct, addProduct, updateProduct, categorias, deposits, skuExists, totalStock } = useAppData();

  const existing = isEdit ? getProduct(id) : null;

  const [values, setValues] = useState(() => ({
    nombre: existing?.nombre || "",
    sku: existing?.sku || "",
    categoria: existing?.categoria || "",
    unidad: existing?.unidad || "unidad",
    precio: existing?.precio ?? "",
    stockMinimo: existing?.stockMinimo ?? "",
    descripcion: existing?.descripcion || "",
    depositoInicial: deposits[0]?.id || "",
    stockInicial: "",
  }));
  const [errors, setErrors] = useState({});
  const [submitError, setSubmitError] = useState("");

  if (isEdit && !existing) {
    return (
      <section>
        <BackHeading title="Producto no encontrado" to="/panel/productos" />
        <p className="helper">El producto que buscás no existe o fue eliminado.</p>
      </section>
    );
  }

  function setField(field, value) {
    setValues(v => ({ ...v, [field]: value }));
    if (errors[field]) setErrors(e => ({ ...e, [field]: undefined }));
  }

  function schema() {
    return {
      nombre: [required("Ingresá el nombre del producto")],
      sku: [
        required("Ingresá un código SKU"),
        (v) => (skuExists(v, existing?.id) ? "Ya existe un producto con ese SKU" : null),
      ],
      categoria: [required("Seleccioná o ingresá una categoría")],
      precio: [required("Ingresá el precio"), numberGreaterThan(0, "El precio debe ser mayor a 0")],
      stockMinimo: [required("Ingresá el stock mínimo"), numberGreaterOrEqual(0, "No puede ser negativo")],
    };
  }

  function submit(e) {
    e.preventDefault();
    setSubmitError("");
    const { valid, errors: newErrors } = validateForm(values, schema());
    setErrors(newErrors);
    if (!valid) {
      setSubmitError("Revisá los campos marcados antes de guardar.");
      return;
    }

    if (isEdit) {
      updateProduct(existing.id, values);
      navigate("/panel/productos", { state: { success: `Producto "${values.nombre}" actualizado correctamente.` } });
    } else {
      addProduct(values);
      navigate("/panel/productos", { state: { success: `Producto "${values.nombre}" creado correctamente.` } });
    }
  }

  return (
    <section>
      <BackHeading
        title={isEdit ? "Editar producto" : "Alta de producto"}
        subtitle={isEdit ? `Actualizá los datos de ${existing.nombre}` : "Cargá un nuevo producto al catálogo"}
        to="/panel/productos"
      />

      <div className="two-column align-start">
        <Panel title="DATOS DEL PRODUCTO">
          <form className="form-stack" onSubmit={submit} noValidate>
            <Field
              label="Nombre del producto"
              icon={Tag}
              placeholder='Ej: Válvula Industrial 2"'
              value={values.nombre}
              onChange={e => setField("nombre", e.target.value)}
              error={errors.nombre}
            />

            <div className="form-grid">
              <Field
                label="Código SKU"
                placeholder="Ej: VAL-20E-ST"
                value={values.sku}
                onChange={e => setField("sku", e.target.value)}
                error={errors.sku}
              />
              <SelectField
                label="Unidad de medida"
                options={unidades}
                value={values.unidad}
                onChange={e => setField("unidad", e.target.value)}
              />
            </div>

            <div className="form-grid">
              <Field
                label="Categoría"
                placeholder="Ej: Válvulas"
                list="categorias-list"
                value={values.categoria}
                onChange={e => setField("categoria", e.target.value)}
                error={errors.categoria}
              />
              <Field
                label="Precio unitario"
                icon={DollarSign}
                type="number"
                min="0"
                step="0.01"
                placeholder="0.00"
                value={values.precio}
                onChange={e => setField("precio", e.target.value)}
                error={errors.precio}
              />
            </div>
            <datalist id="categorias-list">
              {categorias.map(c => <option key={c} value={c} />)}
            </datalist>

            <Field
              label="Stock mínimo (alerta)"
              icon={Boxes}
              type="number"
              min="0"
              placeholder="Ej: 10"
              value={values.stockMinimo}
              onChange={e => setField("stockMinimo", e.target.value)}
              error={errors.stockMinimo}
              hint="Se usa para calcular los estados de stock bajo / crítico."
            />

            <TextAreaField
              label="Descripción (opcional)"
              placeholder="Detalles del producto..."
              value={values.descripcion}
              onChange={e => setField("descripcion", e.target.value)}
            />

            {!isEdit && (
              <div className="form-grid">
                <SelectField
                  label="Depósito inicial"
                  icon={Warehouse}
                  options={deposits.map(d => ({ value: d.id, label: d.nombre }))}
                  value={values.depositoInicial}
                  onChange={e => setField("depositoInicial", e.target.value)}
                />
                <Field
                  label="Stock inicial"
                  type="number"
                  min="0"
                  placeholder="0"
                  value={values.stockInicial}
                  onChange={e => setField("stockInicial", e.target.value)}
                />
              </div>
            )}

            {submitError && <small className="field-error standalone">{submitError}</small>}

            <div className="form-actions">
              <button type="button" className="secondary-button" onClick={() => navigate("/panel/productos")}>Cancelar</button>
              <button type="submit" className="primary-button">{isEdit ? "Guardar cambios" : "Crear producto"}</button>
            </div>
          </form>
        </Panel>

        {isEdit && (
          <Panel title="STOCK POR DEPÓSITO">
            <div className="stock-list">
              {deposits.map(d => (
                <div className="stock-item" key={d.id}>
                  <div className="stock-item-head"><span>{d.nombre}</span><b>{existing.stock[d.id] || 0} {existing.unidad}</b></div>
                </div>
              ))}
              <p className="helper" style={{ padding: "10px 0 0" }}>
                Total en todos los depósitos: <strong>{totalStock(existing)} {existing.unidad}</strong>. Para mover stock entre
                depósitos, usá la sección de Transferencias.
              </p>
            </div>
          </Panel>
        )}
      </div>
    </section>
  );
}
