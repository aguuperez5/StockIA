import {
  ArrowLeft,
  ArrowRight,
  Eye,
  EyeOff,
  Moon,
  Store,
  Sun,
  UserRoundPlus,
} from "lucide-react";
import { useState } from "react";
import { useLocation } from "wouter";
import { toast } from "sonner";
import { useStockAuth } from "@/contexts/StockAuthContext";
import { useTheme } from "@/contexts/ThemeContext";
import { Field } from "@/components/StockUI";

export default function RegisterPage() {
  const [, setLocation] = useLocation();
  const { register } = useStockAuth();
  const { theme, toggleTheme } = useTheme();
  const [form, setForm] = useState({
    fullName: "",
    legajo: "",
    email: "",
    password: "",
    confirmPassword: "",
  });
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [pending, setPending] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  const passwordsMatch =
    form.confirmPassword.length > 0 && form.password === form.confirmPassword;
  const passwordsMismatch =
    form.confirmPassword.length > 0 && form.password !== form.confirmPassword;

  const submit = async (event: React.FormEvent) => {
    event.preventDefault();
    const next: Record<string, string> = {};
    if (!form.fullName.trim()) next.fullName = "Ingresá tu nombre completo.";
    if (!/^\d+$/.test(form.legajo.trim()))
      next.legajo = "Ingresá un legajo numérico.";
    if (
      !/^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/.test(
        form.email.trim()
      )
    )
      next.email =
        "Ingresá un correo electrónico válido (ej. usuario@gmail.com).";
    if (form.password.length < 8) next.password = "Usá al menos 8 caracteres.";
    if (form.password !== form.confirmPassword)
      next.confirmPassword = "Las contraseñas no coinciden.";
    setErrors(next);
    if (Object.keys(next).length) return;
    setPending(true);
    try {
      await register(form.fullName, form.legajo, form.email, form.password);
      toast.success("Cuenta creada. ¡Bienvenido a StockIA!");
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
          aria-label="Volver al inicio de sesión"
        >
          <span className="auth-login-mark">
            <Store size={19} />
          </span>
          <span>
            <b>Stock</b>
            <em>IA</em>
          </span>
        </button>
        <div className="flex items-center gap-3">
          <span className="auth-login-header-caption">Gestión comercial</span>
          <button
            className="theme-toggle"
            onClick={toggleTheme}
            aria-label={
              theme === "dark" ? "Activar modo claro" : "Activar modo oscuro"
            }
            title={theme === "dark" ? "Modo claro" : "Modo oscuro"}
            type="button"
          >
            {theme === "dark" ? <Sun size={17} /> : <Moon size={17} />}
          </button>
        </div>
      </header>
      <main className="auth-login-main auth-register-main">
        <section className="auth-login-card auth-register-card">
          <button
            className="auth-back auth-register-back"
            type="button"
            onClick={() => setLocation("/login")}
          >
            <ArrowLeft size={15} />
            Volver a iniciar sesión
          </button>
          <div className="auth-login-icon">
            <UserRoundPlus size={19} />
          </div>
          <p className="eyebrow">Tu espacio de trabajo</p>
          <h1>Creá tu cuenta</h1>
          <p className="auth-login-lead">
            Configurá tu acceso y empezá a ordenar tu operación.
          </p>
          {errors.form && <div className="auth-error">{errors.form}</div>}{" "}
          <form onSubmit={submit} noValidate>
            <Field
              label="Nombre completo"
              error={errors.fullName}
              htmlFor="register-fullname"
            >
              <input
                id="register-fullname"
                value={form.fullName}
                onChange={e => setForm({ ...form, fullName: e.target.value })}
                autoComplete="name"
                placeholder="Tu nombre y apellido"
              />
            </Field>
            <Field
              label="Legajo"
              error={errors.legajo}
              htmlFor="register-legajo"
            >
              <input
                id="register-legajo"
                value={form.legajo}
                onChange={e => setForm({ ...form, legajo: e.target.value })}
                inputMode="numeric"
                placeholder="Ej. 12345"
              />
            </Field>
            <Field label="Email" error={errors.email} htmlFor="register-email">
              <input
                id="register-email"
                type="email"
                value={form.email}
                onChange={e => setForm({ ...form, email: e.target.value })}
                autoComplete="email"
                placeholder="vos@comercio.com"
              />
            </Field>
            <Field
              label="Contraseña"
              error={errors.password}
              htmlFor="register-password"
            >
              <div className="password-input">
                <input
                  id="register-password"
                  type={showPassword ? "text" : "password"}
                  value={form.password}
                  onChange={e => setForm({ ...form, password: e.target.value })}
                  autoComplete="new-password"
                  placeholder="Mínimo 8 caracteres"
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
            <Field
              label="Repetir contraseña"
              error={
                errors.confirmPassword ||
                (passwordsMismatch ? "Las contraseñas no coinciden." : undefined)
              }
              htmlFor="register-confirm-password"
            >
              <div className="password-input">
                <input
                  id="register-confirm-password"
                  type={showConfirmPassword ? "text" : "password"}
                  value={form.confirmPassword}
                  onChange={e =>
                    setForm({ ...form, confirmPassword: e.target.value })
                  }
                  autoComplete="new-password"
                  placeholder="Volvé a escribirla"
                />
                <button
                  type="button"
                  onClick={() => setShowConfirmPassword(value => !value)}
                  aria-label={
                    showConfirmPassword
                      ? "Ocultar repetición de contraseña"
                      : "Mostrar repetición de contraseña"
                  }
                >
                  {showConfirmPassword ? (
                    <EyeOff size={17} />
                  ) : (
                    <Eye size={17} />
                  )}
                </button>
              </div>
              {passwordsMatch && form.password.length >= 8 && (
                <span className="password-validation-hint valid">
                  ✓ Las contraseñas coinciden
                </span>
              )}
            </Field>
            <button className="auth-submit" disabled={pending}>
              {pending ? "Creando cuenta…" : "Crear cuenta"}
              <ArrowRight size={17} />
            </button>
          </form>
        </section>
        <p className="auth-login-note">
          Al crear tu cuenta vas a poder administrar tu operación de forma
          segura.
        </p>
      </main>
    </div>
  );
}
