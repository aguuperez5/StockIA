import React from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { Plus, ArrowRightLeft } from "lucide-react";
import { Panel, PageHeading, Banner, EmptyState } from "../../components/common";

export default function Transferencias() {
  const navigate = useNavigate();
  const location = useLocation();
  const successMessage = location.state?.success;

  return (
    <section>
      <PageHeading title="Transferencias" subtitle="Movimientos de stock entre depósitos">
        <button className="primary-button" onClick={() => navigate("/panel/transferencias/nueva")}>
          <Plus size={17} /> Nueva transferencia
        </button>
      </PageHeading>

      {successMessage && <Banner tone="success">{successMessage}</Banner>}

      <Panel title="HISTORIAL DE TRANSFERENCIAS">
        <EmptyState
          icon={ArrowRightLeft}
          title="Sin historial dedicado"
          text="Cada transferencia genera un movimiento de salida en el origen y uno de entrada en el destino. Por ahora no hay una vista de historial consolidada; el efecto se ve reflejado en la consulta de Stock por depósito."
        />
      </Panel>
    </section>
  );
}
