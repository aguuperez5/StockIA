import { ChevronRight, Mail, Phone, Plus, Search, User } from "lucide-react";
import { useCallback, useEffect, useRef, useState } from "react";
import { useLocation, useRoute } from "wouter";
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
  EmptyState,
  ErrorPanel,
  LoadingPanel,
  PageHeader,
} from "@/components/StockUI";
import { customerService, type Customer } from "@/services/backlog";
import { useStockAuth } from "@/contexts/StockAuthContext";
import { ClientDetailModal } from "@/components/clients/ClientDetailModal";
import { ClientCreateModal } from "@/components/clients/ClientCreateModal";

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
    next.email =
      "Ingresá un correo electrónico válido (ej. cliente@gmail.com).";
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

export function ClientsPage() {
  const { user } = useStockAuth();
  const canManageClients =
    user?.appRole === "administrador" || user?.appRole === "caja";
  const [items, setItems] = useState<Customer[]>([]);
  const [search, setSearch] = useState("");
  const reqVersion = useRef(0);
  const [error, setError] = useState("");
  const [selectedCustomerId, setSelectedCustomerId] = useState<number | null>(null);
  const [showCreateModal, setShowCreateModal] = useState(false);

  const load = (term = "") => {
    const currentVersion = ++reqVersion.current;
    customerService
      .list(term)
      .then(r => {
        if (currentVersion === reqVersion.current) setItems(r.items);
      })
      .catch(e => {
        if (currentVersion === reqVersion.current) setError(e.message);
      });
  };

  useEffect(() => {
    void load();
  }, []);

  useEffect(() => {
    const timer = window.setTimeout(() => void load(search), 220);
    return () => window.clearTimeout(timer);
  }, [search]);

  return (
    <>
      <PageHeader
        eyebrow="Relación comercial"
        title="Clientes"
        description="Registrá contactos, consultá sus hábitos de compra e historial."
        action={
          canManageClients ? (
            <button
              className="button-primary"
              onClick={() => setShowCreateModal(true)}
            >
              <Plus size={16} />
              Nuevo cliente
            </button>
          ) : undefined
        }
      />
      {error && <ErrorPanel message={error} retry={() => load(search)} />}

      <section className="filter-bar client-filter-bar">
        <label className="search-control">
          <Search size={17} />
          <input
            value={search}
            onChange={event => setSearch(event.target.value)}
            placeholder="Buscar por nombre, contacto o email"
            aria-label="Buscar clientes"
          />
        </label>
        <span className="client-count-chip">
          {items.length} {items.length === 1 ? "cliente" : "clientes"}
        </span>
      </section>

      {items.length ? (
        <div className="client-list-container" role="list">
          {items.map(item => (
            <button
              type="button"
              className="client-card-item"
              key={item.id}
              role="listitem"
              onClick={() => setSelectedCustomerId(item.id)}
              aria-label={`Ver detalles de ${item.name}`}
            >
              <div className="client-card-avatar">
                <span>{item.name.slice(0, 2).toUpperCase()}</span>
              </div>

              <div className="client-card-main">
                <div className="client-card-title-line">
                  <b className="client-card-name">{item.name}</b>
                  <span className="client-id-pill">ID #{item.id}</span>
                </div>
                <div className="client-card-meta">
                  <span className="client-contact-tag">
                    <User size={12} />
                    {item.contact}
                  </span>
                </div>
              </div>

              <div className="client-card-channels">
                {item.email && (
                  <span className="client-channel-item" title={item.email}>
                    <Mail size={12} />
                    <span>{item.email}</span>
                  </span>
                )}
                {item.phone && (
                  <span className="client-channel-item" title={item.phone}>
                    <Phone size={12} />
                    <span>{item.phone}</span>
                  </span>
                )}
                {!item.email && !item.phone && (
                  <span className="client-channel-empty">
                    Sin teléfono ni email adicional
                  </span>
                )}
              </div>

              <div className="client-card-select-arrow" aria-hidden="true">
                <ChevronRight size={18} />
              </div>
            </button>
          ))}
        </div>
      ) : (
        <EmptyState
          title={
            search ? "Sin resultados para esa búsqueda" : "No hay clientes"
          }
          detail={
            search
              ? "Probá con otro nombre o contacto."
              : "El primer cliente se puede registrar presionando 'Nuevo cliente'."
          }
        />
      )}

      {/* Modal de Detalle y Edición de Cliente */}
      <ClientDetailModal
        customerId={selectedCustomerId}
        isOpen={Boolean(selectedCustomerId)}
        onClose={() => setSelectedCustomerId(null)}
        canManage={canManageClients}
        onClientUpdated={() => load(search)}
        onClientDeleted={() => {
          setSelectedCustomerId(null);
          load(search);
        }}
      />

      {/* Modal de Registro de Nuevo Cliente */}
      {canManageClients && (
        <ClientCreateModal
          isOpen={showCreateModal}
          onClose={() => setShowCreateModal(false)}
          onSuccess={() => load(search)}
        />
      )}
    </>
  );
}

export function ClientDetailPage() {
  const [, params] = useRoute("/clients/:id");
  const [, setLocation] = useLocation();
  const { user } = useStockAuth();
  const canManageClients =
    user?.appRole === "administrador" || user?.appRole === "caja";
  const [data, setData] = useState<Awaited<
    ReturnType<typeof customerService.get>
  > | null>(null);
  const [error, setError] = useState("");
  const [editing, setEditing] = useState(false);
  const [form, setForm] = useState({
    name: "",
    contact: "",
    email: "",
    phone: "",
  });
  const [pending, setPending] = useState(false);
  const [confirmingDelete, setConfirmingDelete] = useState(false);
  const [formErrors, setFormErrors] = useState<Record<string, string>>({});
  const reload = useCallback(() => {
    if (!params?.id) return;
    customerService
      .get(params.id)
      .then(result => {
        setData(result);
        setForm({
          name: result.customer.name,
          contact: result.customer.contact,
          email: result.customer.email ?? "",
          phone: result.customer.phone ?? "",
        });
      })
      .catch(e => setError(e.message));
  }, [params?.id]);

  useEffect(() => {
    let cancelled = false;
    if (params?.id) {
      customerService
        .get(params.id)
        .then(result => {
          if (cancelled) return;
          setData(result);
          setForm({
            name: result.customer.name,
            contact: result.customer.contact,
            email: result.customer.email ?? "",
            phone: result.customer.phone ?? "",
          });
        })
        .catch(e => {
          if (!cancelled) setError(e.message);
        });
    }
    return () => {
      cancelled = true;
    };
  }, [params?.id]);
  const save = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!params?.id) return;
    const next = validateCustomer(form);
    setFormErrors(next);
    if (Object.keys(next).length) return;
    setPending(true);
    try {
      await customerService.update(params.id, { ...form });
      toast.success("Cliente actualizado correctamente.");
      setEditing(false);
      reload();
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setPending(false);
    }
  };
  const remove = async () => {
    if (!params?.id) return;
    setPending(true);
    try {
      await customerService.remove(params.id);
      toast.success("Cliente eliminado correctamente.");
      setLocation("/clients");
    } catch (e) {
      setError((e as Error).message);
      setConfirmingDelete(false);
    } finally {
      setPending(false);
    }
  };
  if (error) return <ErrorPanel message={error} />;
  if (!data) return <LoadingPanel />;
  return (
    <>
      <PageHeader
        eyebrow="Cliente"
        title={data.customer.name}
        description={`Contacto: ${data.customer.contact}`}
        action={
          canManageClients ? (
            <span className="row-actions">
              <button
                className="button-secondary"
                onClick={() => setEditing(v => !v)}
              >
                {editing ? "Cancelar edición" : "Editar"}
              </button>
              <button
                className="button-secondary"
                onClick={() => setConfirmingDelete(true)}
              >
                Eliminar
              </button>
            </span>
          ) : undefined
        }
      />
      {editing && (
        <form className="form-card form-card-pad" onSubmit={save}>
          <div className="form-grid two">
            <label className="field">
              <span>Nombre</span>
              <input
                value={form.name}
                onChange={e => setForm({ ...form, name: e.target.value })}
              />
              {formErrors.name && (
                <small className="field-error">{formErrors.name}</small>
              )}
            </label>
            <label className="field">
              <span>Contacto</span>
              <input
                value={form.contact}
                onChange={e => setForm({ ...form, contact: e.target.value })}
              />
              {formErrors.contact && (
                <small className="field-error">{formErrors.contact}</small>
              )}
            </label>
            <label className="field">
              <span>Email</span>
              <input
                value={form.email}
                onChange={e => setForm({ ...form, email: e.target.value })}
              />
              {formErrors.email && (
                <small className="field-error">{formErrors.email}</small>
              )}
            </label>
            <label className="field">
              <span>Teléfono</span>
              <input
                value={form.phone}
                onChange={e => setForm({ ...form, phone: e.target.value })}
              />
              {formErrors.phone && (
                <small className="field-error">{formErrors.phone}</small>
              )}
            </label>
          </div>
          <button className="button-primary" disabled={pending}>
            {pending ? "Guardando…" : "Guardar cambios"}
          </button>
        </form>
      )}
      {data.frequent.length ? (
        <section className="data-table">
          <div className="data-table-head">
            <span>Producto frecuente</span>
            <span>Unidades compradas</span>
          </div>
          {data.frequent.map(item => (
            <div className="data-table-row" key={item.productId}>
              <b>{item.productName}</b>
              <span>{item.units}</span>
            </div>
          ))}
        </section>
      ) : (
        <EmptyState
          title="Sin compras registradas"
          detail="Cuando este cliente compre, sus productos frecuentes van a aparecer acá."
        />
      )}
      <AlertDialog
        open={confirmingDelete}
        onOpenChange={open => {
          if (!open) setConfirmingDelete(false);
        }}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>
              Eliminar a "{data.customer.name}"
            </AlertDialogTitle>
            <AlertDialogDescription>
              Se elimina del listado de clientes. Si tiene ventas asociadas, el
              sistema lo va a impedir para conservar el historial.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={pending}>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={event => {
                event.preventDefault();
                void remove();
              }}
              disabled={pending}
              className="bg-destructive hover:bg-destructive/90 text-destructive-foreground"
            >
              {pending ? "Eliminando…" : "Eliminar cliente"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
