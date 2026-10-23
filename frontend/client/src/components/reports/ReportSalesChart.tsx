import { useMemo, useState } from "react";
import { TrendingUp } from "lucide-react";
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
import { formatAxisMoney, day, money } from "@/components/StockUI";
import { type reportService } from "@/services/backlog";

type ReportData = Awaited<ReturnType<typeof reportService.get>>;

function formatLocalYMD(d: Date) {
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

export interface ReportSalesChartProps {
  data: ReportData;
  from?: string;
  to?: string;
}

export function ReportSalesChart({ data, from = "", to = "" }: ReportSalesChartProps) {
  const [chartType, setChartType] = useState<"area" | "bar">("area");

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

  return (
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
                      stopOpacity={0.28}
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
                  stroke="var(--line-subtle)"
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
                  tickFormatter={formatAxisMoney}
                  allowDecimals={false}
                />
                <Tooltip
                  cursor={{ stroke: "var(--brand)", strokeWidth: 1 }}
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
                  stroke="var(--line-subtle)"
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
                  tickFormatter={formatAxisMoney}
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
  );
}
