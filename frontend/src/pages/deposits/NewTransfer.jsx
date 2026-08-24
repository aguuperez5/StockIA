import React, { useState } from "react";
import { Camera, Check, Upload, ArrowDownUp } from "lucide-react";
import { BackHeading, Panel, Field, SelectField } from "../../components/common";
import { useAppData } from "../../context/AppDataContext";

export default function NewTransfer() {
  const { deposits } = useAppData();
  const [selectedImage, setSelectedImage] = useState(null);
  const [detected, setDetected] = useState(false);
  const [origen, setOrigen] = useState(deposits[0]?.id || "");
  const [destino, setDestino] = useState("");
  const [error, setError] = useState("");

  function onFile(e) {
    const file = e.target.files?.[0];
    if (!file) return;
    setSelectedImage(URL.createObjectURL(file));
    setTimeout(() => setDetected(true), 600);
  }

  function handleDestino(value) {
    setError(value && value === origen ? "El destino debe ser distinto al origen" : "");
    setDestino(value);
  }

  return (
    <section>
      <div className="page-heading transfer-heading">
        <BackHeading title="Transferencia / Remito" subtitle="Mover inventario entre depósitos" to="/panel/transferencias" />
        <div className="steps">
          <span className="current">1. Configurar</span><i>→</i><span>2. Revisar</span><i>→</i><span>3. Confirmar</span>
        </div>
      </div>

      <div className="two-column">
        <Panel title="RUTA DE TRANSFERENCIA">
          <div className="form-stack">
            <SelectField
              label="ORIGEN (DESDE)"
              options={deposits.map(d => ({ value: d.id, label: d.nombre }))}
              value={origen}
              onChange={e => setOrigen(e.target.value)}
            />
            <div className="route-arrow"><ArrowDownUp size={17}/></div>
            <SelectField
              label="DESTINO (HACIA)"
              placeholder="Seleccionar destino..."
              options={deposits.filter(d => d.id !== origen).map(d => ({ value: d.id, label: d.nombre }))}
              value={destino}
              onChange={e => handleDestino(e.target.value)}
              error={error}
            />
            <label className="field"><span>REFERENCIA <em>(opcional)</em></span><div className="input-wrap"><input placeholder="Número de orden, motivo..." /></div></label>
          </div>
        </Panel>

        <ProductDetection selectedImage={selectedImage} detected={detected} onFile={onFile} />
      </div>

      <div className="empty-detection">
        <Camera size={26}/>
        <p>Los productos detectados aparecerán aquí</p>
      </div>
    </section>
  );
}

function ProductDetection({ selectedImage, detected, onFile }) {
  return (
    <Panel title="DETECCIÓN DE PRODUCTOS">
      <p className="helper">Tomá una foto de los productos. La IA detectará ítems, cantidades y precios automáticamente.</p>
      <div className={`camera-box ${selectedImage ? "has-image" : ""}`}>
        {selectedImage ? <img src={selectedImage} alt="Vista previa" /> : (
          <>
            <Camera size={23}/>
            <strong>Tomar Foto</strong>
            <small>Usar cámara para detección IA</small>
          </>
        )}
      </div>
      <div className="or-divider"><span>o</span></div>
      <label className="upload-button">
        <Upload size={17}/>
        Subir imagen
        <input type="file" accept="image/*" onChange={onFile} />
      </label>
      <small className="formats">Formatos: JPG, PNG, HEIC · Máx. 20 MB</small>
      {detected && <div className="success-note"><Check size={16}/> Imagen cargada. Detección simulada lista.</div>}
    </Panel>
  );
}
