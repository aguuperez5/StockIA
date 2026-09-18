import { useEffect, useState } from "react";
import { AlertTriangle, ArrowUpRight, BarChart3, Boxes, CalendarDays, DollarSign, Download, PackageCheck, ShoppingBag, Store, TrendingUp } from "lucide-react";
import { CartesianGrid, Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { ChartEmpty } from "@/components/DashboardCharts";
import { ErrorPanel, LoadingPanel, PageHeader, StockBadge, day, money } from "@/components/StockUI";
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

  const load = () => {
    setError("");
    reportService.get(from, to).then(setData).catch(e => setError(e.message));
  };
  useEffect(load, [from, to]);

  const exportCsv = () => {
    if (!data) return;
    const rows: string[][] = [
      ["REPORTE DE GESTIÓN Y TOMA DE DECISIONES - STOCKIA"],
      ["Período", `${from || "Desde el inicio"} hasta ${to || "Hoy"}`],
      ["Ventas totales ($)", String(data.sales.totalCents / 100)],
      ["Cantidad de comprobantes", String(data.sales.count)],
      ["Ticket promedio ($)", String((data.sales.averageTicketCents ?? 0) / 100)],
      ["Transferencias confirmadas", String(data.transfers)],
      [],
      ["--- PLAN DE REPOSICIÓN URGENTE (COMPRAS RECOMENDADAS) ---"],
      ["Producto", "SKU", "Categoría", "Stock actual", "Mínimo sugerido", "Unidades a comprar", "Costo unitario ($)", "Inversión total ($)", "Prioridad"],
      ...(data.replenishment?.items.map(item => [
        item.productName,
        item.sku,
        item.category,
        String(item.currentStock),
        String(item.threshold),
        String(item.unitsNeeded),
        String(item.priceCents / 100),
        String(item.costCents / 100),
        item.priority
      ]) ?? []),
      [],
      ["--- DESGLOSE DE VENTAS POR DEPÓSITO / SUCURSAL ---"],
      ["Depósito", "Comprobantes", "Total facturado ($)", "% de aporte"],
      ...(data.warehouseBreakdown?.map(w => [
        w.name,
        String(w.count),
        String(w.totalCents / 100),
        `${w.percentage}%`
      ]) ?? []),
      [],
      ["--- PRODUCTOS CON MAYOR FACTURACIÓN ---"],
      ["Producto", "Unidades", "Total recaudado ($)"],
      ...(data.topRevenue?.map(p => [
        p.productName,
        String(p.units),
        String(p.revenueCents / 100)
      ]) ?? data.bestSellers.map(b => [b.productName, String(b.units), "-"])),
      [],
      ["--- MERCADERÍA SIN ROTACIÓN (STOCK ESTANCADO EN EL PERÍODO) ---"],
      ["Producto", "SKU", "Categoría", "Stock parado", "Capital inmovilizado ($)"],
      ...(data.stagnantStock?.items.map(s => [
        s.name,
        s.sku,
        s.category,
        String(s.stock),
        String(s.valueCents / 100)
      ]) ?? [])
    ];
    downloadCsv(rows, `decision-report-${from || "inicio"}_${to || "hoy"}.csv`);
  };

  return (
    <div className="reports-page-wrapper">
      <PageHeader
        eyebrow="Inteligencia comercial y logística"
        title="Reportes y toma de decisiones"
        description="Analizá el rendimiento de tus depósitos, optimizá las compras y detectá mercadería parada para tomar decisiones informadas."
        action={data && (
          <button className="button-secondary" onClick={exportCsv}>
            <Download size={16} /> Exportar informe estratégico (CSV)
          </button>
        )}
      />

      <div className="date-filter">
        <span><CalendarDays size={17} /> Período analizado</span>
        <label>Desde<input type="date" value={from} onChange={e => setFrom(e.target.value)} /></label>
        <label>Hasta<input type="date" value={to} onChange={e => setTo(e.target.value)} /></label>
        <button className="button-secondary" onClick={() => { setFrom(""); setTo(""); }}>Limpiar fechas</button>
      </div>

      {error && <ErrorPanel message={error} retry={load} />}
      {!data && !error && <LoadingPanel rows={6} />}

      {data && (
        <>
          {/* Métricas Ejecutivas */}
          <div className="metric-grid decision-kpis">
            <section className="metric-card">
              <span className="metric-icon-bubble"><DollarSign size={18} /></span>
              <div>
                <p>Facturación total</p>
                <h2>{money(data.sales.totalCents)}</h2>
                <small>{data.sales.count} comprobantes cobrados</small>
              </div>
            </section>

            <section className="metric-card">
              <span className="metric-icon-bubble"><ShoppingBag size={18} /></span>
              <div>
                <p>Ticket promedio</p>
                <h2>{money(data.sales.averageTicketCents ?? (data.sales.count ? Math.round(data.sales.totalCents / data.sales.count) : 0))}</h2>
                <small>Gasto medio por operación</small>
              </div>
            </section>

            <section className="metric-card">
              <span className="metric-icon-bubble alert-bubble"><AlertTriangle size={18} /></span>
              <div>
                <p>Compras necesarias</p>
                <h2>{data.replenishment?.totalUnitsNeeded ?? data.lowStock.length} <small>un.</small></h2>
                <small>Inversión sugerida: {money(data.replenishment?.totalEstimatedCostCents ?? 0)}</small>
              </div>
            </section>

            <section className="metric-card">
              <span className="metric-icon-bubble warn-bubble"><Boxes size={18} /></span>
              <div>
                <p>Capital inmovilizado</p>
                <h2>{money(data.stagnantStock?.totalValueCents ?? 0)}</h2>
                <small>{data.stagnantStock?.totalUnits ?? 0} unidades sin ventas</small>
              </div>
            </section>
          </div>

          {/* Gráfico de evolución de facturación */}
          <article className="chart-card chart-card-sales">
            <div className="chart-card-header">
              <div>
                <p className="eyebrow">Dinámica de ingresos</p>
                <h2>Evolución de ventas por día</h2>
                <p className="chart-subtitle">Comportamiento diario de la facturación durante el período seleccionado.</p>
              </div>
            </div>
            <div className="chart-area">
              {data.dailySales.length ? (
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={data.dailySales} margin={{ top: 8, right: 8, left: -18, bottom: 0 }}>
                    <CartesianGrid vertical={false} stroke="#e7efec" strokeDasharray="4 4" />
                    <XAxis dataKey="date" tickFormatter={value => day(value)} axisLine={false} tickLine={false} tick={{ fill: "#849490", fontSize: 11 }} tickMargin={10} />
                    <YAxis axisLine={false} tickLine={false} tick={{ fill: "#849490", fontSize: 10 }} tickFormatter={value => (value === 0 ? "$0" : `$${Math.round(value / 1000)}k`)} allowDecimals={false} />
                    <Tooltip formatter={(value: number) => money(value)} labelFormatter={value => day(value)} />
                    <Line type="monotone" dataKey="totalCents" stroke="#159666" strokeWidth={2.4} dot={{ r: 3 }} />
                  </LineChart>
                </ResponsiveContainer>
              ) : (
                <ChartEmpty text="No se registran ventas en este período para graficar." />
              )}
            </div>
          </article>

          {/* Tablas de decisión estratégica */}
          <div className="decision-sections-grid">
            {/* 1. Plan de reposición urgente */}
            <section className="table-card decision-table-card">
              <div className="table-card-heading">
                <div>
                  <h3>Plan de reposición urgente (Decisión de compra)</h3>
                  <span>Artículos bajo el stock mínimo que requieren reorden inmediata</span>
                </div>
                {data.replenishment && data.replenishment.totalItems > 0 && (
                  <span className="decision-badge critical-badge">
                    {data.replenishment.totalItems} producto{data.replenishment.totalItems === 1 ? "" : "s"} a reponer
                  </span>
                )}
              </div>
              <div className="table-scroll">
                <table>
                  <thead>
                    <tr>
                      <th>Producto</th>
                      <th>Stock / Mínimo</th>
                      <th>A comprar</th>
                      <th>Inversión est.</th>
                      <th>Prioridad</th>
                    </tr>
                  </thead>
                  <tbody>
                    {data.replenishment && data.replenishment.items.length > 0 ? (
                      data.replenishment.items.map(item => (
                        <tr key={item.productId}>
                          <td>
                            <b>{item.productName}</b>
                            <small>{item.sku} · {item.category}</small>
                          </td>
                          <td>
                            <b>{item.currentStock}</b> / <small>{item.threshold} un.</small>
                          </td>
                          <td className="highlight-number">
                            <b>+{item.unitsNeeded} un.</b>
                          </td>
                          <td>{money(item.costCents)}</td>
                          <td>
                            <span className={`priority-pill ${item.priority === "CRÍTICA" ? "pill-critical" : "pill-high"}`}>
                              {item.priority}
                            </span>
                          </td>
                        </tr>
                      ))
                    ) : (
                      <tr>
                        <td colSpan={5} className="empty-table-cell">
                          <PackageCheck size={20} color="var(--brand)" />
                          <span>¡Excelente! Todo el stock actual se encuentra por encima del mínimo sugerido.</span>
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </section>

            {/* 2. Desglose de ventas por depósito (Decisión logística) */}
            <section className="table-card decision-table-card">
              <div className="table-card-heading">
                <div>
                  <h3>Rendimiento por depósito (Decisión logística)</h3>
                  <span>Identificá qué sucursales traccionan más para rebalancear inventario</span>
                </div>
              </div>
              <div className="table-scroll">
                <table>
                  <thead>
                    <tr>
                      <th>Depósito / Sucursal</th>
                      <th>Comprobantes</th>
                      <th>Facturado</th>
                      <th>% del total</th>
                    </tr>
                  </thead>
                  <tbody>
                    {data.warehouseBreakdown && data.warehouseBreakdown.length > 0 ? (
                      data.warehouseBreakdown.map(warehouse => (
                        <tr key={warehouse.id}>
                          <td>
                            <div className="warehouse-name-cell">
                              <Store size={15} />
                              <b>{warehouse.name}</b>
                            </div>
                          </td>
                          <td>{warehouse.count} ventas</td>
                          <td><b>{money(warehouse.totalCents)}</b></td>
                          <td>
                            <div className="share-progress-wrapper">
                              <span>{warehouse.percentage}%</span>
                              <div className="share-progress-bar">
                                <div style={{ width: `${warehouse.percentage}%` }} />
                              </div>
                            </div>
                          </td>
                        </tr>
                      ))
                    ) : (
                      <tr>
                        <td colSpan={4} className="empty-table-cell">
                          <span>No hay ventas registradas por depósito en este período.</span>
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </section>
          </div>

          <div className="decision-sections-grid">
            {/* 3. Top productos por facturación */}
            <section className="table-card decision-table-card">
              <div className="table-card-heading">
                <div>
                  <h3>Top productos por ingresos (Mayor contribución)</h3>
                  <span>Los productos que más dinero generan en tu facturación</span>
                </div>
              </div>
              <div className="table-scroll">
                <table>
                  <thead>
                    <tr>
                      <th>Producto</th>
                      <th>Unidades vendidas</th>
                      <th>Facturación generada</th>
                    </tr>
                  </thead>
                  <tbody>
                    {data.topRevenue && data.topRevenue.length > 0 ? (
                      data.topRevenue.map(p => (
                        <tr key={p.productName}>
                          <td><b>{p.productName}</b></td>
                          <td>{p.units} un.</td>
                          <td><b>{money(p.revenueCents)}</b></td>
                        </tr>
                      ))
                    ) : (
                      data.bestSellers.map(b => (
                        <tr key={b.productName}>
                          <td><b>{b.productName}</b></td>
                          <td>{b.units} un.</td>
                          <td>-</td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </section>

            {/* 4. Mercadería sin rotación */}
            <section className="table-card decision-table-card">
              <div className="table-card-heading">
                <div>
                  <h3>Stock inmovilizado (Sugerencia de promoción)</h3>
                  <span>Productos con stock parado sin ventas en el período</span>
                </div>
              </div>
              <div className="table-scroll">
                <table>
                  <thead>
                    <tr>
                      <th>Producto</th>
                      <th>Stock parado</th>
                      <th>Capital retenido</th>
                      <th>Sugerencia</th>
                    </tr>
                  </thead>
                  <tbody>
                    {data.stagnantStock && data.stagnantStock.items.length > 0 ? (
                      data.stagnantStock.items.map(st => (
                        <tr key={st.id}>
                          <td>
                            <b>{st.name}</b>
                            <small>{st.sku} · {st.category}</small>
                          </td>
                          <td><b>{st.stock}</b> un.</td>
                          <td>{money(st.valueCents)}</td>
                          <td>
                            <span className="suggestion-tag">Oferta / Combo</span>
                          </td>
                        </tr>
                      ))
                    ) : (
                      <tr>
                        <td colSpan={4} className="empty-table-cell">
                          <span>No se detecta mercadería estancada con capital retenido.</span>
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </section>
          </div>
        </>
      )}
    </div>
  );
}