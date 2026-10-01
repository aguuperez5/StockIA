import { Search } from "lucide-react";
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
  const [, setLocation] = useLocation();
  const { user } = useStockAuth();
  const canManageClients =
    user?.appRole === "administrador" || user?.appRole === "caja";
  const [items, setItems] = useState<Customer[]>([]);
  const [search, setSearch] = useState("");
  const reqVersion = useRef(0);
  const [form, setForm] = useState({
    name: "",
    contact: "",
    email: "",
    phone: "",
  });
  const [error, setError] = useState("");
  const [pending, setPending] = useState(false);
  const [formErrors, setFormErrors] = useState<Record<string, string>>({});
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
  const create = async (e: React.FormEvent) => {
    e.preventDefault();
    const next = validateCustomer(form);
    setFormErrors(next);
    if (Object.keys(next).length) return;
    setPending(true);
    try {
      await customerService.create(form);
      setForm({ name: "", contact: "", email: "", phone: "" });
      toast.success("Cliente registrado correctamente.");
      load(search);
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setPending(false);
    }
  };
  return (
    <>
      <PageHeader
        eyebrow="Relación comercial"
        title="Clientes"
        description="Registrá contactos y consultá sus hábitos de compra."
      />
      {error && <ErrorPanel message={error} />}
      {canManageClients && (
        <form className="form-card form-card-pad" onSubmit={create}>
          <div className="form-grid two">
            {(["name", "contact", "email", "phone"] as const).map(key => (
              <label className="field" key={key}>
                <span>
                  {key === "name"
                    ? "Nombre"
                    : key === "contact"
                      ? "Contacto"
                      : key === "email"
                        ? "Email"
                        : "Teléfono"}
                </span>
                <input
                  value={form[key]}
                  onChange={e => setForm({ ...form, [key]: e.target.value })}
                  placeholder={
                    key === "name"
                      ? "Ej. Ana Gómez"
                      : key === "contact"
                        ? "Ej. telegram:@ana"
                        : key === "email"
                          ? "Ej. cliente@gmail.com"
                          : "Ej. +54 9 11 1234-5678"
                  }
                />
                {formErrors[key] && (
                  <small className="field-error">{formErrors[key]}</small>
                )}
              </label>
            ))}
          </div>
          <button className="button-primary" disabled={pending}>
            {pending ? "Agregando…" : "Agregar cliente"}
          </button>
        </form>
      )}
      <section className="filter-bar">
        <label className="search-control">
          <Search size={17} />
          <input
            value={search}
            onChange={event => setSearch(event.target.value)}
            placeholder="Buscar por nombre, contacto o email"
            aria-label="Buscar clientes"
          />
        </label>
      </section>
      {items.length ? (
        <div className="data-table" role="list">
          {items.map(item => (
            <button
              className="data-table-row"
              key={item.id}
              role="listitem"
              onClick={() => setLocation(`/clients/${item.id}`)}
            >
              <b>{item.name}</b>
              <span>{item.contact}</span>
              <span>{item.email ?? item.phone ?? "Sin datos adicionales"}</span>
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
              : "El primer cliente se puede registrar desde el formulario."
          }
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
              className="bg-red-700 hover:bg-red-800"
            >
              {pending ? "Eliminando…" : "Eliminar cliente"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
