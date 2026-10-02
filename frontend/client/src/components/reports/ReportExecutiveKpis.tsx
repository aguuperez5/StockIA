import { AlertTriangle, Boxes, DollarSign, ShoppingBag } from "lucide-react";
import { money } from "@/components/StockUI";
import { reportService } from "@/services/backlog";

export type ReportData = Awaited<ReturnType<typeof reportService.get>>;

export interface ReportExecutiveKpisProps {
  data: ReportData;
}

export function ReportExecutiveKpis({ data }: ReportExecutiveKpisProps) {
  const avgTicket =
    data.sales.averageTicketCents ??
    (data.sales.count
      ? Math.round(data.sales.totalCents / data.sales.count)
      : 0);

  const totalReplenishmentUnits =
    data.replenishment?.totalUnitsNeeded ?? data.lowStock.length;
  const replenishmentValue =
    data.replenishment?.totalReferenceValueCents ?? 0;

  const stagnantValue = data.stagnantStock?.totalReferenceValueCents ?? 0;
  const stagnantUnits = data.stagnantStock?.totalUnits ?? 0;

  return (
    <section className="metric-grid decision-kpis">
      <article className="metric-card">
        <span className="metric-icon-bubble">
          <DollarSign size={19} />
        </span>
        <div>
          <p>Facturación total</p>
          <h2>{money(data.sales.totalCents)}</h2>
          <small>
            {data.sales.count} comprobante{data.sales.count === 1 ? "" : "s"}{" "}
            cobrado{data.sales.count === 1 ? "" : "s"}
          </small>
        </div>
      </article>

      <article className="metric-card">
        <span className="metric-icon-bubble">
          <ShoppingBag size={19} />
        </span>
        <div>
          <p>Ticket promedio</p>
          <h2>{money(avgTicket)}</h2>
          <small>Gasto medio por operación</small>
        </div>
      </article>

      <article className="metric-card">
        <span className="metric-icon-bubble alert-bubble">
          <AlertTriangle size={19} />
        </span>
        <div>
          <p>Plan de reposición urgente</p>
          <h2>
            +{totalReplenishmentUnits} <small>un.</small>
          </h2>
          <small>Inversión estimada: {money(replenishmentValue)}</small>
        </div>
      </article>

      <article className="metric-card">
        <span className="metric-icon-bubble warn-bubble">
          <Boxes size={19} />
        </span>
        <div>
          <p>Capital inmovilizado</p>
          <h2>{money(stagnantValue)}</h2>
          <small>{stagnantUnits} unidades sin rotación</small>
        </div>
      </article>
    </section>
  );
}
