import React, { useState } from "react";
import { ChevronLeft, ChevronDown, Eye, EyeOff, TriangleAlert } from "lucide-react";
import { Link } from "react-router-dom";

/* ---------- Campo de texto genérico con soporte de error (SB-023) ---------- */
export function Field({ label, icon: Icon, error, hint, ...inputProps }) {
  return (
    <label className="field">
      <span>{label}</span>
      <div className={`input-wrap ${error ? "has-error" : ""}`}>
        {Icon && <Icon size={17} />}
        <input {...inputProps} />
      </div>
      {error ? <FieldError message={error} /> : hint ? <small className="field-hint">{hint}</small> : null}
    </label>
  );
}

export function TextAreaField({ label, error, hint, ...props }) {
  return (
    <label className="field">
      <span>{label}</span>
      <textarea className={error ? "has-error" : ""} {...props} />
      {error ? <FieldError message={error} /> : hint ? <small className="field-hint">{hint}</small> : null}
    </label>
  );
}

export function PasswordField({ label, error, ...inputProps }) {
  const [visible, setVisible] = useState(false);
  return (
    <label className="field">
      <span>{label}</span>
      <div className={`input-wrap ${error ? "has-error" : ""}`}>
        <input type={visible ? "text" : "password"} {...inputProps} />
        <button type="button" className="input-icon-button" onClick={() => setVisible(v => !v)}>
          {visible ? <EyeOff size={17} /> : <Eye size={17} />}
        </button>
      </div>
      {error && <FieldError message={error} />}
    </label>
  );
}

/** Select nativo estilizado para que combine con el resto del sistema de diseño */
export function SelectField({ label, error, hint, options = [], placeholder, ...selectProps }) {
  return (
    <label className="field">
      <span>{label}</span>
      <div className={`select-wrap ${error ? "has-error" : ""}`}>
        <select className="select-native" {...selectProps}>
          {placeholder && <option value="">{placeholder}</option>}
          {options.map(opt =>
            typeof opt === "string" ? (
              <option key={opt} value={opt}>{opt}</option>
            ) : (
              <option key={opt.value} value={opt.value}>{opt.label}</option>
            )
          )}
        </select>
        <ChevronDown size={16} />
      </div>
      {error ? <FieldError message={error} /> : hint ? <small className="field-hint">{hint}</small> : null}
    </label>
  );
}

export function FieldError({ message }) {
  return (
    <small className="field-error">
      <TriangleAlert size={11} /> {message}
    </small>
  );
}

export function Panel({ title, children, action }) {
  return (
    <section className="panel-card">
      <div className="panel-title"><span>{title}</span>{action}</div>
      {children}
    </section>
  );
}

export function PageHeading({ title, subtitle, children }) {
  return (
    <div className="page-heading">
      <div>
        <h1>{title}</h1>
        {subtitle && <p>{subtitle}</p>}
      </div>
      {children}
    </div>
  );
}

export function BackHeading({ title, subtitle, to, children }) {
  return (
    <div className="page-heading compact">
      <div>
        <Link className="back-square" to={to}><ChevronLeft size={18} /></Link>
        <div><h1>{title}</h1>{subtitle && <p>{subtitle}</p>}</div>
      </div>
      {children}
    </div>
  );
}

export function StatusBadge({ level }) {
  const toneMap = {
    "Crítico": "danger",
    "Sin stock": "danger",
    "Bajo": "warning",
    "Normal": "ok",
  };
  return <b className={`badge ${toneMap[level] || "ok"}`}>{level}</b>;
}

export function EmptyState({ icon: Icon, title, text }) {
  return (
    <div className="empty-detection" style={{ margin: "10px 0" }}>
      {Icon && <Icon size={26} />}
      <strong style={{ fontSize: 11, margin: "6px 0 2px" }}>{title}</strong>
      {text && <p>{text}</p>}
    </div>
  );
}

export function Banner({ tone = "success", children }) {
  return <div className={`banner ${tone}`}>{children}</div>;
}
