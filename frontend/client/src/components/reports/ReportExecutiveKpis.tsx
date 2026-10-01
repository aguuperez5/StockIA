import { AlertTriangle, Boxes, DollarSign, ShoppingBag } from "lucide-react";
import { money } from "@/components/StockUI";
import { reportService } from "@/services/backlog";

export type ReportData = Awaited<ReturnType<typeof reportService.get>>;

export interface ReportExecutiveKpisProps {
  data: ReportData;
}

export function ReportExecutiveKpis({ data }: ReportExecutiveKpisProps) {
  return (
    <div className="metric-grid decision-kpis">
      <section className="metric-card">
        <span className="metric-icon-bubble">
          <DollarSign size={18} />
        </span>
        <div>
          <p>Facturación total</p>
          <h2>{money(data.sales.totalCents)}</h2>
          <small>{data.sales.count} comprobantes cobrados</small>
        </div>
      </section>

      <section className="metric-card">
        <span className="metric-icon-bubble">
          <ShoppingBag size={18} />
        </span>
        <div>
          <p>Ticket promedio</p>
          <h2>
            {money(
              data.sales.averageTicketCents ??
                (data.sales.count
                  ? Math.round(data.sales.totalCents / data.sales.count)
                  : 0)
            )}
          </h2>
          <small>Gasto medio por operación</small>
        </div>
      </section>

      <section className="metric-card">
        <span className="metric-icon-bubble alert-bubble">
          <AlertTriangle size={18} />
        </span>
        <div>
          <p>Unidades sugeridas para reponer</p>
          <h2>
            {data.replenishment?.totalUnitsNeeded ?? data.lowStock.length}{" "}
            <small>un.</small>
          </h2>
          <small>
            Valor de referencia a precio de lista:{" "}
            {money(data.replenishment?.totalReferenceValueCents ?? 0)}
          </small>
        </div>
      </section>

      <section className="metric-card">
        <span className="metric-icon-bubble warn-bubble">
          <Boxes size={18} />
        </span>
        <div>
          <p>Stock sin ventas (valor de lista)</p>
          <h2>{money(data.stagnantStock?.totalReferenceValueCents ?? 0)}</h2>
          <small>
            {data.stagnantStock?.totalUnits ?? 0} unidades sin ventas
          </small>
        </div>
      </section>
    </div>
  );
}
