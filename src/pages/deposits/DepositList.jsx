import React from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { Plus, Warehouse } from "lucide-react";
import { Panel, PageHeading, Banner } from "../../components/common";
import { useAppData } from "../../context/AppDataContext";

export default function DepositList() {
  const { deposits, products } = useAppData();
  const navigate = useNavigate();
  const location = useLocation();
  const successMessage = location.state?.success;

  return (
    <section>
      <PageHeading title="Depósitos" subtitle="Sucursales y depósitos de la empresa">
        <button className="primary-button" onClick={() => navigate("/panel/depositos/nuevo")}>
          <Plus size={17} /> Nuevo depósito
        </button>
      </PageHeading>

      {successMessage && <Banner tone="success">{successMessage}</Banner>}

      <Panel title={`DEPÓSITOS (${deposits.length})`}>
        <div className="table-wrap">
          <table>
            <thead>
              <tr><th>NOMBRE</th><th>TIPO</th><th>DIRECCIÓN</th><th>RESPONSABLE</th><th>CAPACIDAD</th><th>OCUPACIÓN</th></tr>
            </thead>
            <tbody>
              {deposits.map(d => {
                const count = products.reduce((a, p) => a + (p.stock[d.id] || 0), 0);
                return (
                  <tr key={d.id}>
                    <td><strong><Warehouse size={13} style={{ verticalAlign: "-2px", marginRight: 5 }} />{d.nombre}</strong></td>
                    <td>{d.tipo}</td>
                    <td>{d.direccion}</td>
                    <td>{d.responsable}</td>
                    <td>{d.capacidad ? `${d.capacidad} u.` : "—"}</td>
                    <td>{count} ítems</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </Panel>
    </section>
  );
}
