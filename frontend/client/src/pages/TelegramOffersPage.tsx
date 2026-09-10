import { useEffect, useState } from "react";
import { toast } from "sonner";
import { EmptyState, ErrorPanel, PageHeader } from "@/components/StockUI";
import { telegramService } from "@/services/backlog";

const STATUSES = ["Lista para enviar", "Enviada", "Archivada"];

export default function TelegramOffersPage() {
  const [items, setItems] = useState<Awaited<ReturnType<typeof telegramService.list>>["items"]>([]);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [pending, setPending] = useState(false);
  const load = () => telegramService.list().then(r => setItems(r.items)).catch(e => setError(e.message));
  useEffect(() => { void load(); }, []);
  const create = async (e: React.FormEvent) => {
    e.preventDefault();
    setPending(true);
    try {
      await telegramService.create({ message, productIds: [], customerIds: [], status: "Lista para enviar" });
      setMessage("");
      toast.success("Campaña guardada correctamente.");
      load();
    } catch (e) { setError((e as Error).message); }
    finally { setPending(false); }
  };
  const changeStatus = async (id: number, status: string) => {
    try { await telegramService.updateStatus(id, status); load(); }
    catch (e) { setError((e as Error).message); }
  };
  return <>
    <PageHeader eyebrow="Comunicación" title="Ofertas por Telegram" description="Armá y previsualizá campañas. El envío real queda pendiente de credenciales del bot." />
    {error && <ErrorPanel message={error} />}
    <form className="form-card form-card-pad" onSubmit={create}>
      <div className="form-grid">
        <label className="field"><span>Mensaje de campaña</span><textarea value={message} onChange={e => setMessage(e.target.value)} required placeholder="Oferta de la semana…" /></label>
      </div>
      <button className="button-primary" disabled={pending}>{pending ? "Guardando…" : "Guardar como lista para enviar"}</button>
    </form>
    {items.length ? <div className="data-table">{items.map(item => <div className="data-table-row" key={item.id}><b>{item.message}</b><select value={item.status} onChange={e => void changeStatus(item.id, e.target.value)} aria-label={`Estado de campaña ${item.id}`}>{STATUSES.map(option => <option key={option}>{option}</option>)}</select></div>)}</div> : <EmptyState title="Todavía no hay campañas" detail="Escribí el primer mensaje para armar una oferta para tus clientes." />}
  </>;
}
