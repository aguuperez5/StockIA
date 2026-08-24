import React, { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { ChevronLeft, CircleUserRound, Mail, Phone, Store, Lock } from "lucide-react";
import { Field, PasswordField } from "../components/common";
import { required, email as emailValidator, minLength, phone as phoneValidator, validateForm } from "../utils/validators";
import { api } from "../services/api";
import { useToast } from "../context/ToastContext";

const initialState = {
  nombre: "",
  email: "",
  empresa: "",
  telefono: "",
  password: "",
  confirmPassword: "",
};

export default function AuthPage({ mode }) {
  const isRegister = mode === "register";
  const navigate = useNavigate();
  const { push: notify } = useToast();
  const [values, setValues] = useState(initialState);
  const [errors, setErrors] = useState({});
  const [submitError, setSubmitError] = useState("");
  const [loading, setLoading] = useState(false);

  function setField(field, value) {
    setValues(v => ({ ...v, [field]: value }));
    if (errors[field]) setErrors(e => ({ ...e, [field]: undefined }));
  }

  function schemaFor() {
    const schema = {
      email: [required("Ingresá tu email"), emailValidator()],
      password: [required("Ingresá tu contraseña")],
    };
    if (isRegister) {
      schema.nombre = [required("Ingresá tu nombre completo")];
      schema.empresa = [required("Ingresá el nombre de tu empresa")];
      schema.telefono = [required("Ingresá un teléfono de contacto"), phoneValidator()];
      schema.password = [required("Ingresá una contraseña"), minLength(8, "Debe tener al menos 8 caracteres")];
      schema.confirmPassword = [
        required("Confirmá tu contraseña"),
        (v) => (v === values.password ? null : "Las contraseñas no coinciden"),
      ];
    }
    return schema;
  }

  async function submit(e) {
    e.preventDefault();
    setSubmitError("");
    const { valid, errors: newErrors } = validateForm(values, schemaFor());
    setErrors(newErrors);
    if (!valid) {
      setSubmitError("Revisá los campos marcados antes de continuar.");
      return;
    }

    if (isRegister) {
      setLoading(true);
      try {
        await api.auth.register(values);
        notify("Cuenta creada en el servidor. Ahora podés iniciar sesión.", "success");
        navigate("/login");
      } catch (err) {
        // El backend valida email duplicado; se lo mostramos al usuario tal cual.
        setSubmitError(err.message);
      } finally {
        setLoading(false);
      }
      return;
    }

    // Login: el backend todavía no expone POST /api/auth/login, así que
    // seguimos en modo demo hasta que ese endpoint exista.
    notify("Backend sin endpoint de login todavía — ingresando en modo demo.", "info");
    navigate("/panel");
  }

  return (
    <main className="auth-page">
      <div className="auth-card">
        <Link className="back-link" to={isRegister ? "/login" : "/"}>
          <ChevronLeft size={16} />
          {isRegister ? "Ya tengo cuenta" : "Volver al inicio"}
        </Link>

        <div className="auth-heading">
          <h1>{isRegister ? "Crear cuenta" : "Iniciar sesión"}</h1>
          <p>{isRegister ? "Completá los datos de tu empresa para comenzar" : "Ingresá con tu cuenta de empresa"}</p>
        </div>

        <form onSubmit={submit} className="auth-form" noValidate>
          {isRegister && (
            <Field
              label="Nombre completo"
              icon={CircleUserRound}
              placeholder="Tu nombre y apellido"
              value={values.nombre}
              onChange={e => setField("nombre", e.target.value)}
              error={errors.nombre}
            />
          )}

          <Field
            label="Correo electrónico"
            icon={Mail}
            placeholder="usuario@empresa.com"
            type="email"
            value={values.email}
            onChange={e => setField("email", e.target.value)}
            error={errors.email}
          />

          {isRegister && (
            <div className="form-grid">
              <Field
                label="Empresa"
                icon={Store}
                placeholder="Nombre de la empresa"
                value={values.empresa}
                onChange={e => setField("empresa", e.target.value)}
                error={errors.empresa}
              />
              <Field
                label="Teléfono"
                icon={Phone}
                placeholder="+54 11 0000-0000"
                value={values.telefono}
                onChange={e => setField("telefono", e.target.value)}
                error={errors.telefono}
              />
            </div>
          )}

          <PasswordField
            label="Contraseña"
            placeholder={isRegister ? "Mínimo 8 caracteres" : "••••••••"}
            value={values.password}
            onChange={e => setField("password", e.target.value)}
            error={errors.password}
          />

          {isRegister && (
            <PasswordField
              label="Confirmar contraseña"
              placeholder="Repetí la contraseña"
              value={values.confirmPassword}
              onChange={e => setField("confirmPassword", e.target.value)}
              error={errors.confirmPassword}
            />
          )}

          {!isRegister && (
            <div className="login-options">
              <label className="check-row">
                <input type="checkbox" defaultChecked />
                <span>Mantener sesión iniciada</span>
              </label>
              <button type="button" className="link-button">¿Olvidaste tu contraseña?</button>
            </div>
          )}

          {submitError && <small className="field-error standalone"><Lock size={11} /> {submitError}</small>}

          <button className="primary-button auth-submit" type="submit" disabled={loading}>
            {loading ? "Creando cuenta..." : isRegister ? "Crear cuenta gratuita" : "Iniciar sesión"}
          </button>
        </form>

        <div className="auth-switch">
          <span>{isRegister ? "¿Ya tenés cuenta?" : "¿Nuevo en StockAI?"}</span>
          <Link to={isRegister ? "/login" : "/registro"}>
            {isRegister ? "Iniciá sesión" : "Crear una cuenta gratuita"}
          </Link>
        </div>
      </div>
    </main>
  );
}
