import {
  AlertTriangle,
  ArrowUpRight,
  Boxes,
  PackageSearch,
  Plus,
  QrCode,
  ShoppingCart,
  Warehouse,
} from "lucide-react";
import { useLocation } from "wouter";
import DashboardCharts from "@/components/DashboardCharts";
import {
  ErrorPanel,
  LoadingPanel,
  money,
  StockBadge,
} from "@/components/StockUI";
import { useAsyncData } from "@/hooks/useAsyncData";
import { saleService } from "@/services/sales";

export default function Home() {
  const [, setLocation] = useLocation();
  const { data, loading, error, reload } = useAsyncData(saleService.dashboard);

  return (
    <>
      <div className="home-hero">
        <div className="hero-content">
          <div className="hero-badge">
            <span className="hero-pulse-dot" />
            <span>CENTRO DE CONTROL INTELIGENTE</span>
            <span className="hero-badge-tag">IA & STOCK EN VIVO</span>
          </div>
          <h1 className="hero-title">
            Buen día, el inventario está{" "}
            <span className="hero-highlight">en orden.</span>
          </h1>
          <p className="hero-subtitle">
            Monitoreo en tiempo real de mercadería, movimientos de depósitos y
            trazabilidad visual con AprilTags.
          </p>
        </div>
        <div className="hero-actions">
          <button
            className="button-primary hero-btn-main"
            onClick={() => setLocation("/sales?new=1")}
          >
            <ShoppingCart size={17} />
            <span>Registrar venta</span>
          </button>
          <button
            className="button-secondary hero-btn-sub"
            onClick={() => setLocation("/products")}
            title="Gestionar e imprimir etiquetas AprilTags"
          >
            <QrCode size={16} />
            <span>AprilTags</span>
          </button>
          <button
            className="button-secondary hero-btn-sub"
            onClick={() => setLocation("/stock")}
            title="Ver depósitos y niveles de mercadería"
          >
            <Warehouse size={16} />
            <span>Depósitos</span>
          </button>
        </div>
      </div>

      {!data && loading && !error && <LoadingPanel rows={5} />}
      {error && <ErrorPanel message={error} retry={reload} />}
      {data && (
        <>
          <section className="metric-grid">
            <article className="metric-card card-green">
              <div className="metric-card-top">
                <span className="metric-icon green">
                  <Boxes size={20} />
                </span>
                <span className="metric-pill green">Catálogo</span>
              </div>
              <div>
                <p>Productos en catálogo</p>
                <h2>{data.products}</h2>
                <small>Artículos activos</small>
              </div>
            </article>

            <article className="metric-card card-blue">
              <div className="metric-card-top">
                <span className="metric-icon terracotta">
                  <Warehouse size={20} />
                </span>
                <span className="metric-pill blue">Ubicaciones</span>
              </div>
              <div>
                <p>Depósitos operativos</p>
                <h2>{data.warehouses}</h2>
                <small>Depósitos registrados</small>
              </div>
            </article>

            <article className="metric-card card-indigo">
              <div className="metric-card-top">
                <span className="metric-icon ink">
                  <PackageSearch size={20} />
                </span>
                <span className="metric-pill indigo">Lista</span>
              </div>
              <div>
                <p>Valor de inventario</p>
                <h2>{money(data.inventoryValueCents)}</h2>
                <small>Según precio de lista</small>
              </div>
            </article>

            <article className="metric-card card-amber">
              <div className="metric-card-top">
                <span className="metric-icon amber">
                  <ShoppingCart size={20} />
                </span>
                <span className="metric-pill amber">
                  <span className="mini-pulse-dot" /> En vivo
                </span>
              </div>
              <div>
                <p>Ventas de hoy</p>
                <h2>{money(data.todaySalesCents)}</h2>
                <small>
                  {data.todaySaleCount} comprobante
                  {data.todaySaleCount === 1 ? "" : "s"} confirmado
                  {data.todaySaleCount === 1 ? "" : "s"}
                </small>
              </div>
            </article>
          </section>

          <DashboardCharts data={data} />

          <section className="dashboard-grid">
            <article className="ledger-card">
              <div className="card-heading">
                <div>
                  <p className="eyebrow">Atención de inventario</p>
                  <h2>Stock para revisar</h2>
                </div>
                <button
                  className="text-button"
                  onClick={() => setLocation("/stock?filter=low")}
                >
                  Ver todo <ArrowUpRight size={15} />
                </button>
              </div>
              {data.lowStock.length ? (
                <div className="attention-list">
                  {data.lowStock.map(item => (
                    <div className="attention-item" key={item.id}>
                      <span className="attention-icon">
                        <AlertTriangle size={17} />
                      </span>
                      <div>
                        <b>{item.name}</b>
                        <small>
                          {item.sku} · mínimo {item.threshold} u.
                        </small>
                      </div>
                      <div className="attention-amount">
                        <strong>{item.stock} u.</strong>
                        <StockBadge
                          quantity={item.stock}
                          threshold={item.threshold}
                        />
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="quiet-state">
                  <span>✓</span>
                  <div>
                    <b>No hay alertas de stock</b>
                    <p>
                      Todos los productos están por encima de su mínimo
                      definido.
                    </p>
                  </div>
                </div>
              )}
            </article>

            <article className="quick-card">
              <div>
                <p className="eyebrow">Acciones rápidas</p>
                <h2>Empezá por acá</h2>
                <p className="card-copy">
                  Las tareas más usadas para mantener el negocio al día.
                </p>
              </div>
              <div className="quick-actions">
                <button onClick={() => setLocation("/products?new=1")}>
                  <span>
                    <Plus size={17} />
                  </span>
                  <div>
                    <b>Incorporar producto</b>
                    <small>Catálogo y stock inicial</small>
                  </div>
                  <ArrowUpRight size={16} />
                </button>
                <button onClick={() => setLocation("/products")}>
                  <span className="action-icon-apriltag">
                    <QrCode size={17} />
                  </span>
                  <div>
                    <b>Imprimir AprilTags</b>
                    <small>Etiquetas de alta precisión</small>
                  </div>
                  <ArrowUpRight size={16} />
                </button>
                <button onClick={() => setLocation("/stock")}>
                  <span>
                    <Warehouse size={17} />
                  </span>
                  <div>
                    <b>Registrar depósito</b>
                    <small>Nueva ubicación de mercadería</small>
                  </div>
                  <ArrowUpRight size={16} />
                </button>
                <button onClick={() => setLocation("/sales?new=1")}>
                  <span>
                    <ShoppingCart size={17} />
                  </span>
                  <div>
                    <b>Confirmar venta</b>
                    <small>Descuenta stock al instante</small>
                  </div>
                  <ArrowUpRight size={16} />
                </button>
              </div>
            </article>
          </section>
        </>
      )}
    </>
  );
}
