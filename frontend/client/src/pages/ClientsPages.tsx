import { ChevronRight, Mail, Phone, Plus, Search, User, X } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { Redirect, useRoute } from "wouter";
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

export function ClientsPage() {
  const { user } = useStockAuth();
  const canManageClients =
    user?.appRole === "administrador" || user?.appRole === "caja";
  const [items, setItems] = useState<Customer[]>([]);
  const [search, setSearch] = useState("");
  const reqVersion = useRef(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [selectedCustomerId, setSelectedCustomerId] = useState<number | null>(
    null
  );
  const [showCreateModal, setShowCreateModal] = useState(false);

  const load = (term = "") => {
    const currentVersion = ++reqVersion.current;
    setLoading(true);
    setError("");
    customerService
      .list(term)
      .then(r => {
        if (currentVersion === reqVersion.current) setItems(r.items);
      })
      .catch(e => {
        if (currentVersion === reqVersion.current) setError(e.message);
      })
      .finally(() => {
        if (currentVersion === reqVersion.current) setLoading(false);
      });
  };

  useEffect(() => {
    if (typeof window !== "undefined") {
      const params = new URLSearchParams(window.location.search);
      const idParam = Number(params.get("id"));
      if (Number.isInteger(idParam) && idParam > 0) {
        setSelectedCustomerId(idParam);
        window.history.replaceState(
          {},
          document.title,
          window.location.pathname
        );
      } else if (
        params.get("new") === "1" ||
        params.get("new") === "true"
      ) {
        setShowCreateModal(true);
        window.history.replaceState(
          {},
          document.title,
          window.location.pathname
        );
      }
    }
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
          {search && (
            <button
              type="button"
              className="telegram-search-clear"
              onClick={() => setSearch("")}
              aria-label="Limpiar búsqueda"
            >
              <X size={12} />
            </button>
          )}
        </label>
        <span className="client-count-chip">
          {items.length} {items.length === 1 ? "cliente" : "clientes"}
        </span>
      </section>

      {loading && <LoadingPanel rows={4} />}

      {!loading &&
        !error &&
        (items.length ? (
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
            action={
              search ? (
                <button
                  type="button"
                  className="button-secondary"
                  onClick={() => setSearch("")}
                >
                  Limpiar búsqueda
                </button>
              ) : undefined
            }
          />
        ))}

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
  const id = params?.id ? encodeURIComponent(params.id) : "";
  return <Redirect to={id ? `/clients?id=${id}` : "/clients"} />;
}
