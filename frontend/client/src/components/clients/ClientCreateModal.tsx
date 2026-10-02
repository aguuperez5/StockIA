import {
  AlertCircle,
  Check,
  Mail,
  MessageSquare,
  Phone,
  User,
  UserPlus,
  X,
} from "lucide-react";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { customerService } from "@/services/backlog";

const EMAIL_REGEX = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/;
const PHONE_REGEX = /^\+?[0-9\s\-()]{7,25}$/;

const CONTACT_PRESETS = [
  "WhatsApp",
  "Mostrador",
  "Telegram",
  "Teléfono",
  "Email",
  "Vendedor asignado",
];

function validateCustomer(form: {
  name: string;
  contact: string;
  email: string;
  phone: string;
}) {
  const next: Record<string, string> = {};
  if (!form.name.trim()) next.name = "Ingresá el nombre o razón social del cliente.";
  if (!form.contact.trim()) next.contact = "Ingresá o seleccioná un medio de contacto.";
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

  const handleChipClick = (preset: string) => {
    setForm(prev => {
      // Si ya está seleccionado este preset, lo deselecciona
      if (prev.contact === preset) {
        return { ...prev, contact: "" };
      }
      // Si no, asigna directamente este preset (sin acumular ni repetir)
      return { ...prev, contact: preset };
    });
    if (formErrors.contact) {
      setFormErrors(prev => {
        const next = { ...prev };
        delete next.contact;
        return next;
      });
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
            {/* Nombre completo */}
            <label className="field-group full-width">
              <span className="field-label">
                <User size={14} />
                Nombre completo o Razón Social *
              </span>
              <input
                required
                className={`input-field ${formErrors.name ? "input-field-error" : ""}`}
                value={form.name}
                onChange={e => {
                  setForm({ ...form, name: e.target.value });
                  if (formErrors.name) setFormErrors({ ...formErrors, name: "" });
                }}
                placeholder="Ej. Ana Gómez, Ferretería Central, Distribuidora San Martín..."
                autoFocus
              />
              {formErrors.name && (
                <small className="field-error">
                  <AlertCircle size={13} />
                  {formErrors.name}
                </small>
              )}
            </label>

            {/* Medio de contacto */}
            <div className="field-group full-width">
              <div className="field-label-row">
                <label className="field-label" htmlFor="client-contact-input">
                  <MessageSquare size={14} />
                  Medio de contacto principal *
                </label>
                {form.contact && (
                  <button
                    type="button"
                    className="client-clear-link"
                    onClick={() => {
                      setForm({ ...form, contact: "" });
                      if (formErrors.contact) {
                        setFormErrors(prev => {
                          const next = { ...prev };
                          delete next.contact;
                          return next;
                        });
                      }
                    }}
                    title="Eliminar medio de contacto"
                  >
                    <X size={12} />
                    Limpiar
                  </button>
                )}
              </div>
              <div className="client-input-wrapper">
                <input
                  id="client-contact-input"
                  required
                  className={`input-field ${formErrors.contact ? "input-field-error" : ""}`}
                  value={form.contact}
                  onChange={e => {
                    setForm({ ...form, contact: e.target.value });
                    if (formErrors.contact) setFormErrors({ ...formErrors, contact: "" });
                  }}
                  placeholder="Ej. WhatsApp (+54 9 11...), Mostrador, telegram:@ana..."
                />
                {form.contact && (
                  <button
                    type="button"
                    className="client-field-clear-btn"
                    onClick={() => {
                      setForm({ ...form, contact: "" });
                      if (formErrors.contact) {
                        setFormErrors(prev => {
                          const next = { ...prev };
                          delete next.contact;
                          return next;
                        });
                      }
                    }}
                    title="Borrar medio de contacto"
                    aria-label="Borrar medio de contacto"
                  >
                    <X size={13} />
                  </button>
                )}
              </div>
              <div className="client-quick-chips">
                <span className="client-quick-chips-label">Atajos rápidos:</span>
                {CONTACT_PRESETS.map(preset => {
                  const isSelected = form.contact === preset;
                  return (
                    <button
                      key={preset}
                      type="button"
                      className={`client-chip-btn ${isSelected ? "active" : ""}`}
                      onClick={() => handleChipClick(preset)}
                      title={isSelected ? `Deseleccionar ${preset}` : `Seleccionar ${preset}`}
                    >
                      {preset}
                      {isSelected && <X size={11} className="chip-dismiss-icon" />}
                    </button>
                  );
                })}
              </div>
              {formErrors.contact && (
                <small className="field-error">
                  <AlertCircle size={13} />
                  {formErrors.contact}
                </small>
              )}
            </div>

            {/* Correo electrónico */}
            <label className="field-group">
              <span className="field-label">
                <Mail size={14} />
                Correo electrónico
              </span>
              <input
                type="email"
                className={`input-field ${formErrors.email ? "input-field-error" : ""}`}
                value={form.email}
                onChange={e => {
                  setForm({ ...form, email: e.target.value });
                  if (formErrors.email) setFormErrors({ ...formErrors, email: "" });
                }}
                placeholder="cliente@ejemplo.com"
              />
              {formErrors.email && (
                <small className="field-error">
                  <AlertCircle size={13} />
                  {formErrors.email}
                </small>
              )}
            </label>

            {/* Teléfono */}
            <label className="field-group">
              <span className="field-label">
                <Phone size={14} />
                Teléfono / WhatsApp
              </span>
              <input
                type="tel"
                className={`input-field ${formErrors.phone ? "input-field-error" : ""}`}
                value={form.phone}
                onChange={e => {
                  setForm({ ...form, phone: e.target.value });
                  if (formErrors.phone) setFormErrors({ ...formErrors, phone: "" });
                }}
                placeholder="+54 9 11 1234-5678"
              />
              {formErrors.phone && (
                <small className="field-error">
                  <AlertCircle size={13} />
                  {formErrors.phone}
                </small>
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
