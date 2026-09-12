import { useEffect, useState } from "react";
import { ErrorPanel, PageHeader } from "@/components/StockUI";
import { teamService } from "@/services/backlog";

const ROLE_LABELS: Record<string, { label: string; description: string }> = {
  administrador: { label: "Administrador", description: "Acceso total: productos, depósitos, ventas, reportes y equipo." },
  caja: { label: "Caja", description: "Puede registrar ventas y consultar el catálogo." },
  deposito: { label: "Depósito", description: "Puede gestionar stock y transferencias entre depósitos." },
};

function initials(name: string) {
  return name.split(" ").filter(Boolean).slice(0, 2).map(part => part[0]?.toUpperCase()).join("");
}

export default function TeamPage() {
  const [items, setItems] = useState<Awaited<ReturnType<typeof teamService.list>>["items"]>([]);
  const [error, setError] = useState("");
  const load = () => teamService.list().then(r => setItems(r.items)).catch(e => setError(e.message));
  useEffect(() => { void load(); }, []);

  const update = async (id: number, appRole: string) => {
    try { await teamService.updateRole(id, appRole); load(); }
    catch (e) { setError((e as Error).message); }
  };

  return <>
    <PageHeader eyebrow="Administración" title="Equipo y roles" description="Asigná perfiles reales de caja, depósito y administración." />
    {error && <ErrorPanel message={error} />}
    <div className="team-grid">
      {items.map(item => {
        const role = ROLE_LABELS[item.appRole] ?? { label: item.appRole, description: "" };
        return (
          <article className="team-card" key={item.id}>
            <span className="team-avatar">{initials(item.fullName)}</span>
            <div className="team-card-body">
              <b>{item.fullName}</b>
              <small>{item.email}</small>
              <span className="team-role-desc">{role.description}</span>
            </div>
            <select value={item.appRole} onChange={e => void update(item.id, e.target.value)} aria-label={`Rol de ${item.fullName}`}>
              <option value="administrador">Administrador</option>
              <option value="caja">Caja</option>
              <option value="deposito">Depósito</option>
            </select>
          </article>
        );
      })}
    </div>
  </>;
}