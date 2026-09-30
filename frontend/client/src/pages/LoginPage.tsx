import {
  ArrowRight,
  Boxes,
  Eye,
  EyeOff,
  LockKeyhole,
  Store,
} from "lucide-react";
import { useState } from "react";
import { useLocation } from "wouter";
import { useStockAuth } from "@/contexts/StockAuthContext";

export default function LoginPage() {
  const [, setLocation] = useLocation();
  const { login } = useStockAuth();
  const [form, setForm] = useState({ email: "", password: "" });
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [pending, setPending] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  const submit = async (event: React.FormEvent) => {
    event.preventDefault();
    const next: Record<string, string> = {};
    if (
      !/^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/.test(
        form.email.trim()
      )
    )
      next.email =
        "Ingresá un correo electrónico válido (ej. usuario@gmail.com).";
    if (!form.password) next.password = "Ingresá tu contraseña.";
    setErrors(next);
    if (Object.keys(next).length) return;
    setPending(true);
    try {
      await login(form.email, form.password);
      setLocation("/");
    } catch (reason) {
      setErrors({ form: (reason as Error).message });
    } finally {
      setPending(false);
    }
  };

  return (
    <div className="auth-login-page">
      <header className="auth-login-header">
        <button
          className="auth-login-brand"
          onClick={() => setLocation("/login")}
          aria-label="Ir al inicio de sesión"
        >
          <span className="auth-login-mark">
            <Store size={19} />
          </span>
          <span>
            <b>Stock</b>
            <em>IA</em>
          </span>
        </button>
        <span className="auth-login-header-caption">Gestión comercial</span>
      </header>
      <main className="auth-login-main">
        <section className="auth-login-card">
          <div className="auth-login-icon">
            <LockKeyhole size={19} />
          </div>
          <p className="eyebrow">Acceso seguro</p>
          <h1>Ingresá a StockIA</h1>
          <p className="auth-login-lead">
            Administrá tu operación desde un espacio simple y conectado.
          </p>
          {errors.form && <div className="auth-error">{errors.form}</div>}
          <form onSubmit={submit} noValidate>
            <Field label="Email" error={errors.email}>
              <input
                type="email"
                value={form.email}
                onChange={e => setForm({ ...form, email: e.target.value })}
                autoComplete="email"
                placeholder="vos@comercio.com"
              />
            </Field>
            <Field label="Contraseña" error={errors.password}>
              <div className="password-input">
                <input
                  type={showPassword ? "text" : "password"}
                  value={form.password}
                  onChange={e => setForm({ ...form, password: e.target.value })}
                  autoComplete="current-password"
                  placeholder="Tu contraseña"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(value => !value)}
                  aria-label={
                    showPassword ? "Ocultar contraseña" : "Mostrar contraseña"
                  }
                >
                  {showPassword ? <EyeOff size={17} /> : <Eye size={17} />}
                </button>
              </div>
            </Field>
            <button className="auth-submit" disabled={pending}>
              {pending ? "Ingresando…" : "Ingresar al panel"}
              <ArrowRight size={17} />
            </button>
          </form>
          <div className="auth-divider">
            <span>¿Todavía no tenés cuenta?</span>
          </div>
          <button
            className="auth-secondary"
            onClick={() => setLocation("/register")}
          >
            <Boxes size={16} />
            Crear una cuenta nueva
          </button>
        </section>
        <p className="auth-login-note">
          Tu operación queda protegida con acceso autenticado.
        </p>
      </main>
    </div>
  );
}

function Field({
  label,
  error,
  children,
}: {
  label: string;
  error?: string;
  children: React.ReactNode;
}) {
  return (
    <label className="field">
      <span>{label}</span>
      {children}
      {error && <small className="field-error">{error}</small>}
    </label>
  );
}
