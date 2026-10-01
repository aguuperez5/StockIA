import {
  AlertCircle,
  Camera,
  LoaderCircle,
  RotateCcw,
  Search,
  Sparkles,
  Upload,
  X,
} from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { recognitionService } from "@/services/backlog";

export type DetectedProduct = {
  id: number;
  name: string;
  sku: string;
  priceCents?: number;
  matchScore?: number;
  matchMethod?: "barcode_ocr" | "barcode" | "ocr_code" | "ocr_name";
  reviewRequired?: boolean;
  stocks?: Array<{
    warehouseId: number;
    warehouseName: string;
    quantity: number;
  }>;
};

export default function PhotoCapture({
  onDetected,
  onPhoto,
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

  useEffect(
    () => () => {
      streamRef.current?.getTracks().forEach(track => track.stop());
      if (previewUrlRef.current) URL.revokeObjectURL(previewUrlRef.current);
    },
    []
  );

  const toEvidencePhoto = (
    source: CanvasImageSource,
    width: number,
    height: number
  ) => {
    const scale = Math.min(1, 1600 / Math.max(width, height));
    const canvas = document.createElement("canvas");
    canvas.width = Math.max(1, Math.round(width * scale));
    canvas.height = Math.max(1, Math.round(height * scale));
    canvas
      .getContext("2d")
      ?.drawImage(source, 0, 0, canvas.width, canvas.height);
    return canvas.toDataURL("image/jpeg", 0.82);
  };

  const openCamera = async () => {
    if (!navigator.mediaDevices?.getUserMedia) {
      setError("Tu navegador no permite acceder a la cámara.");
      return;
    }
    try {
      streamRef.current = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: { ideal: "environment" } },
        audio: false,
      });
      setCameraOpen(true);
      setError("");
      requestAnimationFrame(() => {
        if (videoRef.current) videoRef.current.srcObject = streamRef.current;
      });
    } catch {
      setError(
        "No se pudo abrir la cámara. Revisá los permisos del navegador."
      );
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
    void analyze("", { data, mimeType: "image/jpeg" });
  };

  const clearPhoto = () => {
    if (previewUrlRef.current) URL.revokeObjectURL(previewUrlRef.current);
    previewUrlRef.current = "";
    setPreview("");
    onPhoto?.("", "image/jpeg");
  };

  const analyze = async (
    value = query,
    photo?: { data: string; mimeType: string }
  ) => {
    const trimmed = value.trim();
    if (!trimmed && !photo) {
      setError(
        "Para analizar, tomá una foto, subí una imagen o ingresá un nombre o SKU."
      );
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
    setError("");
    event.currentTarget.value = "";
    const image = new Image();
    image.onload = () => {
      const data = toEvidencePhoto(
        image,
        image.naturalWidth,
        image.naturalHeight
      );
      onPhoto?.(data, "image/jpeg");
      void analyze("", { data, mimeType: "image/jpeg" });
    };
    image.onerror = () => setError("No se pudo leer la imagen elegida.");
    image.src = url;
  };

  return (
    <section className="photo-capture-section">
      <div className="photo-capture-header">
        <span className="photo-capture-icon">
          <Camera size={18} />
        </span>
        <div className="photo-capture-headings">
          <h2>Cargar por foto o analizar catálogo</h2>
          <p>
            Elegí una imagen, abrí la cámara o buscá un artículo para
            identificar productos y verificar existencias.
          </p>
        </div>
      </div>

      {error && (
        <div className="photo-capture-alert">
          <AlertCircle size={15} className="alert-icon" />
          <span className="alert-text">{error}</span>
          <button
            type="button"
            className="alert-close-btn"
            onClick={() => setError("")}
            aria-label="Cerrar aviso"
          >
            <X size={13} />
          </button>
        </div>
      )}

      {cameraOpen && (
        <div className="camera-viewfinder-panel">
          <div className="camera-viewfinder-inner">
            <video ref={videoRef} autoPlay playsInline muted />
            <div className="camera-viewfinder-guide">
              <span className="guide-label">
                Centrá el producto o código de barras
              </span>
            </div>
          </div>
          <div className="camera-actions-bar">
            <button
              type="button"
              className="button-primary capture-btn"
              onClick={capture}
            >
              <Camera size={15} />
              Capturar foto
            </button>
            <button
              type="button"
              className="button-secondary"
              onClick={closeCamera}
            >
              Cancelar
            </button>
          </div>
        </div>
      )}

      {preview && !cameraOpen && (
        <div className="photo-preview-bar">
          <img
            src={preview}
            alt="Vista previa del producto"
            className="photo-preview-thumbnail"
          />
          <div className="photo-preview-meta">
            <b>Foto lista para análisis</b>
            <span>
              {pending
                ? "Analizando imagen con IA…"
                : "Imagen cargada para identificación visual"}
            </span>
          </div>
          <button
            type="button"
            className="button-secondary button-xs photo-preview-btn"
            onClick={clearPhoto}
          >
            <RotateCcw size={13} />
            <span>Cambiar foto</span>
          </button>
        </div>
      )}

      <div className="photo-capture-controls">
        <div className="photo-search-box">
          <Search size={15} className="photo-search-icon" />
          <input
            value={query}
            onChange={e => {
              setQuery(e.target.value);
              if (error) setError("");
            }}
            onKeyDown={e => {
              if (e.key === "Enter") {
                e.preventDefault();
                void analyze();
              }
            }}
            placeholder="Buscar en catálogo para revisar (nombre o SKU)..."
            aria-label="Buscar en catálogo para revisar"
          />
          {query && (
            <button
              type="button"
              className="photo-search-clear"
              onClick={() => setQuery("")}
              aria-label="Borrar texto"
            >
              <X size={13} />
            </button>
          )}
          <button
            type="button"
            className="button-primary photo-analyze-btn"
            onClick={() => void analyze()}
            disabled={pending}
          >
            {pending ? (
              <>
                <LoaderCircle size={14} className="spin" />
                <span>Analizando…</span>
              </>
            ) : (
              <>
                <Sparkles size={14} />
                <span>Analizar producto</span>
              </>
            )}
          </button>
        </div>

        <div className="photo-media-actions">
          <button
            type="button"
            className="button-secondary photo-action-btn"
            onClick={() => void openCamera()}
            title="Abrir cámara del dispositivo"
          >
            <Camera size={15} />
            <span>Abrir cámara</span>
          </button>
          <label
            className="button-secondary photo-action-btn"
            title="Elegir archivo de imagen"
          >
            <Upload size={15} />
            <span>Elegir archivo</span>
            <input hidden type="file" accept="image/*" onChange={file} />
          </label>
        </div>
      </div>
    </section>
  );
}
