import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { useMemo, useState } from "react";
import { useLocation } from "wouter";
import {
  AlertTriangle,
  ArrowUpRight,
  Layers,
  Sparkles,
  TrendingUp,
} from "lucide-react";
import { formatAxisMoney, money } from "@/components/StockUI";

export type DashboardChartData = {
  salesByDay: Array<{
    date: string;
    label: string;
    totalCents: number;
    count: number;
  }>;
  inventoryByCategory: Array<{
    category: string;
    units: number;
    valueCents: number;
  }>;
  inventoryStatus: Array<{ label: string; value: number; color: string }>;
};

const tooltipMoney = (value: number) => money(value);

export default function DashboardCharts({
  data,
}: {
  data: DashboardChartData;
}) {
  const [, setLocation] = useLocation();
  const [salesMode, setSalesMode] = useState<"totalCents" | "count">(
    "totalCents"
  );
  const [chartType, setChartType] = useState<"area" | "bar">("area");
  const [inventoryMode, setInventoryMode] = useState<"valueCents" | "units">(
    "valueCents"
  );

  // Métricas agregadas de ventas semanales
  const totalSalesWeekCents = useMemo(
    () => data.salesByDay.reduce((acc, d) => acc + d.totalCents, 0),
    [data.salesByDay]
  );
  const totalSalesWeekCount = useMemo(
    () => data.salesByDay.reduce((acc, d) => acc + d.count, 0),
    [data.salesByDay]
  );
  const averageTicketWeekCents = useMemo(
    () =>
      totalSalesWeekCount > 0
        ? Math.round(totalSalesWeekCents / totalSalesWeekCount)
        : 0,
    [totalSalesWeekCents, totalSalesWeekCount]
  );
  const averageDailySalesCents = useMemo(
    () => Math.round(totalSalesWeekCents / (data.salesByDay.length || 7)),
    [totalSalesWeekCents, data.salesByDay.length]
  );
  const bestDay = useMemo(() => {
    if (!data.salesByDay.length) return null;
    return data.salesByDay.reduce(
      (best, cur) => (cur.totalCents > best.totalCents ? cur : best),
      data.salesByDay[0]
    );
  }, [data.salesByDay]);

  // Categorías ordenadas y acumulados
  const totalCatalogUnits = useMemo(
    () => data.inventoryByCategory.reduce((sum, c) => sum + c.units, 0),
    [data.inventoryByCategory]
  );
  const totalCatalogValueCents = useMemo(
    () => data.inventoryByCategory.reduce((sum, c) => sum + c.valueCents, 0),
    [data.inventoryByCategory]
  );
  const sortedCategories = useMemo(() => {
    return [...data.inventoryByCategory]
      .sort((a, b) =>
        inventoryMode === "valueCents"
          ? b.valueCents - a.valueCents
          : b.units - a.units
      )
      .slice(0, 6);
  }, [data.inventoryByCategory, inventoryMode]);

  const topCategory = sortedCategories[0];

  // Estado del inventario
  const statusData = data.inventoryStatus;
  const totalStatusProducts = useMemo(
    () => statusData.reduce((sum, item) => sum + item.value, 0),
    [statusData]
  );
  const healthyCount = statusData.find(s => s.label.toLowerCase().includes("saludable"))?.value ?? statusData[0]?.value ?? 0;
  const lowCount = statusData.find(s => s.label.toLowerCase().includes("bajo"))?.value ?? statusData[1]?.value ?? 0;
  const outCount = statusData.find(s => s.label.toLowerCase().includes("sin"))?.value ?? statusData[2]?.value ?? 0;

  const healthyPercent = totalStatusProducts > 0 ? Math.round((healthyCount / totalStatusProducts) * 100) : 0;
  const lowPercent = totalStatusProducts > 0 ? Math.round((lowCount / totalStatusProducts) * 100) : 0;
  const outPercent = totalStatusProducts > 0 ? Math.round((outCount / totalStatusProducts) * 100) : 0;

  const hasSales = data.salesByDay.some(
    day => day.totalCents > 0 || day.count > 0
  );
  const hasInventory = totalStatusProducts > 0;

  return (
    <section className="chart-grid">
      {/* 1. CARD PRINCIPAL PANORÁMICA DE VENTAS */}
      <article className="chart-card chart-card-sales">
        <div className="chart-card-header">
          <div>
            <div className="chart-header-tag">
              <TrendingUp size={13} />
              <span>Rendimiento comercial</span>
            </div>
            <h2>Tendencia de ventas (últimos 7 días)</h2>
            <p className="chart-subtitle">
              Evolución diaria de comprobantes confirmados y facturación del negocio.
            </p>
          </div>
          <div className="chart-controls-group">
            {/* Switcher de visualización: Área vs Barras */}
            <div className="chart-switcher" title="Cambiar tipo de gráfico">
              <button
                type="button"
                className={chartType === "area" ? "active" : ""}
                onClick={() => setChartType("area")}
                aria-label="Ver como curva continua"
              >
                Área
              </button>
              <button
                type="button"
                className={chartType === "bar" ? "active" : ""}
                onClick={() => setChartType("bar")}
                aria-label="Ver como barras diarias"
              >
                Barras
              </button>
            </div>

            {/* Switcher de métrica: Importe vs Comprobantes */}
            <div className="chart-switcher">
              <button
                type="button"
                className={salesMode === "totalCents" ? "active" : ""}
                onClick={() => setSalesMode("totalCents")}
              >
                Importe ($)
              </button>
              <button
                type="button"
                className={salesMode === "count" ? "active" : ""}
                onClick={() => setSalesMode("count")}
              >
                Comprobantes
              </button>
            </div>
          </div>
        </div>

        {/* Tira ejecutiva de métricas clave que aprovecha el ancho completo */}
        <div className="chart-kpi-strip">
          <div className="chart-kpi-item">
            <span className="kpi-label">Total 7 días</span>
            <span className="kpi-value">{money(totalSalesWeekCents)}</span>
            <span className="kpi-sub">{totalSalesWeekCount} comprobantes</span>
          </div>
          <div className="chart-kpi-item">
            <span className="kpi-label">Promedio diario</span>
            <span className="kpi-value">{money(averageDailySalesCents)}</span>
            <span className="kpi-sub">por jornada</span>
          </div>
          <div className="chart-kpi-item">
            <span className="kpi-label">Ticket promedio</span>
            <span className="kpi-value">{money(averageTicketWeekCents)}</span>
            <span className="kpi-sub">por transacción</span>
          </div>
          <div className="chart-kpi-item">
            <span className="kpi-label">Día pico de ventas</span>
            <span className="kpi-value">
              {bestDay && bestDay.totalCents > 0 ? bestDay.label : "—"}
            </span>
            <span className="kpi-sub">
              {bestDay && bestDay.totalCents > 0
                ? money(bestDay.totalCents)
                : "Sin actividad"}
            </span>
          </div>
        </div>

        {/* Área del gráfico */}
        <div className="chart-area chart-area-sales-wide">
          {hasSales ? (
            <ResponsiveContainer width="100%" height="100%">
              {chartType === "area" ? (
                <AreaChart
                  data={data.salesByDay}
                  margin={{ top: 12, right: 12, left: -10, bottom: 4 }}
                >
                  <defs>
                    <linearGradient id="salesGradient" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="var(--brand)" stopOpacity={0.32} />
                      <stop offset="95%" stopColor="var(--brand)" stopOpacity={0.0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid
                    vertical={false}
                    stroke="var(--line-subtle)"
                    strokeDasharray="4 4"
                  />
                  <XAxis
                    dataKey="label"
                    axisLine={false}
                    tickLine={false}
                    tick={{ fill: "var(--muted-ink)", fontSize: 11.5 }}
                    tickMargin={10}
                  />
                  <YAxis
                    axisLine={false}
                    tickLine={false}
                    tick={{ fill: "var(--muted-ink)", fontSize: 11.5 }}
                    tickFormatter={(value: number) =>
                      salesMode === "totalCents"
                        ? formatAxisMoney(value)
                        : String(value)
                    }
                    allowDecimals={false}
                  />
                  <Tooltip
                    cursor={{ stroke: "var(--brand)", strokeWidth: 1.5, strokeDasharray: "3 3" }}
                    content={<SalesTooltip mode={salesMode} />}
                  />
                  <Area
                    type="monotone"
                    dataKey={salesMode}
                    stroke="var(--brand)"
                    strokeWidth={2.5}
                    fillOpacity={1}
                    fill="url(#salesGradient)"
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
                  data={data.salesByDay}
                  margin={{ top: 12, right: 12, left: -10, bottom: 4 }}
                >
                  <CartesianGrid
                    vertical={false}
                    stroke="var(--line-subtle)"
                    strokeDasharray="4 4"
                  />
                  <XAxis
                    dataKey="label"
                    axisLine={false}
                    tickLine={false}
                    tick={{ fill: "var(--muted-ink)", fontSize: 11.5 }}
                    tickMargin={10}
                  />
                  <YAxis
                    axisLine={false}
                    tickLine={false}
                    tick={{ fill: "var(--muted-ink)", fontSize: 11.5 }}
                    tickFormatter={(value: number) =>
                      salesMode === "totalCents"
                        ? formatAxisMoney(value)
                        : String(value)
                    }
                    allowDecimals={false}
                  />
                  <Tooltip
                    cursor={{ fill: "var(--surface-hover)" }}
                    content={<SalesTooltip mode={salesMode} />}
                  />
                  <Bar
                    dataKey={salesMode}
                    fill="var(--chart-1)"
                    radius={[6, 6, 2, 2]}
                    maxBarSize={42}
                  />
                </BarChart>
              )}
            </ResponsiveContainer>
          ) : (
            <ChartEmpty text="Todavía no hay ventas registradas en los últimos 7 días." />
          )}
        </div>

        {/* Tira día por día que aprovecha la base de la tarjeta sin espacios muertos */}
        <div className="sales-days-strip">
          {data.salesByDay.map(day => {
            const isBest =
              bestDay && bestDay.totalCents > 0 && day.date === bestDay.date;
            return (
              <div
                key={day.date}
                className={`day-pill ${isBest ? "day-pill-best" : ""}`}
              >
                <span className="day-name">{day.label}</span>
                <span className="day-val">
                  {salesMode === "totalCents"
                    ? money(day.totalCents)
                    : `${day.count} op.`}
                </span>
                {isBest && <span className="day-badge">Pico</span>}
              </div>
            );
          })}
        </div>
      </article>

      {/* 2. CARD DE DISTRIBUCIÓN POR CATEGORÍA */}
      <article className="chart-card chart-card-inventory">
        <div className="chart-card-header">
          <div>
            <div className="chart-header-tag">
              <Layers size={13} />
              <span>Composición del catálogo</span>
            </div>
            <h2>Inventario por categoría</h2>
            <p className="chart-subtitle">
              Distribución del stock actual por rubro de producto.
            </p>
          </div>
          <div className="chart-switcher">
            <button
              type="button"
              className={inventoryMode === "valueCents" ? "active" : ""}
              onClick={() => setInventoryMode("valueCents")}
            >
              Valor ($)
            </button>
            <button
              type="button"
              className={inventoryMode === "units" ? "active" : ""}
              onClick={() => setInventoryMode("units")}
            >
              Unidades
            </button>
          </div>
        </div>

        {/* Resumen rápido de categorías */}
        <div className="inventory-summary-strip">
          <span>
            Categorías: <b>{data.inventoryByCategory.length}</b>
          </span>
          <span>·</span>
          <span>
            {inventoryMode === "valueCents" ? (
              <>
                Valor total: <b>{money(totalCatalogValueCents)}</b>
              </>
            ) : (
              <>
                Unidades totales: <b>{totalCatalogUnits.toLocaleString("es-AR")} u.</b>
              </>
            )}
          </span>
          {topCategory && (
            <>
              <span>·</span>
              <span className="top-category-pill">
                Líder: <b>{topCategory.category}</b>
              </span>
            </>
          )}
        </div>

        {/* Gráfico y lista proporcional */}
        <div className="chart-area chart-area-category-balanced">
          {sortedCategories.length ? (
            <ResponsiveContainer width="100%" height="100%">
              <BarChart
                data={sortedCategories}
                layout="vertical"
                margin={{ top: 6, right: 16, left: 10, bottom: 6 }}
              >
                <CartesianGrid
                  horizontal={false}
                  stroke="var(--line-subtle)"
                  strokeDasharray="4 4"
                />
                <XAxis
                  type="number"
                  axisLine={false}
                  tickLine={false}
                  tick={{ fill: "var(--muted-ink)", fontSize: 11 }}
                  tickFormatter={(value: number) =>
                    inventoryMode === "valueCents"
                      ? formatAxisMoney(value)
                      : String(value)
                  }
                  allowDecimals={false}
                />
                <YAxis
                  type="category"
                  dataKey="category"
                  width={85}
                  axisLine={false}
                  tickLine={false}
                  tick={{ fill: "var(--ink)", fontSize: 11, fontWeight: 500 }}
                />
                <Tooltip
                  cursor={{ fill: "var(--surface-hover)" }}
                  content={<InventoryTooltip mode={inventoryMode} />}
                />
                <Bar
                  dataKey={inventoryMode}
                  fill="var(--chart-2)"
                  radius={[0, 6, 6, 0]}
                  maxBarSize={22}
                />
              </BarChart>
            </ResponsiveContainer>
          ) : (
            <ChartEmpty text="Cargá productos en el catálogo para ver la distribución." />
          )}
        </div>

        {/* Desglose porcentual de categorías para llenar armoniosamente la card */}
        {sortedCategories.length > 0 && (
          <div className="category-bars-container">
            {sortedCategories.slice(0, 4).map(cat => {
              const totalRef =
                inventoryMode === "valueCents"
                  ? totalCatalogValueCents
                  : totalCatalogUnits;
              const valRef =
                inventoryMode === "valueCents" ? cat.valueCents : cat.units;
              const pct = totalRef > 0 ? Math.round((valRef / totalRef) * 100) : 0;
              return (
                <div key={cat.category} className="category-bar-row">
                  <span className="category-bar-name" title={cat.category}>
                    {cat.category}
                  </span>
                  <div className="category-bar-track">
                    <div
                      className="category-bar-fill"
                      style={{ width: `${Math.max(5, pct)}%` }}
                    />
                  </div>
                  <span className="category-bar-values">
                    <b>{pct}%</b>{" "}
                    <small>
                      ({inventoryMode === "valueCents" ? money(cat.valueCents) : `${cat.units} u.`})
                    </small>
                  </span>
                </div>
              );
            })}
          </div>
        )}
      </article>

      {/* 3. CARD DE SALUD Y DISPONIBILIDAD DE STOCK */}
      <article className="chart-card chart-card-status">
        <div className="chart-card-header">
          <div>
            <div className="chart-header-tag">
              <Sparkles size={13} />
              <span>Monitoreo preventivo</span>
            </div>
            <h2>Salud del inventario</h2>
            <p className="chart-subtitle">
              Disponibilidad de existencias respecto a umbrales mínimos.
            </p>
          </div>
          {lowCount + outCount > 0 && (
            <button
              type="button"
              className="chart-alert-badge"
              onClick={() => setLocation("/stock")}
              title="Ir al inventario para revisar artículos"
            >
              <AlertTriangle size={12} />
              <span>{lowCount + outCount} a revisar</span>
            </button>
          )}
        </div>

        <div className="status-chart-body-modern">
          {hasInventory ? (
            <>
              {/* Donut interactivo */}
              <div className="donut-wrap">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={statusData}
                      dataKey="value"
                      nameKey="label"
                      innerRadius="64%"
                      outerRadius="88%"
                      paddingAngle={3}
                      stroke="none"
                    >
                      {statusData.map((item, index) => (
                        <Cell
                        key={`cell-${index}`}
                        fill={
                          item.label?.toLowerCase().includes("saludable")
                            ? "var(--status-ok)"
                            : item.label?.toLowerCase().includes("bajo")
                            ? "var(--status-warn)"
                            : "var(--status-critical)"
                        }
                      />
                      ))}
                    </Pie>
                    <Tooltip
                      formatter={(value: number | string, name: string | number) => [
                        `${value} productos`,
                        name,
                      ]}
                      contentStyle={{
                        background: "var(--surface)",
                        border: "1px solid var(--line)",
                        borderRadius: "8px",
                        color: "var(--ink)",
                        fontSize: "12px",
                      }}
                    />
                  </PieChart>
                </ResponsiveContainer>
                <div className="donut-center">
                  <strong>{totalStatusProducts}</strong>
                  <span>artículos</span>
                </div>
              </div>

              {/* Tarjetas de estado detalladas que llenan la altura de la card */}
              <div className="status-cards-col">
                <div className="status-mini-card status-healthy">
                  <div className="status-mini-left">
                    <span
                      className="status-dot"
                      style={{ background: "var(--status-ok)" }}
                    />
                    <div>
                      <span className="status-title">Saludable</span>
                      <span className="status-hint">Stock seguro</span>
                    </div>
                  </div>
                  <div className="status-mini-right">
                    <strong>{healthyCount}</strong>
                    <span>({healthyPercent}%)</span>
                  </div>
                </div>

                <div className="status-mini-card status-low">
                  <div className="status-mini-left">
                    <span
                      className="status-dot"
                      style={{ background: "var(--status-warn)" }}
                    />
                    <div>
                      <span className="status-title">Bajo mínimo</span>
                      <span className="status-hint">Reponer pronto</span>
                    </div>
                  </div>
                  <div className="status-mini-right">
                    <strong>{lowCount}</strong>
                    <span>({lowPercent}%)</span>
                  </div>
                </div>

                <div className="status-mini-card status-out">
                  <div className="status-mini-left">
                    <span
                      className="status-dot"
                      style={{ background: "var(--status-critical)" }}
                    />
                    <div>
                      <span className="status-title">Sin existencias</span>
                      <span className="status-hint">Crítico (0 u.)</span>
                    </div>
                  </div>
                  <div className="status-mini-right">
                    <strong>{outCount}</strong>
                    <span>({outPercent}%)</span>
                  </div>
                </div>
              </div>
            </>
          ) : (
            <ChartEmpty text="El estado de salud aparecerá cuando haya inventario cargado." />
          )}
        </div>

        {/* Barra de progreso de cobertura general */}
        {hasInventory && (
          <div className="health-progress-wrap">
            <div className="health-progress-labels">
              <span>Cobertura de catálogo</span>
              <b>{healthyPercent}% óptimo</b>
            </div>
            <div className="health-progress-bar">
              <div
                className="health-segment"
                style={{
                  width: `${healthyPercent}%`,
                  background: "var(--status-ok)",
                }}
                title={`Saludable: ${healthyPercent}%`}
              />
              <div
                className="health-segment"
                style={{
                  width: `${lowPercent}%`,
                  background: "var(--status-warn)",
                }}
                title={`Bajo mínimo: ${lowPercent}%`}
              />
              <div
                className="health-segment"
                style={{
                  width: `${outPercent}%`,
                  background: "var(--status-critical)",
                }}
                title={`Sin existencias: ${outPercent}%`}
              />
            </div>
            <button
              type="button"
              className="status-action-link"
              onClick={() => setLocation("/stock")}
            >
              Administrar existencias en depósitos <ArrowUpRight size={13} />
            </button>
          </div>
        )}
      </article>
    </section>
  );
}

function SalesTooltip({
  active,
  payload,
  label,
  mode,
}: {
  active?: boolean;
  payload?: Array<{ value: number }>;
  label?: string;
  mode: "totalCents" | "count";
}) {
  if (!active || !payload?.length) return null;
  const value = payload[0].value;
  return (
    <div className="chart-tooltip">
      <b>{label}</b>
      <span>
        {mode === "totalCents"
          ? tooltipMoney(value)
          : `${value} comprobante${value === 1 ? "" : "s"}`}
      </span>
    </div>
  );
}

function InventoryTooltip({
  active,
  payload,
  label,
  mode,
}: {
  active?: boolean;
  payload?: Array<{ value: number }>;
  label?: string;
  mode: "valueCents" | "units";
}) {
  if (!active || !payload?.length) return null;
  const value = payload[0].value;
  return (
    <div className="chart-tooltip">
      <b>{label}</b>
      <span>
        {mode === "valueCents" ? tooltipMoney(value) : `${value} unidades`}
      </span>
    </div>
  );
}

export function ChartEmpty({ text }: { text: string }) {
  return (
    <div className="chart-empty">
      <span>—</span>
      <p>{text}</p>
    </div>
  );
}
