import { useEffect, useRef, useState } from "react";
import {
  CalendarDays,
  Download,
  Filter,
  X,
} from "lucide-react";
import { ReportExecutiveKpis } from "@/components/reports/ReportExecutiveKpis";
import { ReportSalesChart } from "@/components/reports/ReportSalesChart";
import { ReportDecisionGrids } from "@/components/reports/ReportDecisionGrids";
import { WarehouseReportModal } from "@/components/reports/WarehouseReportModal";
import {
  ErrorPanel,
  LoadingPanel,
  PageHeader,
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
          <ReportSalesChart data={data} from={from} to={to} />

          {/* Tablas de decisión estratégica (Todos los módulos siempre visibles) */}
          <ReportDecisionGrids
            data={data}
            onSelectWarehouse={setSelectedWarehouse}
          />

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
