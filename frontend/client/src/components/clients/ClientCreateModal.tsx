import { Check, Mail, Phone, Plus, User, UserPlus, X } from "lucide-react";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { customerService } from "@/services/backlog";

const EMAIL_REGEX = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/;
const PHONE_REGEX = /^\+?[0-9\s\-()]{7,25}$/;

function validateCustomer(form: {
  name: string;
  contact: string;
  email: string;
  phone: string;
}) {
  const next: Record<string, string> = {};
  if (!form.name.trim()) next.name = "Ingresá el nombre del cliente.";
  if (!form.contact.trim()) next.contact = "Ingresá un medio de contacto.";
  const email = form.email.trim();
  if (email && !EMAIL_REGEX.test(email)) {
    next.email = "Ingresá un correo electrónico válido (ej. cliente@gmail.com).";
  }
  const phone = form.phone.trim();
  if (phone) {
    const digits = phone.replace(/\D/g, "");
    if (!PHONE_REGEX.test(phone) || digits.length < 7 || digits.length > 15) {
      next.phone =
        "Ingresá un teléfono válido (entre 7 y 15 dígitos, ej. +54 9 11 1234-5678).";
    }
  }
  return next;
}

export interface ClientCreateModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

export function ClientCreateModal({
  isOpen,
  onClose,
  onSuccess,
}: ClientCreateModalProps) {
  const [form, setForm] = useState({
    name: "",
    contact: "",
    email: "",
    phone: "",
  });
  const [formErrors, setFormErrors] = useState<Record<string, string>>({});
  const [pending, setPending] = useState(false);

  useEffect(() => {
    if (isOpen) {
      setForm({ name: "", contact: "", email: "", phone: "" });
      setFormErrors({});
    }
  }, [isOpen]);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    if (isOpen) {
      window.addEventListener("keydown", handleKeyDown);
    }
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const nextErrors = validateCustomer(form);
    setFormErrors(nextErrors);
    if (Object.keys(nextErrors).length > 0) return;

    setPending(true);
    try {
      await customerService.create({
        name: form.name.trim(),
        contact: form.contact.trim(),
        email: form.email.trim() || null,
        phone: form.phone.trim() || null,
      });
      toast.success(`Cliente "${form.name.trim()}" registrado correctamente.`);
      onSuccess();
      onClose();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Error al registrar cliente.");
    } finally {
      setPending(false);
    }
  };

  return (
    <div
      className="modal-backdrop client-modal-backdrop"
      onClick={e => {
        if (e.target === e.currentTarget) onClose();
      }}
      role="presentation"
    >
      <div
        className="modal-card client-create-modal"
        role="dialog"
        aria-modal="true"
        aria-labelledby="client-create-title"
        onClick={e => e.stopPropagation()}
      >
        {/* Encabezado */}
        <header className="modal-header client-modal-header">
          <div className="client-modal-title-group">
            <span className="client-avatar-badge client-create-badge">
              <UserPlus size={22} />
            </span>
            <div>
              <span className="modal-eyebrow">Gestión comercial · Clientes</span>
              <h2 id="client-create-title">Nuevo Cliente</h2>
              <p className="modal-desc">
                Registrá un nuevo contacto para asociarlo a ventas y seguimiento.
              </p>
            </div>
          </div>
          <button
            type="button"
            className="modal-close-btn"
            onClick={onClose}
            aria-label="Cerrar modal"
          >
            <X size={18} />
          </button>
        </header>

        {/* Formulario */}
        <form className="client-form-body" onSubmit={handleSubmit} noValidate>
          <div className="client-fields-grid">
            <label className="field-group full-width">
              <span className="field-label">Nombre completo o Razón Social *</span>
              <input
                required
                className="input-field"
                value={form.name}
                onChange={e => setForm({ ...form, name: e.target.value })}
                placeholder="Ej. Ana Gómez, Ferretería Central..."
              />
              {formErrors.name && (
                <small className="field-error">{formErrors.name}</small>
              )}
            </label>

            <label className="field-group full-width">
              <span className="field-label">Medio de contacto principal *</span>
              <input
                required
                className="input-field"
                value={form.contact}
                onChange={e => setForm({ ...form, contact: e.target.value })}
                placeholder="Ej. telegram:@ana, WhatsApp, Mostrador, Vendedor asignado"
              />
              {formErrors.contact && (
                <small className="field-error">{formErrors.contact}</small>
              )}
            </label>

            <label className="field-group">
              <span className="field-label">Correo electrónico</span>
              <input
                type="email"
                className="input-field"
                value={form.email}
                onChange={e => setForm({ ...form, email: e.target.value })}
                placeholder="cliente@ejemplo.com"
              />
              {formErrors.email && (
                <small className="field-error">{formErrors.email}</small>
              )}
            </label>

            <label className="field-group">
              <span className="field-label">Teléfono / WhatsApp</span>
              <input
                type="tel"
                className="input-field"
                value={form.phone}
                onChange={e => setForm({ ...form, phone: e.target.value })}
                placeholder="+54 9 11 1234-5678"
              />
              {formErrors.phone && (
                <small className="field-error">{formErrors.phone}</small>
              )}
            </label>
          </div>

          <footer className="client-modal-footer">
            <button
              type="button"
              className="button-secondary"
              onClick={onClose}
              disabled={pending}
            >
              Cancelar
            </button>
            <button
              type="submit"
              className="button-primary save-client-btn"
              disabled={pending}
            >
              <Check size={16} />
              {pending ? "Guardando..." : "Crear cliente"}
            </button>
          </footer>
        </form>
      </div>
    </div>
  );
}
