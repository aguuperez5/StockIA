import {
  AlertCircle,
  Calendar,
  Edit3,
  Mail,
  Package,
  Phone,
  Receipt,
  ShoppingBag,
  Trash2,
  User,
  X,
} from "lucide-react";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  customerService,
  type CustomerDetail,
} from "@/services/backlog";

const EMAIL_REGEX = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/;
const PHONE_REGEX = /^\+?[0-9\s\-()]{7,25}$/;

function validateCustomer(form: {
  name: string;
  contact: string;
  email: string;
  phone: string;
}) {
  const next: Record<string, string> = {};
  if (!form.name.trim()) next.name = "Ingresá el nombre.";
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

export interface ClientDetailModalProps {
  customerId: number | null;
  isOpen: boolean;
  onClose: () => void;
  canManage: boolean;
  onClientUpdated?: () => void;
  onClientDeleted?: () => void;
}

export function ClientDetailModal({
  customerId,
  isOpen,
  onClose,
  canManage,
  onClientUpdated,
  onClientDeleted,
}: ClientDetailModalProps) {
  const [data, setData] = useState<CustomerDetail | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [activeTab, setActiveTab] = useState<"frequent" | "sales">("frequent");

  // Edición dentro del modal
  const [isEditing, setIsEditing] = useState(false);
  const [editForm, setEditForm] = useState({
    name: "",
    contact: "",
    email: "",
    phone: "",
  });
  const [formErrors, setFormErrors] = useState<Record<string, string>>({});
  const [isSaving, setIsSaving] = useState(false);

  // Eliminación
  const [confirmingDelete, setConfirmingDelete] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);

  // Carga de datos del cliente
  const loadDetail = async (id: number) => {
    setLoading(true);
    setError("");
    try {
      const res = await customerService.get(id);
      setData(res);
      setEditForm({
        name: res.customer.name,
        contact: res.customer.contact,
        email: res.customer.email ?? "",
        phone: res.customer.phone ?? "",
      });
      setIsEditing(false);
      setFormErrors({});
    } catch (err) {
      setError(err instanceof Error ? err.message : "Error al cargar cliente");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (isOpen && customerId) {
      loadDetail(customerId);
    } else {
      setData(null);
      setIsEditing(false);
      setError("");
    }
  }, [isOpen, customerId]);

  // Manejo de tecla Escape
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape" && !confirmingDelete) {
        onClose();
      }
    };
    if (isOpen) {
      window.addEventListener("keydown", handleKeyDown);
    }
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isOpen, confirmingDelete, onClose]);

  if (!isOpen) return null;

  const handleSaveEdit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!customerId) return;

    const nextErrors = validateCustomer(editForm);
    setFormErrors(nextErrors);
    if (Object.keys(nextErrors).length > 0) return;

    setIsSaving(true);
    try {
      await customerService.update(customerId, {
        name: editForm.name.trim(),
        contact: editForm.contact.trim(),
        email: editForm.email.trim() || null,
        phone: editForm.phone.trim() || null,
      });
      toast.success("Cliente actualizado correctamente.");
      setIsEditing(false);
      await loadDetail(customerId);
      onClientUpdated?.();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Error al guardar");
    } finally {
      setIsSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!customerId) return;
    setIsDeleting(true);
    try {
      await customerService.remove(customerId);
      toast.success(`Cliente eliminado correctamente.`);
      setConfirmingDelete(false);
      onClose();
      onClientDeleted?.();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Error al eliminar");
      setConfirmingDelete(false);
    } finally {
      setIsDeleting(false);
    }
  };

  const getInitials = (name: string) => {
    return name
      .split(" ")
      .filter(Boolean)
      .slice(0, 2)
      .map(part => part[0]?.toUpperCase())
      .join("");
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
        className="modal-card client-detail-modal"
        role="dialog"
        aria-modal="true"
        aria-labelledby="client-detail-title"
        onClick={e => e.stopPropagation()}
      >
        {/* Encabezado */}
        <header className="modal-header client-modal-header">
          <div className="client-modal-title-group">
            <div className="client-avatar-badge">
              {data?.customer.name ? (
                <span>{getInitials(data.customer.name)}</span>
              ) : (
                <User size={22} />
              )}
            </div>
            <div>
              <span className="modal-eyebrow">
                Ficha Comercial {data?.customer ? `· ID #${data.customer.id}` : ""}
              </span>
              <h2 id="client-detail-title">
                {data ? data.customer.name : "Cargando cliente..."}
              </h2>
              <p className="modal-desc">
                {data?.customer.contact
                  ? `Medio principal: ${data.customer.contact}`
                  : "Detalle comercial, hábitos de compra e historial."}
              </p>
            </div>
          </div>

          <div className="client-header-actions">
            {canManage && data && !isEditing && (
              <>
                <button
                  type="button"
                  className="button-secondary button-xs client-edit-btn"
                  onClick={() => setIsEditing(true)}
                  title="Editar cliente"
                >
                  <Edit3 size={13} /> Editar
                </button>
                <button
                  type="button"
                  className="button-secondary button-xs client-delete-btn"
                  onClick={() => setConfirmingDelete(true)}
                  title="Eliminar cliente"
                >
                  <Trash2 size={13} /> Eliminar
                </button>
              </>
            )}
            <button
              type="button"
              className="modal-close-btn"
              onClick={onClose}
              aria-label="Cerrar modal"
            >
              <X size={18} />
            </button>
          </div>
        </header>

        {/* Contenido del modal */}
        <div className="client-modal-body">
          {loading && (
            <div className="client-modal-loading">
              <div className="spinner" />
              <span>Cargando datos del cliente...</span>
            </div>
          )}

          {error && !loading && (
            <div className="alert-panel error">
              <AlertCircle size={16} />
              <span>{error}</span>
            </div>
          )}

          {!loading && data && (
            <>
              {/* MODO EDICIÓN */}
              {isEditing ? (
                <form
                  className="client-edit-form"
                  onSubmit={handleSaveEdit}
                  noValidate
                >
                  <div className="client-edit-header-bar">
                    <h4>Editar información del cliente</h4>
                    <span>Modificá los datos de contacto y guardá los cambios</span>
                  </div>

                  <div className="client-edit-grid">
                    <label className="field-group">
                      <span className="field-label">Nombre completo *</span>
                      <input
                        required
                        className="input-field"
                        value={editForm.name}
                        onChange={e =>
                          setEditForm({ ...editForm, name: e.target.value })
                        }
                        placeholder="Ej. Ana Gómez"
                      />
                      {formErrors.name && (
                        <small className="field-error">{formErrors.name}</small>
                      )}
                    </label>

                    <label className="field-group">
                      <span className="field-label">Medio de contacto *</span>
                      <input
                        required
                        className="input-field"
                        value={editForm.contact}
                        onChange={e =>
                          setEditForm({ ...editForm, contact: e.target.value })
                        }
                        placeholder="Ej. telegram:@ana, WhatsApp, Mostrador"
                      />
                      {formErrors.contact && (
                        <small className="field-error">
                          {formErrors.contact}
                        </small>
                      )}
                    </label>

                    <label className="field-group">
                      <span className="field-label">Correo electrónico</span>
                      <input
                        type="email"
                        className="input-field"
                        value={editForm.email}
                        onChange={e =>
                          setEditForm({ ...editForm, email: e.target.value })
                        }
                        placeholder="cliente@ejemplo.com"
                      />
                      {formErrors.email && (
                        <small className="field-error">{formErrors.email}</small>
                      )}
                    </label>

                    <label className="field-group">
                      <span className="field-label">Teléfono</span>
                      <input
                        type="tel"
                        className="input-field"
                        value={editForm.phone}
                        onChange={e =>
                          setEditForm({ ...editForm, phone: e.target.value })
                        }
                        placeholder="+54 9 11 1234-5678"
                      />
                      {formErrors.phone && (
                        <small className="field-error">{formErrors.phone}</small>
                      )}
                    </label>
                  </div>

                  <div className="client-edit-actions">
                    <button
                      type="button"
                      className="button-secondary"
                      onClick={() => {
                        setIsEditing(false);
                        setEditForm({
                          name: data.customer.name,
                          contact: data.customer.contact,
                          email: data.customer.email ?? "",
                          phone: data.customer.phone ?? "",
                        });
                        setFormErrors({});
                      }}
                      disabled={isSaving}
                    >
                      Cancelar
                    </button>
                    <button
                      type="submit"
                      className="button-primary"
                      disabled={isSaving}
                    >
                      {isSaving ? "Guardando..." : "Guardar cambios"}
                    </button>
                  </div>
                </form>
              ) : (
                /* MODO VISTA DETALLADA */
                <div className="client-view-container">
                  {/* Tarjetas de contacto rápido */}
                  <div className="client-contact-strip">
                    <div className="client-contact-item">
                      <span className="contact-icon">
                        <User size={15} />
                      </span>
                      <div className="contact-info">
                        <span className="contact-label">Contacto</span>
                        <b>{data.customer.contact || "Sin especificar"}</b>
                      </div>
                    </div>

                    <div className="client-contact-item">
                      <span className="contact-icon">
                        <Mail size={15} />
                      </span>
                      <div className="contact-info">
                        <span className="contact-label">Email</span>
                        {data.customer.email ? (
                          <a
                            href={`mailto:${data.customer.email}`}
                            className="contact-link"
                          >
                            {data.customer.email}
                          </a>
                        ) : (
                          <span className="contact-empty">No informado</span>
                        )}
                      </div>
                    </div>

                    <div className="client-contact-item">
                      <span className="contact-icon">
                        <Phone size={15} />
                      </span>
                      <div className="contact-info">
                        <span className="contact-label">Teléfono</span>
                        {data.customer.phone ? (
                          <a
                            href={`tel:${data.customer.phone}`}
                            className="contact-link"
                          >
                            {data.customer.phone}
                          </a>
                        ) : (
                          <span className="contact-empty">No informado</span>
                        )}
                      </div>
                    </div>

                    <div className="client-contact-item">
                      <span className="contact-icon">
                        <Calendar size={15} />
                      </span>
                      <div className="contact-info">
                        <span className="contact-label">Registrado</span>
                        <b>
                          {new Date(data.customer.createdAt).toLocaleDateString(
                            "es-AR",
                            {
                              day: "2-digit",
                              month: "short",
                              year: "numeric",
                            }
                          )}
                        </b>
                      </div>
                    </div>
                  </div>

                  {/* Métricas clave */}
                  <div className="client-metrics-grid">
                    <div className="client-metric-card">
                      <span className="metric-icon-bg">
                        <ShoppingBag size={18} />
                      </span>
                      <div>
                        <p>Total en compras</p>
                        <h3>
                          {new Intl.NumberFormat("es-AR", {
                            style: "currency",
                            currency: "ARS",
                            maximumFractionDigits: 0,
                          }).format((data.totalPurchasesCents ?? 0) / 100)}
                        </h3>
                      </div>
                    </div>

                    <div className="client-metric-card">
                      <span className="metric-icon-bg">
                        <Receipt size={18} />
                      </span>
                      <div>
                        <p>Ventas registradas</p>
                        <h3>{data.purchasesCount ?? data.sales?.length ?? 0}</h3>
                      </div>
                    </div>

                    <div className="client-metric-card">
                      <span className="metric-icon-bg">
                        <Package size={18} />
                      </span>
                      <div>
                        <p>Productos recurrentes</p>
                        <h3>{data.frequent.length}</h3>
                      </div>
                    </div>
                  </div>

                  {/* Pestañas: Productos Frecuentes vs Historial de Ventas */}
                  <div className="client-tabs-nav">
                    <button
                      type="button"
                      className={`client-tab-button ${
                        activeTab === "frequent" ? "active" : ""
                      }`}
                      onClick={() => setActiveTab("frequent")}
                    >
                      <Package size={14} />
                      Productos frecuentes ({data.frequent.length})
                    </button>
                    <button
                      type="button"
                      className={`client-tab-button ${
                        activeTab === "sales" ? "active" : ""
                      }`}
                      onClick={() => setActiveTab("sales")}
                    >
                      <Receipt size={14} />
                      Historial de ventas ({data.sales?.length ?? 0})
                    </button>
                  </div>

                  {/* TAB 1: PRODUCTOS FRECUENTES */}
                  {activeTab === "frequent" && (
                    <div className="client-tab-content">
                      {data.frequent.length > 0 ? (
                        <div className="client-table-wrapper">
                          <table className="client-frequent-table">
                            <colgroup>
                              <col style={{ width: "42px" }} />
                              <col style={{ width: "auto" }} />
                              <col style={{ width: "160px" }} />
                            </colgroup>
                            <thead>
                              <tr>
                                <th className="text-center">#</th>
                                <th>Producto</th>
                                <th className="text-right">Unidades compradas</th>
                              </tr>
                            </thead>
                            <tbody>
                              {data.frequent.map((item, index) => (
                                <tr key={item.productId}>
                                  <td className="rank-cell text-center">
                                    <span className="rank-pill">
                                      {index + 1}
                                    </span>
                                  </td>
                                  <td>
                                    <div className="product-title-cell">
                                      <b>{item.productName}</b>
                                      <span>ID producto: #{item.productId}</span>
                                    </div>
                                  </td>
                                  <td className="text-right units-cell">
                                    <span className="units-badge">
                                      {item.units} unidad
                                      {item.units === 1 ? "" : "es"}
                                    </span>
                                  </td>
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        </div>
                      ) : (
                        <div className="client-empty-tab">
                          <Package size={32} />
                          <b>Sin compras registradas</b>
                          <p>
                            Cuando este cliente adquiera artículos en el punto de
                            venta, aparecerán aquí sus productos frecuentes.
                          </p>
                        </div>
                      )}
                    </div>
                  )}

                  {/* TAB 2: HISTORIAL DE VENTAS */}
                  {activeTab === "sales" && (
                    <div className="client-tab-content">
                      {data.sales && data.sales.length > 0 ? (
                        <div className="client-table-wrapper">
                          <table className="client-sales-table">
                            <colgroup>
                              <col style={{ width: "26%" }} />
                              <col style={{ width: "46%" }} />
                              <col style={{ width: "28%" }} />
                            </colgroup>
                            <thead>
                              <tr>
                                <th>Comprobante</th>
                                <th>Fecha</th>
                                <th className="text-right">Monto total</th>
                              </tr>
                            </thead>
                            <tbody>
                              {data.sales.map(sale => (
                                <tr key={sale.id}>
                                  <td>
                                    <b className="receipt-number">
                                      {sale.receiptNumber}
                                    </b>
                                  </td>
                                  <td>
                                    <span className="sale-date">
                                      {new Date(sale.createdAt).toLocaleString(
                                        "es-AR",
                                        {
                                          day: "2-digit",
                                          month: "2-digit",
                                          year: "numeric",
                                          hour: "2-digit",
                                          minute: "2-digit",
                                        }
                                      )}
                                    </span>
                                  </td>
                                  <td className="text-right sale-total-cell">
                                    <b className="sale-total">
                                      {new Intl.NumberFormat("es-AR", {
                                        style: "currency",
                                        currency: "ARS",
                                        maximumFractionDigits: 0,
                                      }).format(sale.totalCents / 100)}
                                    </b>
                                  </td>
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        </div>
                      ) : (
                        <div className="client-empty-tab">
                          <Receipt size={32} />
                          <b>No hay ventas históricas</b>
                          <p>
                            Las ventas emitidas a nombre de este cliente se
                            listarás aquí de forma automática.
                          </p>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              )}
            </>
          )}
        </div>

        {/* Pie del modal */}
        <footer className="client-modal-footer">
          <button
            type="button"
            className="button-secondary"
            onClick={onClose}
          >
            Cerrar
          </button>
        </footer>
      </div>

      {/* Diálogo de confirmación de eliminación */}
      <AlertDialog
        open={confirmingDelete}
        onOpenChange={open => {
          if (!open) setConfirmingDelete(false);
        }}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>
              ¿Eliminar cliente "{data?.customer.name}"?
            </AlertDialogTitle>
            <AlertDialogDescription>
              Se eliminará del listado de clientes. Si tiene ventas asociadas, el
              sistema impedirá la eliminación para conservar la trazabilidad del
              historial comercial.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isDeleting}>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={e => {
                e.preventDefault();
                handleDelete();
              }}
              disabled={isDeleting}
              className="bg-destructive hover:bg-destructive/90 text-destructive-foreground"
            >
              {isDeleting ? "Eliminando..." : "Confirmar eliminación"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
