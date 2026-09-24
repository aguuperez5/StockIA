import { Camera, RotateCcw, Search, Upload } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { recognitionService } from "@/services/backlog";
import { ErrorPanel } from "./StockUI";
export type DetectedProduct = {
  id: number;
  name: string;
  sku: string;
  priceCents?: number;
  confidence: number;
  stocks?: Array<{ warehouseId: number; warehouseName: string; quantity: number }>;
};

export default function PhotoCapture({
  onDetected,
  onPhoto
}: {
  onDetected: (items: DetectedProduct[]) => void;
  onPhoto?: (data: string, mimeType: string) => void;
}) {
  const [preview, setPreview] = useState("");
  const [query, setQuery] = useState("");
  const [pending, setPending] = useState(false);
  const [error, setError] = useState("");
  const [cameraOpen, setCameraOpen] = useState(false);
  const videoRef = useRef<HTMLVideoElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const previewUrlRef = useRef("");

  useEffect(() => () => {
    streamRef.current?.getTracks().forEach(track => track.stop());
    if (previewUrlRef.current) URL.revokeObjectURL(previewUrlRef.current);
  }, []);

  const toEvidencePhoto = (source: CanvasImageSource, width: number, height: number) => {
    const scale = Math.min(1, 1600 / Math.max(width, height));
    const canvas = document.createElement("canvas");
    canvas.width = Math.max(1, Math.round(width * scale));
    canvas.height = Math.max(1, Math.round(height * scale));
    canvas.getContext("2d")?.drawImage(source, 0, 0, canvas.width, canvas.height);
    return canvas.toDataURL("image/jpeg", 0.82);
  };

  const openCamera = async () => {
    if (!navigator.mediaDevices?.getUserMedia) {
      setError("Tu navegador no permite acceder a la cámara.");
      return;
    }
    try {
      streamRef.current = await navigator.mediaDevices.getUserMedia({ video: { facingMode: { ideal: "environment" } }, audio: false });
      setCameraOpen(true);
      requestAnimationFrame(() => {
        if (videoRef.current) videoRef.current.srcObject = streamRef.current;
      });
    } catch {
      setError("No se pudo abrir la cámara. Revisá los permisos del navegador.");
    }
  };

  const closeCamera = () => {
    streamRef.current?.getTracks().forEach(track => track.stop());
    streamRef.current = null;
    setCameraOpen(false);
  };

  const capture = () => {
    const video = videoRef.current;
    if (!video || video.videoWidth === 0) return;
    const data = toEvidencePhoto(video, video.videoWidth, video.videoHeight);
    setPreview(data);
    onPhoto?.(data, "image/jpeg");
    closeCamera();
    void analyze("captura de cámara", { data, mimeType: "image/jpeg" });
  };

  const analyze = async (value = query, photo?: { data: string; mimeType: string }) => {
    const trimmed = value.trim();
    if (!trimmed && !photo) {
      setError("Para analizar, tomá una foto, subí una imagen o ingresá un nombre o SKU en el campo de búsqueda.");
      return;
    }
    setPending(true);
    setError("");
    try {
      const result = await recognitionService.analyze(trimmed, photo);
      onDetected(result.items);
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setPending(false);
    }
  };

  const file = (event: React.ChangeEvent<HTMLInputElement>) => {
    const selected = event.target.files?.[0];
    if (!selected) return;
    if (!selected.type.startsWith("image/") || selected.size > 3_000_000) {
      setError("Elegí una imagen de hasta 3 MB.");
      return;
    }
    if (previewUrlRef.current) URL.revokeObjectURL(previewUrlRef.current);
    const url = URL.createObjectURL(selected);
    previewUrlRef.current = url;
    setPreview(url);
    event.currentTarget.value = "";
    const image = new Image();
    image.onload = () => {
      const data = toEvidencePhoto(image, image.naturalWidth, image.naturalHeight);
      onPhoto?.(data, "image/jpeg");
      void analyze(selected.name.replace(/\.[^.]+$/, "").replaceAll(/[-_]/g, " "), { data, mimeType: "image/jpeg" });
    };
    image.onerror = () => setError("No se pudo leer la imagen elegida.");
    image.src = url;
  };

  return (
    <section className="form-section">
      <div className="form-section-title">
        <span><Camera size={18} /></span>
        <div>
          <h2>Cargar por foto o analizar catálogo</h2>
          <p>Elegí una imagen, abrí la cámara o buscá un artículo para identificar productos y verificar existencias.</p>
        </div>
      </div>
      {error && <ErrorPanel message={error} />}
      {cameraOpen && (
        <div className="camera-panel">
          <video ref={videoRef} autoPlay playsInline muted />
          <div className="form-actions">
            <button type="button" className="button-primary" onClick={capture}><Camera size={16} />Capturar foto</button>
            <button type="button" className="button-secondary" onClick={closeCamera}>Cancelar</button>
          </div>
        </div>
      )}
      {preview && <img src={preview} alt="Vista previa del producto" style={{ maxWidth: "220px", maxHeight: "160px", borderRadius: "12px", border: "1px solid var(--line)" }} />}
      <div className="form-actions">
        <button type="button" className="button-secondary" onClick={() => void openCamera()}><Camera size={16} />Abrir cámara</button>
        <label className="button-secondary"><Upload size={16} />Elegir archivo<input hidden type="file" accept="image/*" onChange={file} /></label>
        {preview && <button type="button" className="button-secondary" onClick={() => { if (previewUrlRef.current) URL.revokeObjectURL(previewUrlRef.current); previewUrlRef.current = ""; setPreview(""); setQuery(""); onPhoto?.("", "image/jpeg"); }}><RotateCcw size={16} />Reintentar</button>}
      </div>
      <div className="form-grid two">
        <label className="field">
          <span>Buscar en catálogo para revisar</span>
          <div className="input-prefix">
            <Search size={16} />
            <input value={query} onChange={e => setQuery(e.target.value)} onKeyDown={e => { if (e.key === "Enter") { e.preventDefault(); void analyze(); } }} placeholder="Nombre o SKU para analizar" />
          </div>
        </label>
        <button type="button" className="button-primary" onClick={() => void analyze()} disabled={pending}>
          {pending ? "Analizando…" : "Analizar producto"}
        </button>
      </div>
    </section>
  );
}
