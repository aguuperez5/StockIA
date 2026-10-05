import {
  Check,
  ImageIcon,
  Link as LinkIcon,
  Trash2,
  Upload,
  Warehouse as WarehouseIcon,
  X,
} from "lucide-react";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { ModernSelect } from "@/components/ModernSelect";
import { type Warehouse, warehouseService } from "@/services/inventory";

export interface WarehouseFormData {
  name: string;
  type: Warehouse["type"];
  address: string;
  manager: string;
  capacity: number;
  imageUrl?: string | null;
}

export interface WarehouseFormModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  initialData?: Warehouse | null;
}

export function WarehouseFormModal({
  isOpen,
  onClose,
  onSuccess,
  initialData,
}: WarehouseFormModalProps) {
  const isEditing = Boolean(initialData);

  const [form, setForm] = useState<WarehouseFormData>({
    name: "",
    type: "Principal",
    address: "",
    manager: "",
    capacity: 0,
    imageUrl: null,
  });

  const [imageUrlInput, setImageUrlInput] = useState("");
  const [showUrlField, setShowUrlField] = useState(false);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    if (initialData) {
      setForm({
        name: initialData.name,
        type: initialData.type,
        address: initialData.address,
        manager: initialData.manager,
        capacity: initialData.capacity,
        imageUrl: initialData.imageUrl || null,
      });
      setImageUrlInput(initialData.imageUrl || "");
    } else {
      setForm({
        name: "",
        type: "Principal",
        address: "",
        manager: "",
        capacity: 0,
        imageUrl: null,
      });
      setImageUrlInput("");
    }
    setError("");
    setShowUrlField(false);
  }, [initialData, isOpen]);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    if (isOpen) {
      window.addEventListener("keydown", handleKeyDown);
    }
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const handleFileUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith("image/")) {
      toast.error("Por favor, seleccioná un archivo de imagen válido.");
      return;
    }

    if (file.size > 5 * 1024 * 1024) {
      toast.error("La imagen supera el límite permitido de 5MB.");
      return;
    }

    const reader = new FileReader();
    reader.onload = () => {
      const result = reader.result as string;
      setForm(prev => ({ ...prev, imageUrl: result }));
      setImageUrlInput("");
      toast.success("Foto de portada cargada correctamente.");
    };
    reader.onerror = () => {
      toast.error("Error al procesar la imagen seleccionada.");
    };
    reader.readAsDataURL(file);
    event.target.value = "";
  };

  const handleApplyUrl = () => {
    const trimmed = imageUrlInput.trim();
    if (!trimmed) {
      setForm(prev => ({ ...prev, imageUrl: null }));
      setShowUrlField(false);
      return;
    }

    if (!/^https?:\/\//i.test(trimmed)) {
      toast.error("La URL debe comenzar con http:// o https://");
      return;
    }

    setForm(prev => ({ ...prev, imageUrl: trimmed }));
    setShowUrlField(false);
    toast.success("URL de portada aplicada.");
  };

  const handleRemoveCover = () => {
    setForm(prev => ({ ...prev, imageUrl: null }));
    setImageUrlInput("");
    setShowUrlField(false);
    toast.info("Se quitó la foto. El depósito usará la apariencia por defecto.");
  };

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!form.name.trim() || !form.address.trim() || !form.manager.trim()) {
      setError("Completá el nombre, dirección y responsable del depósito.");
      return;
    }

    if (form.capacity < 0 || Number.isNaN(Number(form.capacity))) {
      setError("La capacidad debe ser un número entero mayor o igual a 0.");
      return;
    }

    setPending(true);
    setError("");

    try {
      if (initialData?.id) {
        await warehouseService.update(initialData.id, {
          name: form.name.trim(),
          type: form.type,
          address: form.address.trim(),
          manager: form.manager.trim(),
          capacity: Number(form.capacity),
          imageUrl: form.imageUrl || null,
        });
        toast.success(`Depósito "${form.name}" actualizado con éxito.`);
      } else {
        await warehouseService.create({
          name: form.name.trim(),
          type: form.type,
          address: form.address.trim(),
          manager: form.manager.trim(),
          capacity: Number(form.capacity),
          imageUrl: form.imageUrl || null,
        });
        toast.success(`Depósito "${form.name}" creado con éxito.`);
      }
      onSuccess();
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setPending(false);
    }
  };

  return (
    <div
      className="modal-backdrop warehouse-form-backdrop"
      onClick={e => {
        if (e.target === e.currentTarget) onClose();
      }}
      role="presentation"
    >
      <div
        className="modal-card warehouse-form-modal"
        role="dialog"
        aria-modal="true"
        aria-labelledby="warehouse-form-modal-title"
        onClick={e => e.stopPropagation()}
      >
        {/* Encabezado */}
        <header className="modal-header warehouse-form-header">
          <div className="warehouse-form-title-group">
            <span className="warehouse-form-icon-badge">
              <WarehouseIcon size={22} />
            </span>
            <div>
              <span className="modal-eyebrow">Gestión de infraestructura · Depósitos</span>
              <h2 id="warehouse-form-modal-title">
                {isEditing ? `Editar ${initialData?.name}` : "Nuevo Depósito"}
              </h2>
              <p className="modal-desc">
                {isEditing
                  ? "Actualizá la ubicación, responsable, capacidad o foto de portada."
                  : "Registrá una nueva ubicación de almacenamiento con sus datos operativos."}
              </p>
            </div>
          </div>
          <button
            type="button"
            className="modal-close-btn"
            onClick={onClose}
            aria-label="Cerrar ventana"
          >
            <X size={18} />
          </button>
        </header>

        {/* Cuerpo del formulario */}
        <form className="warehouse-form-body" onSubmit={handleSubmit} noValidate>
          {error && (
            <div className="alert-panel error">
              <span>{error}</span>
            </div>
          )}

          {/* SECCIÓN DE FOTO DE PORTADA */}
          <div className="warehouse-cover-upload-section">
            <div className="cover-section-header">
              <div className="cover-title-group">
                <ImageIcon size={16} />
                <h4>Foto de portada</h4>
                <span className="cover-optional-pill">Opcional</span>
              </div>
              <p className="cover-desc">
                Asigná una imagen representativa del depósito. Si no agregás una foto,
                se mostrará la tarjeta con el diseño e ícono por defecto.
              </p>
            </div>

            {/* Vista previa o placeholder */}
            <div className="cover-preview-card">
              {form.imageUrl ? (
                <div className="cover-active-display">
                  <img
                    src={form.imageUrl}
                    alt="Vista previa de portada"
                    className="cover-active-image"
                    onError={() => {
                      toast.error("No se pudo cargar la imagen desde la URL provista.");
                    }}
                  />
                  <div className="cover-overlay-gradient" />
                  <div className="cover-overlay-actions">
                    <span className="cover-status-badge">
                      <Check size={12} /> Portada personalizada
                    </span>
                    <div className="cover-btn-group">
                      <label className="button-secondary button-xs cover-action-btn">
                        <Upload size={12} /> Cambiar foto
                        <input
                          hidden
                          type="file"
                          accept="image/*"
                          onChange={handleFileUpload}
                        />
                      </label>
                      <button
                        type="button"
                        className="button-secondary button-xs cover-remove-btn"
                        onClick={handleRemoveCover}
                        title="Quitar portada y usar defecto"
                      >
                        <Trash2 size={12} /> Usar defecto
                      </button>
                    </div>
                  </div>
                </div>
              ) : (
                <div className="cover-default-placeholder">
                  <div className="default-preview-box">
                    <span className="default-glyph">
                      <WarehouseIcon size={26} />
                    </span>
                    <div className="default-text">
                      <b>Diseño por defecto</b>
                      <span>Fondo limpio con ícono y detalles del depósito</span>
                    </div>
                  </div>
                  <div className="cover-upload-buttons">
                    <label className="button-primary button-xs cover-action-btn">
                      <Upload size={13} /> Subir imagen
                      <input
                        hidden
                        type="file"
                        accept="image/*"
                        onChange={handleFileUpload}
                      />
                    </label>
                    <button
                      type="button"
                      className="button-secondary button-xs cover-action-btn"
                      onClick={() => setShowUrlField(!showUrlField)}
                    >
                      <LinkIcon size={13} /> Pegar URL
                    </button>
                  </div>
                </div>
              )}
            </div>

            {/* Input plegable para ingresar URL externa */}
            {showUrlField && !form.imageUrl && (
              <div className="cover-url-input-row">
                <input
                  type="url"
                  placeholder="https://ejemplo.com/foto-deposito.jpg"
                  value={imageUrlInput}
                  onChange={e => setImageUrlInput(e.target.value)}
                  onKeyDown={e => {
                    if (e.key === "Enter") {
                      e.preventDefault();
                      handleApplyUrl();
                    }
                  }}
                  className="cover-url-input"
                />
                <button
                  type="button"
                  className="button-primary button-xs"
                  onClick={handleApplyUrl}
                  disabled={!imageUrlInput.trim()}
                >
                  Aplicar
                </button>
                <button
                  type="button"
                  className="button-ghost button-xs"
                  onClick={() => setShowUrlField(false)}
                >
                  Cancelar
                </button>
              </div>
            )}
          </div>

          {/* CAMPOS PRINCIPALES DEL DEPÓSITO */}
          <div className="warehouse-fields-grid">
            <label className="field-group full-width">
              <span className="field-label">Nombre del depósito *</span>
              <input
                required
                value={form.name}
                onChange={e => setForm({ ...form, name: e.target.value })}
                placeholder="Ej. Depósito Central, Sucursal Norte..."
                className="input-field"
              />
            </label>

            <label className="field-group">
              <span className="field-label">Tipo de depósito</span>
              <ModernSelect
                value={form.type}
                onChange={val =>
                  setForm({ ...form, type: val as Warehouse["type"] })
                }
                options={["Principal", "Sucursal", "Depósito externo"]}
                ariaLabel="Tipo de depósito"
                minWidth="100%"
                className="w-full"
              />
            </label>

            <label className="field-group">
              <span className="field-label">Capacidad de almacenamiento (unidades)</span>
              <input
                type="number"
                min="0"
                value={form.capacity}
                onChange={e =>
                  setForm({ ...form, capacity: Number(e.target.value) })
                }
                placeholder="0 = Sin límite"
                className="input-field"
              />
            </label>

            <label className="field-group">
              <span className="field-label">Dirección física *</span>
              <input
                required
                value={form.address}
                onChange={e => setForm({ ...form, address: e.target.value })}
                placeholder="Calle, número, ciudad o sector"
                className="input-field"
              />
            </label>

            <label className="field-group">
              <span className="field-label">Responsable / Encargado *</span>
              <input
                required
                value={form.manager}
                onChange={e => setForm({ ...form, manager: e.target.value })}
                placeholder="Nombre y apellido del encargado"
                className="input-field"
              />
            </label>
          </div>

          {/* Pie de acciones */}
          <footer className="warehouse-form-footer">
            <button
              type="button"
              className="button-secondary"
              onClick={onClose}
              disabled={pending}
            >
              Cancelar
            </button>
            <button
              type="submit"
              className="button-primary save-warehouse-btn"
              disabled={pending}
            >
              {pending ? (
                <>Guardando...</>
              ) : (
                <>
                  <Check size={16} />
                  {isEditing ? "Guardar cambios" : "Crear depósito"}
                </>
              )}
            </button>
          </footer>
        </form>
      </div>
    </div>
  );
}
