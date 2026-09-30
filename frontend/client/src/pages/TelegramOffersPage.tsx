import { useEffect, useState } from "react";
import { toast } from "sonner";
import { EmptyState, ErrorPanel, PageHeader } from "@/components/StockUI";
import { customerService, telegramService } from "@/services/backlog";

const STATUSES = ["Lista para enviar", "Enviada", "Archivada"];

export default function TelegramOffersPage() {
  const [items, setItems] = useState<
    Awaited<ReturnType<typeof telegramService.list>>["items"]
  >([]);
  const [customers, setCustomers] = useState<
    Awaited<ReturnType<typeof customerService.list>>["items"]
  >([]);
  const [customerId, setCustomerId] = useState("");
  const [frequent, setFrequent] = useState<
    Array<{ productId: number; productName: string; units: number }>
  >([]);
  const [selectedProductIds, setSelectedProductIds] = useState<number[]>([]);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [pending, setPending] = useState(false);

  const load = () =>
    telegramService
      .list()
      .then(r => setItems(r.items))
      .catch(e => setError(e.message));
  useEffect(() => {
    void load();
  }, []);
  useEffect(() => {
    customerService
      .list()
      .then(r => setCustomers(r.items))
      .catch(() => undefined);
  }, []);

  useEffect(() => {
    setFrequent([]);
    setSelectedProductIds([]);
    if (!customerId) return;
    customerService
      .get(customerId)
      .then(r => setFrequent(r.frequent))
      .catch(() => undefined);
  }, [customerId]);

  const suggest = () => {
    const top = frequent.slice(0, 3);
    if (!top.length) return;
    const customer = customers.find(c => String(c.id) === customerId);
    const names = top.map(item => item.productName).join(", ");
    setMessage(
      `Hola${customer ? ` ${customer.name}` : ""}, tenemos una oferta especial en ${names}, justo los productos que más comprás. ¡Aprovechala esta semana!`
    );
    setSelectedProductIds(top.map(item => item.productId));
  };

  const create = async (e: React.FormEvent) => {
    e.preventDefault();
    setPending(true);
    try {
      await telegramService.create({
        message,
        productIds: selectedProductIds,
        customerIds: customerId ? [Number(customerId)] : [],
        status: "Lista para enviar",
      });
      setMessage("");
      setSelectedProductIds([]);
      setCustomerId("");
      toast.success("Campaña guardada correctamente.");
      load();
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setPending(false);
    }
  };

  const changeStatus = async (id: number, status: string) => {
    try {
      await telegramService.updateStatus(id, status);
      load();
    } catch (e) {
      setError((e as Error).message);
    }
  };

  return (
    <>
      <PageHeader
        eyebrow="Comunicación"
        title="Ofertas por Telegram"
        description="Armá campañas a partir de lo que cada cliente compra habitualmente. El envío real queda pendiente de credenciales del bot."
      />
      {error && <ErrorPanel message={error} />}
      <form className="form-card form-card-pad" onSubmit={create}>
        <div className="form-grid">
          <label className="field">
            <span>Cliente (opcional, para sugerir productos)</span>
            <select
              value={customerId}
              onChange={e => setCustomerId(e.target.value)}
            >
              <option value="">Sin cliente específico</option>
              {customers.map(c => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
            </select>
          </label>
          {customerId &&
            (frequent.length ? (
              <button
                type="button"
                className="button-secondary"
                onClick={suggest}
              >
                Sugerir mensaje con{" "}
                {frequent
                  .slice(0, 3)
                  .map(f => f.productName)
                  .join(", ")}
              </button>
            ) : (
              <small>
                Este cliente todavía no tiene compras registradas para sugerir
                productos.
              </small>
            ))}
          <label className="field">
            <span>Mensaje de campaña</span>
            <textarea
              value={message}
              onChange={e => setMessage(e.target.value)}
              required
              placeholder="Oferta de la semana…"
            />
          </label>
        </div>
        <button className="button-primary" disabled={pending}>
          {pending ? "Guardando…" : "Guardar como lista para enviar"}
        </button>
      </form>
      {items.length ? (
        <div className="data-table">
          {items.map(item => (
            <div className="data-table-row" key={item.id}>
              <b>{item.message}</b>
              <select
                value={item.status}
                onChange={e => void changeStatus(item.id, e.target.value)}
                aria-label={`Estado de campaña ${item.id}`}
              >
                {STATUSES.map(option => (
                  <option key={option}>{option}</option>
                ))}
              </select>
            </div>
          ))}
        </div>
      ) : (
        <EmptyState
          title="Todavía no hay campañas"
          detail="Elegí un cliente para sugerir productos, o escribí el primer mensaje manualmente."
        />
      )}
    </>
  );
}
