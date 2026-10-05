import { useMemo } from "react";
import {
  Award,
  CheckCircle2,
  Clock,
  PackageCheck,
  Sparkles,
  Store,
} from "lucide-react";
import { money } from "@/components/StockUI";
import { type reportService } from "@/services/backlog";

type ReportData = Awaited<ReturnType<typeof reportService.get>>;

export interface ReportDecisionGridsProps {
  data: ReportData;
  onSelectWarehouse: (
    warehouse: NonNullable<ReportData["warehouseBreakdown"]>[number]
  ) => void;
}

export function ReportDecisionGrids({
  data,
  onSelectWarehouse,
}: ReportDecisionGridsProps) {
  const maxRevenueProduct = useMemo(() => {
    if (!data?.topRevenue?.length) return null;
    return data.topRevenue[0];
  }, [data?.topRevenue]);

  return (
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
            <span className="decision-badge ok-badge">Stock al día</span>
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
              {data.replenishment && data.replenishment.items.length > 0 ? (
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
                      ¡Excelente! Todo el stock actual se encuentra por encima
                      del mínimo sugerido.
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
              Hacé clic en una sucursal para abrir su reporte detallado y
              existencias.
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
              {data.warehouseBreakdown && data.warehouseBreakdown.length > 0 ? (
                data.warehouseBreakdown.map(warehouse => (
                  <tr
                    key={warehouse.id}
                    className="clickable-warehouse-row"
                    onClick={() => onSelectWarehouse(warehouse)}
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
                          <div style={{ width: `${warehouse.percentage}%` }} />
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
              <b>{money(data.stagnantStock.totalReferenceValueCents)}</b>
            </span>
            <span>·</span>
            <span>
              Unidades estancadas: <b>{data.stagnantStock.totalUnits} un.</b>
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
              {data.stagnantStock && data.stagnantStock.items.length > 0 ? (
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
                      <span className="suggestion-tag">Promo / Descuento</span>
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={4} className="empty-table-cell">
                    <Sparkles size={22} color="var(--brand)" />
                    <span>
                      No hay productos con stock estancado sin ventas en este
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
  );
}
