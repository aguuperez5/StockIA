import { useEffect, useState } from "react";
import { CalendarDays, Download } from "lucide-react";
import { CartesianGrid, Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { ChartEmpty } from "@/components/DashboardCharts";
import { ErrorPanel, LoadingPanel, PageHeader, StockBadge, day, formatAxisMoney, money } from "@/components/StockUI";
import { reportService } from "@/services/backlog";

type ReportData = Awaited<ReturnType<typeof reportService.get>>;

function downloadCsv(rows: string[][], filename: string) {
  const csv = rows.map(row => row.map(cell => `"${cell.replace(/"/g, '""')}"`).join(",")).join("\n");
  const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  link.click();
  URL.revokeObjectURL(url);
}

export default function ReportsPage() {
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");
  const [data, setData] = useState<ReportData | null>(null);
  const [error, setError] = useState("");

  const load = () => { setError(""); reportService.get(from, to).then(setData).catch(e => setError(e.message)); };
  useEffect(load, [from, to]);

  const exportCsv = () => {
    if (!data) return;
    const rows: string[][] = [["Producto", "Unidades vendidas"], ...data.bestSellers.map(item => [item.productName, String(item.units)])];
    downloadCsv(rows, `reporte-productos-${from || "inicio"}_${to || "hoy"}.csv`);
  };

  return <>
    <PageHeader
      eyebrow="Análisis operativo"
      title="Reportes"
      description="Indicadores calculados en el backend sobre la operación real."
      action={data && <button className="button-secondary" onClick={exportCsv}><Download size={16} />Exportar CSV</button>}
    />
    <div className="date-filter">
      <span><CalendarDays size={17} />Período</span>
      <label>Desde<input type="date" value={from} onChange={e => setFrom(e.target.value)} /></label>
      <label>Hasta<input type="date" value={to} onChange={e => setTo(e.target.value)} /></label>
      <button className="button-secondary" onClick={() => { setFrom(""); setTo(""); }}>Limpiar</button>
    </div>
    {error && <ErrorPanel message={error} retry={load} />}
    {!data && !error && <LoadingPanel rows={5} />}
    {data && <>
      <div className="dashboard-grid">
        <section className="metric-card"><span>Ventas del período</span><b>{money(data.sales.totalCents)}</b><small>{data.sales.count} comprobantes</small></section>
        <section className="metric-card"><span>Transferencias</span><b>{data.transfers}</b><small>Remitos confirmados</small></section>
        <section className="metric-card"><span>Alertas de stock</span><b>{data.lowStock.length}</b><small>Productos bajo mínimo</small></section>
      </div>
      <article className="chart-card chart-card-sales">
        <div className="chart-card-header">
          <div><p className="eyebrow">Tendencia</p><h2>Ventas por día</h2><p className="chart-subtitle">Evolución del importe vendido en el período seleccionado.</p></div>
        </div>
        <div className="chart-area">
          {data.dailySales.length ? (
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={data.dailySales} margin={{ top: 8, right: 8, left: -18, bottom: 0 }}>
                <CartesianGrid vertical={false} stroke="#e7efec" strokeDasharray="4 4" />
                <XAxis dataKey="date" tickFormatter={value => day(value)} axisLine={false} tickLine={false} tick={{ fill: "#849490", fontSize: 11 }} tickMargin={10} />
                <YAxis axisLine={false} tickLine={false} tick={{ fill: "#849490", fontSize: 10 }} tickFormatter={value => formatAxisMoney(value)} allowDecimals={false} />
                <Tooltip formatter={(value: number) => money(value)} labelFormatter={value => day(value)} />
                <Line type="monotone" dataKey="totalCents" stroke="#159666" strokeWidth={2} dot={false} />
              </LineChart>
            </ResponsiveContainer>
          ) : <ChartEmpty text="Todavía no hay ventas registradas en este período." />}
        </div>
      </article>
      <section className="data-table">
        <div className="data-table-head"><span>Más vendidos</span><span>Unidades</span></div>
        {data.bestSellers.map(item => <div className="data-table-row" key={item.productName}><b>{item.productName}</b><span>{item.units}</span></div>)}
      </section>
      {data.lowStock.length > 0 && (
        <section className="data-table">
          <div className="data-table-head"><span>Stock bajo</span><span>Estado</span></div>
          {data.lowStock.map(item => <div className="data-table-row" key={item.id}><b>{item.name}</b><StockBadge quantity={item.stock} threshold={item.threshold} /></div>)}
        </section>
      )}
    </>}
  </>;
}