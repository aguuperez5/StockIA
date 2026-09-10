import { ArrowLeft, ArrowRight, Eye, EyeOff, LockKeyhole, Store, UserRoundPlus } from "lucide-react";
import { useState } from "react";
import { useLocation } from "wouter";
import { toast } from "sonner";
import { useStockAuth } from "@/contexts/StockAuthContext";

export default function RegisterPage() {
  const [, setLocation] = useLocation();
  const { register } = useStockAuth();
  const [form, setForm] = useState({ fullName: "", email: "", password: "", confirmPassword: "" });
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [pending, setPending] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  const submit = async (event: React.FormEvent) => {
    event.preventDefault();
    const next: Record<string, string> = {};
    if (!form.fullName.trim()) next.fullName = "Ingresá tu nombre completo.";
    if (!/^\S+@\S+\.\S+$/.test(form.email)) next.email = "Ingresá un email válido.";
    if (form.password.length < 8) next.password = "Usá al menos 8 caracteres.";
    if (form.password !== form.confirmPassword) next.confirmPassword = "Las contraseñas no coinciden.";
    setErrors(next);
    if (Object.keys(next).length) return;
    setPending(true);
    try { await register(form.fullName, form.email, form.password); toast.success("Cuenta creada. ¡Bienvenido a StockIA!"); setLocation("/"); }
    catch (reason) { setErrors({ form: (reason as Error).message }); }
    finally { setPending(false); }
  };

  return <div className="auth-login-page">
    <header className="auth-login-header"><button className="auth-login-brand" onClick={() => setLocation("/login")} aria-label="Volver al inicio de sesión"><span className="auth-login-mark"><Store size={19} /></span><span><b>Stock</b><em>IA</em></span></button><span className="auth-login-header-caption">Gestión comercial</span></header>
    <main className="auth-login-main auth-register-main"><section className="auth-login-card auth-register-card"><button className="auth-back auth-register-back" type="button" onClick={() => setLocation("/login")}><ArrowLeft size={15} />Volver a iniciar sesión</button><div className="auth-login-icon"><UserRoundPlus size={19} /></div><p className="eyebrow">Tu espacio de trabajo</p><h1>Creá tu cuenta</h1><p className="auth-login-lead">Configurá tu acceso y empezá a ordenar tu operación.</p>{errors.form && <div className="auth-error">{errors.form}</div>}<form onSubmit={submit} noValidate><Field label="Nombre completo" error={errors.fullName}><input value={form.fullName} onChange={e => setForm({ ...form, fullName: e.target.value })} autoComplete="name" placeholder="Tu nombre y apellido" /></Field><Field label="Email" error={errors.email}><input type="email" value={form.email} onChange={e => setForm({ ...form, email: e.target.value })} autoComplete="email" placeholder="vos@comercio.com" /></Field><Field label="Contraseña" error={errors.password}><div className="password-input"><input type={showPassword ? "text" : "password"} value={form.password} onChange={e => setForm({ ...form, password: e.target.value })} autoComplete="new-password" placeholder="Mínimo 8 caracteres" /><button type="button" onClick={() => setShowPassword(value => !value)} aria-label={showPassword ? "Ocultar contraseña" : "Mostrar contraseña"}>{showPassword ? <EyeOff size={17} /> : <Eye size={17} />}</button></div></Field><Field label="Repetir contraseña" error={errors.confirmPassword}><input type="password" value={form.confirmPassword} onChange={e => setForm({ ...form, confirmPassword: e.target.value })} autoComplete="new-password" placeholder="Volvé a escribirla" /></Field><button className="auth-submit" disabled={pending}>{pending ? "Creando cuenta…" : "Crear cuenta"}<ArrowRight size={17} /></button></form></section><p className="auth-login-note">Al crear tu cuenta vas a poder administrar tu operación de forma segura.</p></main>
  </div>;
}

function Field({ label, error, children }: { label: string; error?: string; children: React.ReactNode }) { return <label className="field"><span>{label}</span>{children}{error && <small className="field-error">{error}</small>}</label>; }
