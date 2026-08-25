import React from "react";
import { useNavigate } from "react-router-dom";
import {
  ShoppingCart, ArrowRightLeft, Package, Users, FileBarChart,
  ChevronRight, CircleAlert, CircleCheck, Box
} from "lucide-react";
import { Panel, StatusBadge } from "../components/common";
import { useAppData } from "../context/AppDataContext";
import { formatCurrency, formatDateTime } from "../utils/format";

export default function Dashboard() {
  const navigate = useNavigate();
  const { products, deposits, sales, totalStock, stockLevel } = useAppData();

  const today = new Date().toDateString();
  const todaySales = sales.filter(s => new Date(s.fecha).toDateString() === today);
  const todayCount = todaySales.length || sales.slice(0, 3).length;
  const todayRevenue = (todaySales.length ? todaySales : sales.slice(0, 3)).reduce((a, s) => a + s.total, 0);
  const lowStockProducts = products.filter(p => ["Crítico", "Bajo", "Sin stock"].includes(stockLevel(p)));

  return (
    <section>
      <div className="page-heading">
        <div>
          <h1>Panel</h1>
          <p>Resumen operativo — Depósito Principal</p>
        </div>
      </div>

      <div className="metric-grid">
        <MetricCard label="VENTAS DE HOY" value={String(todayCount)} footer="Transacciones registradas" tone="green" />
        <MetricCard label="INGRESOS DE HOY" value={formatCurrency(todayRevenue)} footer="Total facturado" tone="green" />
        <MetricCard label="STOCK BAJO" value={String(lowStockProducts.length)} footer="Requiere atención" tone="red" alert />
        <MetricCard label="PRODUCTOS" value={String(products.length)} footer={`En ${deposits.length} depósitos`} tone="yellow" />
      </div>

      <div className="dashboard-grid">
        <div className="dashboard-left">
          <Panel title="ACCIONES RÁPIDAS">
            <div className="quick-actions">
              <button className="quick-action dark" onClick={() => navigate("/panel/nueva-venta")}>
                <ShoppingCart size={23} />
                <span><strong>Nueva Venta</strong><small>Procesar una transacción de cliente</small></span>
                <ChevronRight size={17} />
              </button>
              <button className="quick-action dark" onClick={() => navigate("/panel/transferencias/nueva")}>
                <ArrowRightLeft size={23} />
                <span><strong>Nueva Transferencia</strong><small>Mover stock entre depósitos</small></span>
                <ChevronRight size={17} />
              </button>
            </div>
            <div className="quick-secondary">
              <button onClick={() => navigate("/panel/productos")}><Package size={18}/><span><b>Productos</b><small>Alta y edición de productos</small></span></button>
              <button onClick={() => navigate("/panel/stock")}><Box size={18}/><span><b>Stock</b><small>Ver niveles de inventario</small></span></button>
              <button onClick={() => navigate("/panel/ventas")}><FileBarChart size={18}/><span><b>Historial</b><small>Ventas registradas</small></span></button>
            </div>
          </Panel>

          <RecentActivity />
        </div>

        <div className="dashboard-right">
          <LowStock items={lowStockProducts} navigate={navigate} totalStock={totalStock} />
          <DaySummary sales={sales} />
          <Deposits deposits={deposits} products={products} />
        </div>
      </div>
    </section>
  );
}

function MetricCard({ label, value, footer, tone, alert }) {
  return (
    <div className={`metric-card ${tone}`}>
      <div className="metric-top"><span>{label}</span>{alert ? <CircleAlert size={15}/> : <span className="trend">↗</span>}</div>
      <strong>{value}</strong>
      <small>{footer}</small>
    </div>
  );
}

function RecentActivity() {
  const { sales } = useAppData();
  const rows = sales.slice(0, 5);
  return (
    <Panel title="ACTIVIDAD RECIENTE" action={<a className="plain-link" href="/panel/ventas">Ver todo</a>}>
      <div className="activity-list">
        {rows.map(s => (
          <div className="activity-row" key={s.numero}>
            <div className="activity-icon green"><ShoppingCart size={16}/></div>
            <div className="activity-main">
              <div><strong>Venta #{s.numero}</strong><span> · {s.cliente}</span></div>
              <small>{formatDateTime(s.fecha)}</small>
            </div>
            <div className="activity-result"><strong>{formatCurrency(s.total)}</strong><span className="green">{s.estado}</span></div>
          </div>
        ))}
        {rows.length === 0 && <p className="helper">Todavía no hay ventas registradas.</p>}
      </div>
    </Panel>
  );
}

function LowStock({ items, navigate, totalStock }) {
  return (
    <Panel title="⚠ STOCK BAJO" action={<button className="plain-link" onClick={() => navigate("/panel/stock")}>Gestionar</button>}>
      <div className="stock-list">
        {items.slice(0, 4).map(p => {
          return (
            <div className="stock-item" key={p.id}>
              <div className="stock-item-head"><span>{p.nombre}</span><StatusBadge level={p.stockMinimo && totalStock(p) <= p.stockMinimo ? "Crítico" : "Bajo"} /></div>
              <small>{p.sku}</small>
              <div className="progress-row">
                <div className="progress"><i style={{ width: `${Math.min(100, (totalStock(p) / Math.max(1, p.stockMinimo * 2)) * 100)}%` }} /></div>
                <span>{totalStock(p)}/{p.stockMinimo * 2 || p.stockMinimo}</span>
              </div>
            </div>
          );
        })}
        {items.length === 0 && <p className="helper">Todos los productos están en niveles normales.</p>}
      </div>
    </Panel>
  );
}

function DaySummary({ sales }) {
  return (
    <Panel title="RESUMEN DEL DÍA">
      <div className="summary-list">
        <SummaryRow icon={CircleCheck} label="Ventas procesadas" value={String(sales.length)} tone="green"/>
      </div>
      <p className="helper" style={{ padding: "8px 13px 0" }}>
        Transferencias y reconocimiento por imagen todavía no están conectados a datos reales — no forman parte del alcance de este Sprint.
      </p>
    </Panel>
  );
}

function SummaryRow({icon: Icon, label, value, tone}) {
  return <div className="summary-row"><Icon size={15} className={tone}/><span>{label}</span><b>{value}</b></div>;
}

function Deposits({ deposits, products }) {
  const maxCap = Math.max(...deposits.map(d => d.capacidad || 1));
  return (
    <Panel title="DEPÓSITOS">
      <div className="deposit-list">
        {deposits.map(d => {
          const count = products.reduce((a, p) => a + (p.stock[d.id] || 0), 0);
          const pct = Math.round(((d.capacidad ? count : count) / (d.capacidad || Math.max(count, 1))) * 100);
          return (
            <div className="deposit" key={d.id}>
              <div><span>{d.nombre}</span><b>{Math.min(pct, 100)}%</b></div>
              <div className="deposit-bar"><i style={{ width: `${Math.min(pct, 100)}%` }} /></div>
              <small>{count} ítems</small>
            </div>
          );
        })}
      </div>
    </Panel>
  );
}
