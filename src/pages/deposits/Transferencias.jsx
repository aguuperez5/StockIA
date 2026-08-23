import React from "react";
import { useNavigate } from "react-router-dom";
import { Plus } from "lucide-react";
import { Panel, PageHeading } from "../../components/common";

export default function Transferencias() {
  const navigate = useNavigate();
  return (
    <section>
      <PageHeading title="Transferencias" subtitle="Movimientos de stock entre depósitos">
        <button className="primary-button" onClick={() => navigate("/panel/transferencias/nueva")}><Plus size={17} /> Nueva transferencia</button>
      </PageHeading>
      <Panel title="HISTORIAL DE TRANSFERENCIAS">
        <div className="table-wrap">
          <table>
            <thead><tr><th>REFERENCIA</th><th>ORIGEN</th><th>DESTINO</th><th>ÍTEMS</th><th>ESTADO</th></tr></thead>
            <tbody>
              <tr><td>#T-089</td><td>Principal</td><td>Norte</td><td>8</td><td><span className="status green">Completado</span></td></tr>
              <tr><td>#T-088</td><td>Central</td><td>Sur</td><td>15</td><td><span className="status yellow">Pendiente</span></td></tr>
              <tr><td>#T-087</td><td>Norte</td><td>Principal</td><td>12</td><td><span className="status green">Completado</span></td></tr>
            </tbody>
          </table>
        </div>
      </Panel>
    </section>
  );
}
