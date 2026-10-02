import { useEffect, useMemo, useRef, useState } from "react";
import {
  AlertTriangle,
  Award,
  Boxes,
  CalendarDays,
  CheckCircle2,
  Clock,
  Download,
  Filter,
  PackageCheck,
  Sparkles,
  Store,
  TrendingUp,
  X,
} from "lucide-react";
import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { ChartEmpty } from "@/components/DashboardCharts";
import { ReportExecutiveKpis } from "@/components/reports/ReportExecutiveKpis";
import { WarehouseReportModal } from "@/components/reports/WarehouseReportModal";
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

function formatLocalYMD(d: Date) {
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

export default function ReportsPage() {
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");
  const [activePreset, setActivePreset] = useState<
    "today" | "7d" | "30d" | "thisMonth" | "all"
  >("all");
  const [chartType, setChartType] = useState<"area" | "bar">("area");
  const [selectedWarehouse, setSelectedWarehouse] = useState<
    NonNullable<ReportData["warehouseBreakdown"]>[number] | null
  >(null);
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

  const applyPreset = (preset: "today" | "7d" | "30d" | "thisMonth" | "all") => {
    setActivePreset(preset);
    const now = new Date();
    const toStr = formatLocalYMD(now);
    if (preset === "today") {
      setFrom(toStr);
      setTo(toStr);
    } else if (preset === "7d") {
      const d = new Date();
      d.setDate(d.getDate() - 6);
      setFrom(formatLocalYMD(d));
      setTo(toStr);
    } else if (preset === "30d") {
      const d = new Date();
      d.setDate(d.getDate() - 29);
      setFrom(formatLocalYMD(d));
      setTo(toStr);
    } else if (preset === "thisMonth") {
      const year = now.getFullYear();
      const month = String(now.getMonth() + 1).padStart(2, "0");
      setFrom(`${year}-${month}-01`);
      setTo(toStr);
    } else {
      setFrom("");
      setTo("");
    }
  };

  const handleManualDateChange = (type: "from" | "to", value: string) => {
    setActivePreset("all");
    if (type === "from") setFrom(value);
    else setTo(value);
  };

  // Serie de ventas diarias continua para el gráfico (rellena días intermedios con 0)
  const chartSalesData = useMemo(() => {
    if (!data?.dailySales) return [];
    if (!from || !to) return data.dailySales;

    const salesMap = new Map<string, number>();
    data.dailySales.forEach(d => salesMap.set(d.date, d.totalCents));

    const [fromY, fromM, fromD] = from.split("-").map(Number);
    const [toY, toM, toD] = to.split("-").map(Number);
    const cur = new Date(fromY, fromM - 1, fromD);
    const end = new Date(toY, toM - 1, toD);

    const diffDays = Math.round((end.getTime() - cur.getTime()) / (1000 * 60 * 60 * 24));
    if (diffDays >= 0 && diffDays <= 90) {
      const filled: Array<{ date: string; totalCents: number }> = [];
      while (cur <= end) {
        const key = formatLocalYMD(cur);
        filled.push({ date: key, totalCents: salesMap.get(key) || 0 });
        cur.setDate(cur.getDate() + 1);
      }
      return filled;
    }

    return data.dailySales;
  }, [data?.dailySales, from, to]);

  // Métricas agregadas de ventas para el gráfico
  const totalSalesPeriodCents = useMemo(() => {
    if (!data?.dailySales) return 0;
    return data.dailySales.reduce((sum, d) => sum + d.totalCents, 0);
  }, [data?.dailySales]);

  const daysWithSalesCount = useMemo(() => {
    if (!data?.dailySales) return 0;
    return data.dailySales.filter(d => d.totalCents > 0).length;
  }, [data?.dailySales]);

  const peakDay = useMemo(() => {
    if (!chartSalesData.length) return null;
    return chartSalesData.reduce(
      (best, cur) => (cur.totalCents > best.totalCents ? cur : best),
      chartSalesData[0]
    );
  }, [chartSalesData]);

  const maxRevenueProduct = useMemo(() => {
    if (!data?.topRevenue?.length) return null;
    return data.topRevenue[0];
  }, [data?.topRevenue]);

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
    downloadCsv(rows, `informe-stockia-${from || "inicio"}_${to || "hoy"}.csv`);
  };

  return (
    <div className="reports-page-wrapper">
      <PageHeader
        eyebrow="Inteligencia comercial y logística"
        title="Reportes y toma de decisiones"
        description="Analizá el rendimiento de tus depósitos, optimizá las compras y detectá mercadería parada para tomar decisiones estratégicas."
        action={
          data && (
            <button className="button-secondary" onClick={exportCsv}>
              <Download size={15} /> Exportar informe estratégico (CSV)
            </button>
          )
        }
      />

      {/* Barra de Filtros Rápida y Rango de Fechas */}
      <section className="reports-toolbar">
        <div className="reports-presets-group">
          <span className="presets-label">
            <Filter size={13} /> Período:
          </span>
          <button
            type="button"
            className={`preset-pill ${activePreset === "today" ? "active" : ""}`}
            onClick={() => applyPreset("today")}
          >
            Hoy
          </button>
          <button
            type="button"
            className={`preset-pill ${activePreset === "7d" ? "active" : ""}`}
            onClick={() => applyPreset("7d")}
          >
            Últimos 7 días
          </button>
          <button
            type="button"
            className={`preset-pill ${activePreset === "thisMonth" ? "active" : ""}`}
            onClick={() => applyPreset("thisMonth")}
          >
            Este mes
          </button>
          <button
            type="button"
            className={`preset-pill ${activePreset === "30d" ? "active" : ""}`}
            onClick={() => applyPreset("30d")}
          >
            Últimos 30 días
          </button>
          <button
            type="button"
            className={`preset-pill ${activePreset === "all" && !from && !to ? "active" : ""}`}
            onClick={() => applyPreset("all")}
          >
            Todo el historial
          </button>
        </div>

        <div className="reports-date-group">
          <CalendarDays size={14} className="date-icon" />
          <input
            type="date"
            value={from}
            onChange={e => handleManualDateChange("from", e.target.value)}
            aria-label="Fecha desde"
          />
          <span className="date-sep">a</span>
          <input
            type="date"
            value={to}
            onChange={e => handleManualDateChange("to", e.target.value)}
            aria-label="Fecha hasta"
          />
          {(from || to) && (
            <button
              className="button-secondary filter-clear button-xs"
              onClick={() => {
                setFrom("");
                setTo("");
                setActivePreset("all");
              }}
              type="button"
              title="Restablecer fechas"
            >
              <X size={13} />
            </button>
          )}
        </div>
      </section>

      {error && <ErrorPanel message={error} retry={load} />}
      {!data && !error && <LoadingPanel rows={6} />}

      {data && (
        <>
          {/* Métricas Ejecutivas */}
          <ReportExecutiveKpis data={data} />

          {/* Gráfico de Evolución de Ventas Panorámico */}
          <article className="chart-card chart-card-sales">
            <div className="chart-card-header">
              <div>
                <div className="chart-header-tag">
                  <TrendingUp size={13} />
                  <span>Dinámica de ingresos</span>
                </div>
                <h2>Evolución de facturación diaria</h2>
                <p className="chart-subtitle">
                  Comportamiento y picos de ventas durante el período analizado.
                </p>
              </div>

              {/* Controles del gráfico: Tipo de curva */}
              <div className="chart-controls-group">
                <div className="chart-switcher" title="Cambiar tipo de gráfico">
                  <button
                    type="button"
                    className={chartType === "area" ? "active" : ""}
                    onClick={() => setChartType("area")}
                  >
                    Curva continua
                  </button>
                  <button
                    type="button"
                    className={chartType === "bar" ? "active" : ""}
                    onClick={() => setChartType("bar")}
                  >
                    Barras
                  </button>
                </div>
              </div>
            </div>

            {/* Tira ejecutiva de contexto del período */}
            <div className="chart-kpi-strip">
              <div className="chart-kpi-item">
                <span className="kpi-label">Facturado en período</span>
                <span className="kpi-value">{money(data.sales.totalCents)}</span>
                <span className="kpi-sub">
                  {data.sales.count} comprobante{data.sales.count === 1 ? "" : "s"}
                </span>
              </div>
              <div className="chart-kpi-item">
                <span className="kpi-label">Días con actividad</span>
                <span className="kpi-value">
                  {daysWithSalesCount}{" "}
                  <small style={{ fontSize: "11px", fontWeight: 500 }}>
                    de {chartSalesData.length} días
                  </small>
                </span>
                <span className="kpi-sub">con ventas registradas</span>
              </div>
              <div className="chart-kpi-item">
                <span className="kpi-label">Promedio diario activo</span>
                <span className="kpi-value">
                  {daysWithSalesCount > 0
                    ? money(Math.round(totalSalesPeriodCents / daysWithSalesCount))
                    : "$0"}
                </span>
                <span className="kpi-sub">por día con ventas</span>
              </div>
              <div className="chart-kpi-item">
                <span className="kpi-label">Pico máximo registrado</span>
                <span className="kpi-value">
                  {peakDay && peakDay.totalCents > 0
                    ? money(peakDay.totalCents)
                    : "—"}
                </span>
                <span className="kpi-sub">
                  {peakDay && peakDay.totalCents > 0
                    ? day(peakDay.date)
                    : "Sin picos"}
                </span>
              </div>
            </div>

            {/* Visualización del gráfico */}
            <div className="chart-area chart-area-sales-wide">
              {chartSalesData.length ? (
                <ResponsiveContainer width="100%" height="100%">
                  {chartType === "area" ? (
                    <AreaChart
                      data={chartSalesData}
                      margin={{ top: 10, right: 12, left: -10, bottom: 4 }}
                    >
                      <defs>
                        <linearGradient
                          id="reportSalesGrad"
                          x1="0"
                          y1="0"
                          x2="0"
                          y2="1"
                        >
                          <stop
                            offset="5%"
                            stopColor="var(--brand)"
                            stopOpacity={0.32}
                          />
                          <stop
                            offset="95%"
                            stopColor="var(--brand)"
                            stopOpacity={0.0}
                          />
                        </linearGradient>
                      </defs>
                      <CartesianGrid
                        vertical={false}
                        stroke="var(--line-soft)"
                        strokeDasharray="4 4"
                      />
                      <XAxis
                        dataKey="date"
                        tickFormatter={value => day(value)}
                        axisLine={false}
                        tickLine={false}
                        tick={{ fill: "var(--muted-ink)", fontSize: 11.5 }}
                        tickMargin={10}
                      />
                      <YAxis
                        axisLine={false}
                        tickLine={false}
                        tick={{ fill: "var(--muted-ink)", fontSize: 11.5 }}
                        tickFormatter={value =>
                          value === 0 ? "$0" : `$${Math.round(value / 1000)}k`
                        }
                        allowDecimals={false}
                      />
                      <Tooltip
                        cursor={{
                          stroke: "var(--brand)",
                          strokeWidth: 1.5,
                          strokeDasharray: "3 3",
                        }}
                        formatter={(value: number) => [
                          money(value),
                          "Facturación",
                        ]}
                        labelFormatter={value => day(value)}
                        contentStyle={{
                          background: "var(--surface)",
                          border: "1px solid var(--line)",
                          borderRadius: "8px",
                          color: "var(--ink)",
                          fontSize: "12px",
                        }}
                      />
                      <Area
                        type="monotone"
                        dataKey="totalCents"
                        stroke="var(--brand)"
                        strokeWidth={2.5}
                        fillOpacity={1}
                        fill="url(#reportSalesGrad)"
                        activeDot={{
                          r: 6,
                          fill: "var(--brand)",
                          stroke: "var(--surface)",
                          strokeWidth: 2,
                        }}
                      />
                    </AreaChart>
                  ) : (
                    <BarChart
                      data={chartSalesData}
                      margin={{ top: 10, right: 12, left: -10, bottom: 4 }}
                    >
                      <CartesianGrid
                        vertical={false}
                        stroke="var(--line-soft)"
                        strokeDasharray="4 4"
                      />
                      <XAxis
                        dataKey="date"
                        tickFormatter={value => day(value)}
                        axisLine={false}
                        tickLine={false}
                        tick={{ fill: "var(--muted-ink)", fontSize: 11.5 }}
                        tickMargin={10}
                      />
                      <YAxis
                        axisLine={false}
                        tickLine={false}
                        tick={{ fill: "var(--muted-ink)", fontSize: 11.5 }}
                        tickFormatter={value =>
                          value === 0 ? "$0" : `$${Math.round(value / 1000)}k`
                        }
                        allowDecimals={false}
                      />
                      <Tooltip
                        cursor={{ fill: "var(--surface-hover)" }}
                        formatter={(value: number) => [
                          money(value),
                          "Facturación",
                        ]}
                        labelFormatter={value => day(value)}
                        contentStyle={{
                          background: "var(--surface)",
                          border: "1px solid var(--line)",
                          borderRadius: "8px",
                          color: "var(--ink)",
                          fontSize: "12px",
                        }}
                      />
                      <Bar
                        dataKey="totalCents"
                        fill="var(--chart-1)"
                        radius={[6, 6, 2, 2]}
                        maxBarSize={36}
                      />
                    </BarChart>
                  )}
                </ResponsiveContainer>
              ) : (
                <ChartEmpty text="No se registran ventas en este período para graficar." />
              )}
            </div>
          </article>

          {/* Tablas de decisión estratégica (Todos los módulos siempre visibles) */}
          <div className="decision-sections-grid">
            {/* 1. Plan de reposición urgente */}
            <section className="table-card decision-table-card">
                <div className="table-card-heading">
                  <div>
                    <div className="card-tag alert">
                      <PackageCheck size={13} />
                      <span>Decisión de compra</span>
                    </div>
                    <h3>Plan de reposición urgente</h3>
                    <span>
                      Artículos bajo o en stock mínimo que requieren reorden inmediata.
                    </span>
                  </div>
                  {data.replenishment && data.replenishment.totalItems > 0 ? (
                    <span className="decision-badge critical-badge">
                      {data.replenishment.totalItems} producto
                      {data.replenishment.totalItems === 1 ? "" : "s"} a reponer
                    </span>
                  ) : (
                    <span className="decision-badge ok-badge">
                      Stock al día
                    </span>
                  )}
                </div>

                {data.replenishment && data.replenishment.totalItems > 0 && (
                  <div className="card-meta-bar">
                    <span>
                      Unidades sugeridas:{" "}
                      <b>+{data.replenishment.totalUnitsNeeded} un.</b>
                    </span>
                    <span>·</span>
                    <span>
                      Inversión estimada:{" "}
                      <b>{money(data.replenishment.totalReferenceValueCents)}</b>
                    </span>
                  </div>
                )}

                <div className="table-scroll">
                  <table>
                    <thead>
                      <tr>
                        <th scope="col">Producto</th>
                        <th scope="col">Stock actual / Mín.</th>
                        <th scope="col">A comprar</th>
                        <th scope="col" title="Valor estimado a precio de lista">
                          Inversión est.
                        </th>
                        <th scope="col">Prioridad</th>
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
                            <CheckCircle2 size={24} color="#159666" />
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

            {/* 2. Desglose de ventas por depósito */}
            <section className="table-card decision-table-card">
              <div className="table-card-heading">
                <div>
                  <div className="card-tag brand">
                    <Store size={13} />
                    <span>Decisión logística</span>
                  </div>
                  <h3>Rendimiento por depósito / sucursal</h3>
                  <span>
                    Hacé clic en una sucursal para abrir su reporte detallado y existencias.
                  </span>
                </div>
                {data.warehouseBreakdown && (
                  <span className="decision-badge neutral-badge">
                    {data.warehouseBreakdown.length} depósito
                    {data.warehouseBreakdown.length === 1 ? "" : "s"}
                  </span>
                )}
              </div>

              <div className="table-scroll">
                <table>
                  <thead>
                    <tr>
                      <th scope="col">Depósito / Sucursal</th>
                      <th scope="col">Comprobantes</th>
                      <th scope="col">Total facturado</th>
                      <th scope="col">% Aporte</th>
                    </tr>
                  </thead>
                  <tbody>
                    {data.warehouseBreakdown &&
                    data.warehouseBreakdown.length > 0 ? (
                      data.warehouseBreakdown.map(warehouse => (
                        <tr
                          key={warehouse.id}
                          className="clickable-warehouse-row"
                          onClick={() => setSelectedWarehouse(warehouse)}
                          title={`Hacé clic para ver el reporte detallado de ${warehouse.name}`}
                        >
                          <td>
                            <div className="warehouse-name-cell">
                              <Store size={15} />
                              <b>{warehouse.name}</b>
                            </div>
                          </td>
                          <td>
                            <b>{warehouse.count}</b> venta
                            {warehouse.count === 1 ? "" : "s"}
                          </td>
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
                            No hay ventas registradas por depósito en este período.
                          </span>
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </section>

            {/* 3. Top productos por facturación */}
            <section className="table-card decision-table-card">
                <div className="table-card-heading">
                  <div>
                    <div className="card-tag success">
                      <Award size={13} />
                      <span>Mayor contribución</span>
                    </div>
                    <h3>Top productos por ingresos</h3>
                    <span>
                      Los productos que mayor dinero generan en tu facturación.
                    </span>
                  </div>
                  {maxRevenueProduct && (
                    <span className="decision-badge success-badge">
                      Líder: {maxRevenueProduct.productName}
                    </span>
                  )}
                </div>

                <div className="table-scroll">
                  <table>
                    <thead>
                      <tr>
                        <th scope="col" style={{ width: "36px" }}>
                          #
                        </th>
                        <th scope="col">Producto</th>
                        <th scope="col">Unidades</th>
                        <th scope="col">Facturación</th>
                      </tr>
                    </thead>
                    <tbody>
                      {data.topRevenue && data.topRevenue.length > 0
                        ? data.topRevenue.map((p, index) => (
                            <tr key={p.productId}>
                              <td>
                                <span className={`rank-pill rank-${index + 1}`}>
                                  {index + 1}
                                </span>
                              </td>
                              <td>
                                <b>{p.productName}</b>
                                {p.sku && <small>{p.sku}</small>}
                              </td>
                              <td>{p.units.toLocaleString("es-AR")} un.</td>
                              <td>
                                <b>{money(p.revenueCents)}</b>
                              </td>
                            </tr>
                          ))
                        : data.bestSellers.map((b, index) => (
                            <tr key={b.productId}>
                              <td>
                                <span className={`rank-pill rank-${index + 1}`}>
                                  {index + 1}
                                </span>
                              </td>
                              <td>
                                <b>{b.productName}</b>
                              </td>
                              <td>{b.units.toLocaleString("es-AR")} un.</td>
                              <td>—</td>
                            </tr>
                          ))}
                    </tbody>
                  </table>
                </div>
              </section>

            {/* 4. Mercadería sin rotación / Stock inmovilizado */}
            <section className="table-card decision-table-card">
              <div className="table-card-heading">
                <div>
                  <div className="card-tag warn">
                    <Clock size={13} />
                    <span>Rotación de capital</span>
                  </div>
                  <h3>Stock inmovilizado (Sugerencia comercial)</h3>
                  <span>
                    Productos con existencias que no tuvieron ventas en el período.
                  </span>
                </div>
                {data.stagnantStock && data.stagnantStock.count > 0 && (
                  <span className="decision-badge warn-badge">
                    {data.stagnantStock.count} artículo
                    {data.stagnantStock.count === 1 ? "" : "s"} sin ventas
                  </span>
                )}
              </div>

              {data.stagnantStock && data.stagnantStock.count > 0 && (
                <div className="card-meta-bar">
                  <span>
                    Capital parado:{" "}
                    <b>
                      {money(data.stagnantStock.totalReferenceValueCents)}
                    </b>
                  </span>
                  <span>·</span>
                  <span>
                    Unidades estancadas:{" "}
                    <b>{data.stagnantStock.totalUnits} un.</b>
                  </span>
                </div>
              )}

              <div className="table-scroll">
                <table>
                  <thead>
                    <tr>
                      <th scope="col">Producto</th>
                      <th scope="col">Stock parado</th>
                      <th scope="col" title="Valor a precio de lista">
                        Valor lista
                      </th>
                      <th scope="col">Estrategia sugerida</th>
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
                              Promo / Descuento
                            </span>
                          </td>
                        </tr>
                      ))
                    ) : (
                      <tr>
                        <td colSpan={4} className="empty-table-cell">
                          <Sparkles size={22} color="var(--brand)" />
                          <span>
                            No hay productos con stock estancado sin ventas en este período.
                          </span>
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </section>
          </div>

          {/* Modal de Reporte Detallado de Depósito */}
          {selectedWarehouse && (
            <WarehouseReportModal
              warehouse={selectedWarehouse}
              from={from}
              to={to}
              totalCompanySalesCents={data.sales.totalCents}
              onClose={() => setSelectedWarehouse(null)}
            />
          )}
        </>
      )}
    </div>
  );
}
