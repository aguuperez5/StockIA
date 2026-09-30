import { useEffect, useRef, useState } from "react";
import {
  AlertTriangle,
  Boxes,
  CalendarDays,
  DollarSign,
  Download,
  PackageCheck,
  ShoppingBag,
  Store,
  X,
} from "lucide-react";
import {
  CartesianGrid,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { ChartEmpty } from "@/components/DashboardCharts";
import {
  ErrorPanel,
  LoadingPanel,
  PageHeader,
  day,
  money,
} from "@/components/StockUI";
import { reportService } from "@/services/backlog";

type ReportData = Awaited<ReturnType<typeof reportService.get>>;

function downloadCsv(rows: string[][], filename: string) {
  const csvCell = (value: string) => {
    const safeValue = /^[\t\r ]*[=+\-@]/.test(value) ? `'${value}` : value;
    return `"${safeValue.replace(/"/g, '""')}"`;
  };
  const csv = rows.map(row => row.map(csvCell).join(",")).join("\n");
  const blob = new Blob(["\uFEFF", csv], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  link.click();
  window.setTimeout(() => URL.revokeObjectURL(url), 1000);
}

export default function ReportsPage() {
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");
  const [data, setData] = useState<ReportData | null>(null);
  const [error, setError] = useState("");
  const requestVersion = useRef(0);

  const load = () => {
    const version = ++requestVersion.current;
    setError("");
    setData(null);
    reportService
      .get(from, to)
      .then(result => {
        if (version === requestVersion.current) setData(result);
      })
      .catch(reason => {
        if (version === requestVersion.current) {
          setError(reason instanceof Error ? reason.message : String(reason));
        }
      });
  };
  useEffect(() => {
    load();
    return () => {
      requestVersion.current += 1;
    };
  }, [from, to]);

  const exportCsv = () => {
    if (!data) return;
    const rows: string[][] = [
      ["REPORTE DE GESTIÓN Y TOMA DE DECISIONES - STOCKIA"],
      ["Período", `${from || "Desde el inicio"} hasta ${to || "Hoy"}`],
      ["Ventas totales ($)", String(data.sales.totalCents / 100)],
      ["Cantidad de comprobantes", String(data.sales.count)],
      [
        "Ticket promedio ($)",
        String((data.sales.averageTicketCents ?? 0) / 100),
      ],
      ["Transferencias confirmadas", String(data.transfers)],
      [],
      ["--- PLAN DE REPOSICIÓN URGENTE (COMPRAS RECOMENDADAS) ---"],
      [
        "Producto",
        "SKU",
        "Categoría",
        "Stock actual",
        "Mínimo sugerido",
        "Unidades sugeridas",
        "Precio de lista unitario ($)",
        "Valor de referencia a precio de lista ($)",
        "Prioridad",
      ],
      ...(data.replenishment?.items.map(item => [
        item.productName,
        item.sku,
        item.category,
        String(item.currentStock),
        String(item.threshold),
        String(item.unitsNeeded),
        String(item.priceCents / 100),
        String(item.referenceValueCents / 100),
        item.priority,
      ]) ?? []),
      [],
      ["--- DESGLOSE DE VENTAS POR DEPÓSITO / SUCURSAL ---"],
      ["Depósito", "Comprobantes", "Total facturado ($)", "% de aporte"],
      ...(data.warehouseBreakdown?.map(w => [
        w.name,
        String(w.count),
        String(w.totalCents / 100),
        `${w.percentage}%`,
      ]) ?? []),
      [],
      ["--- PRODUCTOS CON MAYOR FACTURACIÓN ---"],
      ["Producto", "Unidades", "Total recaudado ($)"],
      ...(data.topRevenue?.map(p => [
        p.productName,
        String(p.units),
        String(p.revenueCents / 100),
      ]) ?? data.bestSellers.map(b => [b.productName, String(b.units), "-"])),
      [],
      ["--- MERCADERÍA SIN ROTACIÓN (STOCK ESTANCADO EN EL PERÍODO) ---"],
      [
        "Producto",
        "SKU",
        "Categoría",
        "Stock sin ventas",
        "Valor a precio de lista ($)",
      ],
      ...(data.stagnantStock?.items.map(s => [
        s.name,
        s.sku,
        s.category,
        String(s.stock),
        String(s.referenceValueCents / 100),
      ]) ?? []),
    ];
    downloadCsv(rows, `decision-report-${from || "inicio"}_${to || "hoy"}.csv`);
  };

  return (
    <div className="reports-page-wrapper">
      <PageHeader
        eyebrow="Inteligencia comercial y logística"
        title="Reportes y toma de decisiones"
        description="Analizá el rendimiento de tus depósitos, optimizá las compras y detectá mercadería parada para tomar decisiones informadas."
        action={
          data && (
            <button className="button-secondary" onClick={exportCsv}>
              <Download size={16} /> Exportar informe estratégico (CSV)
            </button>
          )
        }
      />

      <section className="filter-bar">
        <div className="filter-date-group" title="Período analizado">
          <CalendarDays size={15} />
          <input
            type="date"
            value={from}
            onChange={e => setFrom(e.target.value)}
            aria-label="Fecha desde"
          />
          <span className="date-sep">a</span>
          <input
            type="date"
            value={to}
            onChange={e => setTo(e.target.value)}
            aria-label="Fecha hasta"
          />
        </div>
        {(from || to) && (
          <button
            className="button-secondary filter-clear"
            onClick={() => {
              setFrom("");
              setTo("");
            }}
            type="button"
          >
            <X size={14} />
            Limpiar fechas
          </button>
        )}
      </section>

      {error && <ErrorPanel message={error} retry={load} />}
      {!data && !error && <LoadingPanel rows={6} />}

      {data && (
        <>
          {/* Métricas Ejecutivas */}
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
                <h2>
                  {money(data.stagnantStock?.totalReferenceValueCents ?? 0)}
                </h2>
                <small>
                  {data.stagnantStock?.totalUnits ?? 0} unidades sin ventas
                </small>
              </div>
            </section>
          </div>

          {/* Gráfico de evolución de facturación */}
          <article className="chart-card chart-card-sales">
            <div className="chart-card-header">
              <div>
                <p className="eyebrow">Dinámica de ingresos</p>
                <h2>Evolución de ventas por día</h2>
                <p className="chart-subtitle">
                  Comportamiento diario de la facturación durante el período
                  seleccionado.
                </p>
              </div>
            </div>
            <div className="chart-area">
              {data.dailySales.length ? (
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart
                    data={data.dailySales}
                    margin={{ top: 8, right: 8, left: -18, bottom: 0 }}
                  >
                    <CartesianGrid
                      vertical={false}
                      stroke="#e7efec"
                      strokeDasharray="4 4"
                    />
                    <XAxis
                      dataKey="date"
                      tickFormatter={value => day(value)}
                      axisLine={false}
                      tickLine={false}
                      tick={{ fill: "#849490", fontSize: 11 }}
                      tickMargin={10}
                    />
                    <YAxis
                      axisLine={false}
                      tickLine={false}
                      tick={{ fill: "#849490", fontSize: 10 }}
                      tickFormatter={value =>
                        value === 0 ? "$0" : `$${Math.round(value / 1000)}k`
                      }
                      allowDecimals={false}
                    />
                    <Tooltip
                      formatter={(value: number) => money(value)}
                      labelFormatter={value => day(value)}
                    />
                    <Line
                      type="monotone"
                      dataKey="totalCents"
                      stroke="#159666"
                      strokeWidth={2.4}
                      dot={{ r: 3 }}
                    />
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
                  <span>
                    Artículos bajo el stock mínimo que requieren reorden
                    inmediata
                  </span>
                </div>
                {data.replenishment && data.replenishment.totalItems > 0 && (
                  <span className="decision-badge critical-badge">
                    {data.replenishment.totalItems} producto
                    {data.replenishment.totalItems === 1 ? "" : "s"} a reponer
                  </span>
                )}
              </div>
              <div className="table-scroll">
                <table>
                  <thead>
                    <tr>
                      <th>Producto</th>
                      <th>Stock / Mín.</th>
                      <th>A comprar</th>
                      <th title="Valor estimado a precio de lista">
                        Valor est. lista
                      </th>
                      <th>Prioridad</th>
                    </tr>
                  </thead>
                  <tbody>
                    {data.replenishment &&
                    data.replenishment.items.length > 0 ? (
                      data.replenishment.items.map(item => (
                        <tr key={item.productId}>
                          <td>
                            <b>{item.productName}</b>
                            <small>
                              {item.sku} · {item.category}
                            </small>
                          </td>
                          <td>
                            <b>{item.currentStock}</b>{" "}
                            <small style={{ display: "inline" }}>
                              / {item.threshold} u.
                            </small>
                          </td>
                          <td className="highlight-number">
                            <b>+{item.unitsNeeded} un.</b>
                          </td>
                          <td>{money(item.referenceValueCents)}</td>
                          <td>
                            <span
                              className={`priority-pill ${item.priority === "CRÍTICA" ? "pill-critical" : "pill-high"}`}
                            >
                              {item.priority}
                            </span>
                          </td>
                        </tr>
                      ))
                    ) : (
                      <tr>
                        <td colSpan={5} className="empty-table-cell">
                          <PackageCheck size={20} color="var(--brand)" />
                          <span>
                            ¡Excelente! Todo el stock actual se encuentra por
                            encima del mínimo sugerido.
                          </span>
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
                  <span>
                    Identificá qué sucursales traccionan más para rebalancear
                    inventario
                  </span>
                </div>
              </div>
              <div className="table-scroll">
                <table>
                  <thead>
                    <tr>
                      <th>Depósito / Sucursal</th>
                      <th>Comprobantes</th>
                      <th>Facturado</th>
                      <th>% Total</th>
                    </tr>
                  </thead>
                  <tbody>
                    {data.warehouseBreakdown &&
                    data.warehouseBreakdown.length > 0 ? (
                      data.warehouseBreakdown.map(warehouse => (
                        <tr key={warehouse.id}>
                          <td>
                            <div className="warehouse-name-cell">
                              <Store size={15} />
                              <b>{warehouse.name}</b>
                            </div>
                          </td>
                          <td>{warehouse.count} ventas</td>
                          <td>
                            <b>{money(warehouse.totalCents)}</b>
                          </td>
                          <td>
                            <div className="share-progress-wrapper">
                              <span>{warehouse.percentage}%</span>
                              <div className="share-progress-bar">
                                <div
                                  style={{ width: `${warehouse.percentage}%` }}
                                />
                              </div>
                            </div>
                          </td>
                        </tr>
                      ))
                    ) : (
                      <tr>
                        <td colSpan={4} className="empty-table-cell">
                          <span>
                            No hay ventas registradas por depósito en este
                            período.
                          </span>
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
                  <span>
                    Los productos que más dinero generan en tu facturación
                  </span>
                </div>
              </div>
              <div className="table-scroll">
                <table>
                  <thead>
                    <tr>
                      <th>Producto</th>
                      <th>Vendidos</th>
                      <th>Facturación</th>
                    </tr>
                  </thead>
                  <tbody>
                    {data.topRevenue && data.topRevenue.length > 0
                      ? data.topRevenue.map(p => (
                          <tr key={p.productId}>
                            <td>
                              <b>{p.productName}</b>
                            </td>
                            <td>{p.units} un.</td>
                            <td>
                              <b>{money(p.revenueCents)}</b>
                            </td>
                          </tr>
                        ))
                      : data.bestSellers.map(b => (
                          <tr key={b.productId}>
                            <td>
                              <b>{b.productName}</b>
                            </td>
                            <td>{b.units} un.</td>
                            <td>-</td>
                          </tr>
                        ))}
                  </tbody>
                </table>
              </div>
            </section>

            {/* 4. Mercadería sin rotación */}
            <section className="table-card decision-table-card">
              <div className="table-card-heading">
                <div>
                  <h3>Stock inmovilizado (Sugerencia de promoción)</h3>
                  <span>
                    Productos con stock parado sin ventas en el período
                  </span>
                </div>
              </div>
              <div className="table-scroll">
                <table>
                  <thead>
                    <tr>
                      <th>Producto</th>
                      <th>Stock parado</th>
                      <th title="Valor a precio de lista">Valor lista</th>
                      <th>Sugerencia</th>
                    </tr>
                  </thead>
                  <tbody>
                    {data.stagnantStock &&
                    data.stagnantStock.items.length > 0 ? (
                      data.stagnantStock.items.map(st => (
                        <tr key={st.id}>
                          <td>
                            <b>{st.name}</b>
                            <small>
                              {st.sku} · {st.category}
                            </small>
                          </td>
                          <td>
                            <b>{st.stock}</b> un.
                          </td>
                          <td>{money(st.referenceValueCents)}</td>
                          <td>
                            <span className="suggestion-tag">
                              Oferta / Combo
                            </span>
                          </td>
                        </tr>
                      ))
                    ) : (
                      <tr>
                        <td colSpan={4} className="empty-table-cell">
                          <span>
                            No hay productos con stock y sin ventas en este
                            período.
                          </span>
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
