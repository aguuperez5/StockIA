import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Store, MapPin, CircleUserRound, Phone, Boxes } from "lucide-react";
import { BackHeading, Panel, Field, SelectField } from "../../components/common";
import { useAppData } from "../../context/AppDataContext";
import { required, numberGreaterThan, phone as phoneValidator, validateForm } from "../../utils/validators";

const tipos = ["Principal", "Secundario"];

export default function DepositForm() {
  const navigate = useNavigate();
  const { addDeposit } = useAppData();

  const [values, setValues] = useState({
    nombre: "",
    tipo: "Secundario",
    direccion: "",
    responsable: "",
    capacidad: "",
    telefono: "",
  });
  const [errors, setErrors] = useState({});
  const [submitError, setSubmitError] = useState("");

  function setField(field, value) {
    setValues(v => ({ ...v, [field]: value }));
    if (errors[field]) setErrors(e => ({ ...e, [field]: undefined }));
  }

  const schema = {
    nombre: [required("Ingresá el nombre del depósito")],
    direccion: [required("Ingresá la dirección")],
    responsable: [required("Ingresá un responsable")],
    capacidad: [numberGreaterThan(0, "La capacidad debe ser mayor a 0")],
    telefono: values.telefono ? [phoneValidator()] : [],
  };

  function submit(e) {
    e.preventDefault();
    setSubmitError("");
    const { valid, errors: newErrors } = validateForm(values, schema);
    setErrors(newErrors);
    if (!valid) {
      setSubmitError("Revisá los campos marcados antes de guardar.");
      return;
    }
    addDeposit(values);
    navigate("/panel/depositos", { state: { success: `Depósito "${values.nombre}" creado correctamente.` } });
  }

  return (
    <section>
      <BackHeading title="Alta de depósito" subtitle="Registrá un nuevo depósito o sucursal" to="/panel/depositos" />

      <div className="two-column align-start">
        <Panel title="DATOS DEL DEPÓSITO">
          <form className="form-stack" onSubmit={submit} noValidate>
            <Field
              label="Nombre del depósito"
              icon={Store}
              placeholder="Ej: Depósito Oeste"
              value={values.nombre}
              onChange={e => setField("nombre", e.target.value)}
              error={errors.nombre}
            />

            <SelectField
              label="Tipo"
              options={tipos}
              value={values.tipo}
              onChange={e => setField("tipo", e.target.value)}
            />

            <Field
              label="Dirección"
              icon={MapPin}
              placeholder="Calle, número, localidad"
              value={values.direccion}
              onChange={e => setField("direccion", e.target.value)}
              error={errors.direccion}
            />

            <div className="form-grid">
              <Field
                label="Responsable"
                icon={CircleUserRound}
                placeholder="Nombre y apellido"
                value={values.responsable}
                onChange={e => setField("responsable", e.target.value)}
                error={errors.responsable}
              />
              <Field
                label="Teléfono (opcional)"
                icon={Phone}
                placeholder="+54 11 0000-0000"
                value={values.telefono}
                onChange={e => setField("telefono", e.target.value)}
                error={errors.telefono}
              />
            </div>

            <Field
              label="Capacidad (opcional)"
              icon={Boxes}
              type="number"
              min="0"
              placeholder="Cantidad máxima de ítems"
              value={values.capacidad}
              onChange={e => setField("capacidad", e.target.value)}
              error={errors.capacidad}
            />

            {submitError && <small className="field-error standalone">{submitError}</small>}

            <div className="form-actions">
              <button type="button" className="secondary-button" onClick={() => navigate("/panel/depositos")}>Cancelar</button>
              <button type="submit" className="primary-button">Crear depósito</button>
            </div>
          </form>
        </Panel>
      </div>
    </section>
  );
}
