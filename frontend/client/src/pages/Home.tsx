import {
  AlertTriangle,
  ArrowUpRight,
  Boxes,
  PackageSearch,
  Plus,
  ShoppingCart,
  Warehouse,
} from "lucide-react";
import { useLocation } from "wouter";
import DashboardCharts from "@/components/DashboardCharts";
import {
  ErrorPanel,
  LoadingPanel,
  PageHeader,
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
      <PageHeader
        eyebrow="Centro de control"
        title="Buen día, el negocio está en orden."
        description="Seguí la mercadería, las ventas y los puntos que necesitan tu atención."
        action={
          <button
            className="button-primary"
            onClick={() => setLocation("/sales?new=1")}
          >
            <ShoppingCart size={17} />
            Registrar venta
          </button>
        }
      />
      {!data && loading && !error && <LoadingPanel rows={5} />}
      {error && <ErrorPanel message={error} retry={reload} />}
      {data && (
        <>
          <section className="metric-grid">
            <article className="metric-card">
              <span className="metric-icon green">
                <Boxes size={20} />
              </span>
              <div>
                <p>Productos en catálogo</p>
                <h2>{data.products}</h2>
                <small>Artículos activos</small>
              </div>
            </article>
            <article className="metric-card">
              <span className="metric-icon terracotta">
                <Warehouse size={20} />
              </span>
              <div>
                <p>Depósitos operativos</p>
                <h2>{data.warehouses}</h2>
                <small>Ubicaciones registradas</small>
              </div>
            </article>
            <article className="metric-card">
              <span className="metric-icon ink">
                <PackageSearch size={20} />
              </span>
              <div>
                <p>Valor de inventario</p>
                <h2>{money(data.inventoryValueCents)}</h2>
                <small>Según precio de lista</small>
              </div>
            </article>
            <article className="metric-card">
              <span className="metric-icon amber">
                <ShoppingCart size={20} />
              </span>
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
                  onClick={() => setLocation("/stock")}
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
