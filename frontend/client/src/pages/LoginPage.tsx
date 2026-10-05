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
import { Field } from "@/components/StockUI";
import {
  validateEmail,
  validateLoginForm,
  validatePassword,
} from "@/pages/loginValidation";

export default function LoginPage() {
  const [, setLocation] = useLocation();
  const { login } = useStockAuth();
  const [form, setForm] = useState({ email: "", password: "" });
  const [touched, setTouched] = useState({ email: false, password: false });
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [pending, setPending] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  const handleEmailChange = (value: string) => {
    setForm(prev => ({ ...prev, email: value }));
    if (touched.email) {
      const err = validateEmail(value);
      setErrors(prev => {
        const next = { ...prev };
        if (err) next.email = err;
        else delete next.email;
        return next;
      });
    }
  };

  const handleEmailBlur = () => {
    setTouched(prev => ({ ...prev, email: true }));
    const err = validateEmail(form.email);
    setErrors(prev => {
      const next = { ...prev };
      if (err) next.email = err;
      else delete next.email;
      return next;
    });
  };

  const handlePasswordChange = (value: string) => {
    setForm(prev => ({ ...prev, password: value }));
    if (touched.password) {
      const err = validatePassword(value);
      setErrors(prev => {
        const next = { ...prev };
        if (err) next.password = err;
        else delete next.password;
        return next;
      });
    }
  };

  const handlePasswordBlur = () => {
    setTouched(prev => ({ ...prev, password: true }));
    const err = validatePassword(form.password);
    setErrors(prev => {
      const next = { ...prev };
      if (err) next.password = err;
      else delete next.password;
      return next;
    });
  };

  const submit = async (event: React.FormEvent) => {
    event.preventDefault();
    setTouched({ email: true, password: true });
    const validation = validateLoginForm(form);
    const nextErrors: Record<string, string> = {};
    if (validation.email) nextErrors.email = validation.email;
    if (validation.password) nextErrors.password = validation.password;
    setErrors(nextErrors);

    if (!validation.isValid) return;

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
          {errors.form && (
            <div className="auth-error" role="alert" aria-live="assertive">
              {errors.form}
            </div>
          )}
          <form onSubmit={submit} noValidate>
            <Field label="Email" error={errors.email} htmlFor="login-email">
              <input
                id="login-email"
                type="email"
                value={form.email}
                onChange={e => handleEmailChange(e.target.value)}
                onBlur={handleEmailBlur}
                aria-invalid={Boolean(errors.email)}
                aria-describedby={errors.email ? "login-email-error" : undefined}
                autoComplete="email"
                placeholder="vos@comercio.com"
              />
            </Field>
            <Field
              label="Contraseña"
              error={errors.password}
              htmlFor="login-password"
            >
              <div className="password-input">
                <input
                  id="login-password"
                  type={showPassword ? "text" : "password"}
                  value={form.password}
                  onChange={e => handlePasswordChange(e.target.value)}
                  onBlur={handlePasswordBlur}
                  aria-invalid={Boolean(errors.password)}
                  aria-describedby={
                    errors.password ? "login-password-error" : undefined
                  }
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
            <button className="auth-submit" disabled={pending} type="submit">
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
