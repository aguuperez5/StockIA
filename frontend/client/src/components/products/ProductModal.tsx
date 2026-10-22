import {
  BadgeDollarSign,
  Boxes,
  Camera,
  Link as LinkIcon,
  Save,
  Trash2,
  Upload,
  Warehouse as WarehouseIcon,
  X,
} from "lucide-react";
import { useEffect, useMemo, useRef, useState } from "react";
import { toast } from "sonner";
import {
  ErrorPanel,
  Field,
  LoadingPanel,
  SubmitButton,
} from "@/components/StockUI";
import { ModernSelect } from "@/components/ModernSelect";
import { warehouseService, type Warehouse } from "@/services/inventory";
import { productService } from "@/services/products";
import { priceRuleService } from "@/services/backlog";
import { AprilTagBadge } from "./AprilTagBadge";

type FormData = {
  name: string;
  sku: string;
  category: string;
  price: string;
  lowStockThreshold: string;
  initialStock: string;
  warehouseId: string;
  imageUrl: string;
};

const getBlankForm = (): FormData => ({
  name: "",
  sku: "",
  category: "",
  price: "",
  lowStockThreshold: "5",
  initialStock: "0",
  warehouseId: cachedWarehouses.length > 0 ? String(cachedWarehouses[0].id) : "",
  imageUrl: "",
});

import { parseMoney, resizeImageToDataUrl } from "./productFormUtils";

let cachedCategories: string[] = [];
let cachedWarehouses: Warehouse[] = [];

interface ProductModalProps {
  editId?: string | number | null;
  initialSku?: string;
  onClose: () => void;
  onSuccess: () => void;
}

export function ProductModal({ editId, initialSku, onClose, onSuccess }: ProductModalProps) {
  const isEdit = Boolean(editId);
  const [form, setForm] = useState<FormData>(() => {
    const blank = getBlankForm();
    if (!editId && initialSku) {
      blank.sku = initialSku;
    }
    return blank;
  });
  const [warehouses, setWarehouses] = useState<Warehouse[]>(cachedWarehouses);
  const [knownCategories, setKnownCategories] = useState<string[]>(cachedCategories);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [pageError, setPageError] = useState("");
  const [loading, setLoading] = useState(isEdit);
  const [pending, setPending] = useState(false);
  const [priceRules, setPriceRules] = useState<
    Array<{ minQuantity: string; price: string }>
  >([]);
  const [apriltagId, setApriltagId] = useState<number | null>(null);

  const [isCameraActive, setIsCameraActive] = useState(false);
  const [showUrlInput, setShowUrlInput] = useState(false);
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const streamRef = useRef<MediaStream | null>(null);

  // Cargar categorías conocidas
  useEffect(() => {
    productService
      .list()
      .then(result => {
        const cats = Array.from(
          new Set(result.items.map(item => item.category).filter(Boolean))
        ).sort();
        cachedCategories = cats;
        setKnownCategories(cats);
      })
      .catch((err: Error) => {
        console.error("Error al cargar categorías sugeridas:", err);
      });
  }, []);

  // Cargar depósitos
  useEffect(() => {
    warehouseService
      .list()
      .then(result => {
        cachedWarehouses = result.items;
        setWarehouses(result.items);
        if (!isEdit) {
          setForm(current => ({
            ...current,
            warehouseId:
              current.warehouseId || (result.items[0]?.id ? String(result.items[0].id) : ""),
          }));
        }
      })
      .catch((reason: Error) => setPageError(reason.message));
  }, [isEdit]);

  const warehouseOptions = useMemo(() => {
    return warehouses.map(w => ({
      value: String(w.id),
      label: `${w.name} · ${w.type}`,
    }));
  }, [warehouses]);

  // Cargar datos del producto si estamos en edición
  useEffect(() => {
    if (!editId) {
      setForm(getBlankForm());
      setPriceRules([]);
      setApriltagId(null);
      setLoading(false);
      return;
    }

    setLoading(true);
    productService
      .get(editId)
      .then(({ item }) => {
        setForm({
          name: item.name,
          sku: item.sku,
          category: item.category,
          price: String(item.price),
          lowStockThreshold: String(item.lowStockThreshold),
          initialStock: "0",
          warehouseId: "",
          imageUrl: item.imageUrl ?? "",
        });
        setApriltagId(item.apriltagId ?? null);
      })
      .catch((reason: Error) => setPageError(reason.message))
      .finally(() => setLoading(false));

    priceRuleService
      .list(editId)
      .then(result =>
        setPriceRules(
          result.items.map(rule => ({
            minQuantity: String(rule.minQuantity),
            price: String(rule.price ?? ""),
          }))
        )
      )
      .catch((err: Error) => {
        console.error("Error al cargar tramos de precio existentes:", err);
      });
  }, [editId]);

  // Manejo de cámara
  const stopCamera = () => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => track.stop());
      streamRef.current = null;
    }
    setIsCameraActive(false);
  };

  const startCamera = async () => {
    try {
      if (!navigator.mediaDevices?.getUserMedia) {
        toast.error(
          "Tu navegador no soporta captura de cámara en directo. Podés subir una imagen con 'Subir foto'."
        );
        return;
      }
      const stream = await navigator.mediaDevices.getUserMedia({
        video: {
          facingMode: { ideal: "environment" },
          width: { ideal: 1280 },
          height: { ideal: 720 },
        },
      });
      streamRef.current = stream;
      setIsCameraActive(true);
      setTimeout(() => {
        if (videoRef.current) {
          videoRef.current.srcObject = stream;
          void videoRef.current.play();
        }
      }, 100);
    } catch {
      toast.error(
        "No se pudo acceder a la cámara. Revisá los permisos o subí una foto desde el dispositivo."
      );
    }
  };

  const captureCameraPhoto = () => {
    if (!videoRef.current) return;
    const video = videoRef.current;
    const canvas = document.createElement("canvas");
    canvas.width = video.videoWidth || 640;
    canvas.height = video.videoHeight || 480;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
    const dataUrl = canvas.toDataURL("image/jpeg", 0.85);
    update("imageUrl", dataUrl);
    stopCamera();
    toast.success("Foto de portada capturada.");
  };

  const handleFileChange = async (
    event: React.ChangeEvent<HTMLInputElement>
  ) => {
    const file = event.target.files?.[0];
    if (!file) return;
    try {
      const dataUrl = await resizeImageToDataUrl(file);
      update("imageUrl", dataUrl);
      toast.success("Foto de portada cargada correctamente.");
    } catch (err) {
      toast.error((err as Error).message);
    } finally {
      event.target.value = "";
    }
  };

  const removePhoto = () => {
    update("imageUrl", "");
    toast.info("Foto de portada removida.");
  };

  // Detener cámara al desmontar o cerrar
  useEffect(() => {
    return () => {
      stopCamera();
    };
  }, []);

  // Cerrar con tecla Escape
  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        handleClose();
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, []);

  const handleClose = () => {
    stopCamera();
    onClose();
  };

  const update = (key: keyof FormData, value: string) =>
    setForm(current => ({ ...current, [key]: value }));

  const addRule = () =>
    setPriceRules(current => [
      ...current,
      { minQuantity: "2", price: form.price },
    ]);

  const submit = async (event: React.FormEvent) => {
    event.preventDefault();
    const next: Record<string, string> = {};
    if (!form.name.trim()) next.name = "Ingresá el nombre comercial.";
    if (!form.sku.trim()) next.sku = "Ingresá un SKU o código interno.";
    if (!form.category.trim()) next.category = "Indicá una categoría.";
    if (!Number.isFinite(parseMoney(form.price)) || parseMoney(form.price) <= 0)
      next.price = "El precio debe ser mayor a cero.";
    if (
      !Number.isInteger(Number(form.lowStockThreshold)) ||
      Number(form.lowStockThreshold) < 0
    )
      next.lowStockThreshold = "Ingresá un mínimo válido.";
    if (
      !isEdit &&
      (!Number.isInteger(Number(form.initialStock)) ||
        Number(form.initialStock) < 0)
    )
      next.initialStock = "Ingresá una cantidad válida.";
    if (!isEdit && Number(form.initialStock) > 0 && !form.warehouseId)
      next.warehouseId = "Elegí dónde queda el stock inicial.";

    setErrors(next);
    if (Object.keys(next).length) return;

    setPending(true);
    setPageError("");

    const input = {
      name: form.name.trim(),
      sku: form.sku.trim().toUpperCase(),
      category: form.category.trim(),
      price: parseMoney(form.price),
      lowStockThreshold: Number(form.lowStockThreshold),
      initialStock: Number(form.initialStock),
      warehouseId: form.warehouseId ? Number(form.warehouseId) : undefined,
      imageUrl: form.imageUrl.trim() ? form.imageUrl.trim() : null,
    };

    const rules = priceRules.map(rule => ({
      minQuantity: Number(rule.minQuantity),
      price: parseMoney(rule.price),
    }));

    if (
      rules.some(
        (rule, index) =>
          !Number.isInteger(rule.minQuantity) ||
          rule.minQuantity < 2 ||
          rule.price <= 0 ||
          (index > 0 && rule.minQuantity <= rules[index - 1].minQuantity)
      )
    ) {
      setPageError(
        "Revisá los tramos de precio: cantidades ascendentes y precios válidos."
      );
      setPending(false);
      return;
    }

    try {
      const result = isEdit && editId
        ? await productService.update(editId, input)
        : await productService.create(input);

      const productId: string | number =
        editId ?? ("id" in result ? Number(result.id) : 0);

      if (productId && (isEdit || rules.length)) {
        try {
          await priceRuleService.save(productId, rules);
        } catch (ruleErr) {
          if (!isEdit) {
            toast.warning(
              "El producto fue creado, pero falló el guardado de tramos de precio: " +
                (ruleErr as Error).message
            );
          } else {
            throw ruleErr;
          }
        }
      }

      toast.success(
        isEdit
          ? "Producto actualizado correctamente."
          : "Producto incorporado correctamente."
      );
      stopCamera();
      onSuccess();
    } catch (reason) {
      setPageError((reason as Error).message);
    } finally {
      setPending(false);
    }
  };

  return (
    <div
      className="modal-backdrop warehouse-detail-backdrop"
      onClick={handleClose}
      role="presentation"
    >
      <section
        className="warehouse-detail-screen warehouse-detail-modal product-modal-dialog"
        role="dialog"
        aria-modal="true"
        aria-labelledby="product-modal-title"
        onClick={event => event.stopPropagation()}
      >
        <div className="warehouse-detail-header">
          <div>
            <span className="eyebrow">
              {isEdit ? "Catálogo · Edición" : "Catálogo · Alta"}
            </span>
            <h2 id="product-modal-title">
              {isEdit ? "Editar producto" : "Nuevo producto"}
            </h2>
            <p>
              {isEdit
                ? "Actualizá la ficha comercial sin alterar los movimientos de inventario."
                : "Definí la ficha comercial y, si corresponde, el stock con el que ingresa."}
            </p>
          </div>
          <button
            className="modal-close"
            type="button"
            onClick={handleClose}
            aria-label="Cerrar modal"
          >
            <X size={18} />
          </button>
        </div>

        {pageError && <ErrorPanel message={pageError} />}

        {loading ? (
          <LoadingPanel rows={6} />
        ) : (
          <form className="form-card product-form" onSubmit={submit} noValidate>
            <div className="form-section">
              <div className="form-section-title">
                <span>
                  <Boxes size={18} />
                </span>
                <div>
                  <h2>Ficha del producto</h2>
                  <p>Información que identifica el artículo en tu operación.</p>
                </div>
              </div>

              {isEdit && (
                <div className="mb-4 p-3 bg-neutral-50 dark:bg-neutral-800/60 border border-neutral-200 dark:border-neutral-700/80 rounded-lg flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <AprilTagBadge
                      tagId={apriltagId}
                      productName={form.name}
                      sku={form.sku}
                      size="lg"
                    />
                    <div>
                      <div className="text-xs font-semibold text-neutral-800 dark:text-neutral-200">
                        Código AprilTag Asignado
                      </div>
                      <div className="text-[11px] text-neutral-500">
                        Familia tag36h11 (marcador fiducial para escaneo rápido con cámara)
                      </div>
                    </div>
                  </div>
                </div>
              )}

              <div className="form-grid two">
                <Field label="Nombre del producto" error={errors.name}>
                  <input
                    value={form.name}
                    onChange={e => update("name", e.target.value)}
                    placeholder="Ej. Yerba mate orgánica 500 g"
                    autoFocus
                  />
                </Field>
                <Field label="Código SKU" error={errors.sku}>
                  <input
                    value={form.sku}
                    onChange={e => update("sku", e.target.value.toUpperCase())}
                    placeholder="Ej. YER-500-ORG"
                  />
                </Field>
                <Field label="Categoría" error={errors.category}>
                  <input
                    value={form.category}
                    onChange={e => update("category", e.target.value)}
                    placeholder="Ej. Almacén"
                    list="modal-known-categories"
                  />
                  <datalist id="modal-known-categories">
                    {knownCategories.map(option => (
                      <option key={option} value={option} />
                    ))}
                  </datalist>
                </Field>
                <Field label="Precio de venta" error={errors.price}>
                  <div className="input-prefix">
                    <span>$</span>
                    <input
                      inputMode="decimal"
                      value={form.price}
                      onChange={e => update("price", e.target.value)}
                      placeholder="0,00"
                    />
                  </div>
                </Field>
              </div>

              <div className="product-cover-container">
                <span className="cover-title">Foto de portada (opcional)</span>
                <p className="cover-subtitle">
                  Podés sacarle una foto con tu cámara o subirla para tenerla como
                  portada del producto.
                </p>

                <input
                  type="file"
                  ref={fileInputRef}
                  accept="image/*"
                  style={{ display: "none" }}
                  onChange={handleFileChange}
                />

                {isCameraActive ? (
                  <div className="camera-viewfinder-card">
                    <div className="camera-viewfinder-inner">
                      <video
                        ref={videoRef}
                        autoPlay
                        playsInline
                        muted
                        className="camera-video-stream"
                      />
                      <div className="camera-viewfinder-guide">
                        <span className="guide-label">
                          Centrá el producto para la foto
                        </span>
                      </div>
                    </div>
                    <div className="camera-controls">
                      <button
                        type="button"
                        className="button-primary"
                        onClick={captureCameraPhoto}
                      >
                        <Camera size={16} /> Capturar foto
                      </button>
                      <button
                        type="button"
                        className="button-secondary"
                        onClick={stopCamera}
                      >
                        Cancelar
                      </button>
                    </div>
                  </div>
                ) : form.imageUrl ? (
                  <div className="cover-preview-card">
                    <img
                      src={form.imageUrl}
                      alt="Portada del producto"
                      className="cover-preview-img"
                      onError={e => {
                        (e.target as HTMLImageElement).style.display = "none";
                      }}
                    />
                    <div className="cover-preview-actions">
                      <button
                        type="button"
                        className="button-secondary"
                        onClick={startCamera}
                      >
                        <Camera size={15} /> Cambiar (Cámara)
                      </button>
                      <button
                        type="button"
                        className="button-secondary"
                        onClick={() => fileInputRef.current?.click()}
                      >
                        <Upload size={15} /> Subir otra foto
                      </button>
                      <button
                        type="button"
                        className="button-secondary danger-text"
                        onClick={removePhoto}
                      >
                        <Trash2 size={15} /> Quitar portada
                      </button>
                    </div>
                  </div>
                ) : (
                  <div className="cover-upload-buttons">
                    <button
                      type="button"
                      className="button-secondary"
                      onClick={startCamera}
                    >
                      <Camera size={16} /> Sacar foto con cámara
                    </button>
                    <button
                      type="button"
                      className="button-secondary"
                      onClick={() => fileInputRef.current?.click()}
                    >
                      <Upload size={16} /> Subir imagen
                    </button>
                    <button
                      type="button"
                      className="text-button"
                      onClick={() => setShowUrlInput(prev => !prev)}
                    >
                      <LinkIcon size={14} />{" "}
                      {showUrlInput ? "Ocultar URL" : "Usar enlace URL"}
                    </button>
                  </div>
                )}

                {showUrlInput && !isCameraActive && (
                  <div className="cover-url-row">
                    <input
                      type="url"
                      value={form.imageUrl.startsWith("data:") ? "" : form.imageUrl}
                      onChange={e => update("imageUrl", e.target.value)}
                      placeholder="https://… (enlace web a la imagen)"
                    />
                  </div>
                )}
              </div>
            </div>

            <div className="form-section">
              <div className="form-section-title">
                <span>
                  <BadgeDollarSign size={18} />
                </span>
                <div>
                  <h2>Precio mayorista</h2>
                  <p>Opcional: definí precios con descuento por cantidad o volumen.</p>
                </div>
              </div>
              {priceRules.map((rule, index) => (
                <div className="form-grid two" key={index} style={{ marginBottom: "12px" }}>
                  <Field label="Desde unidades">
                    <input
                      type="number"
                      min="2"
                      value={rule.minQuantity}
                      onChange={e =>
                        setPriceRules(current =>
                          current.map((item, i) =>
                            i === index
                              ? { ...item, minQuantity: e.target.value }
                              : item
                          )
                        )
                      }
                    />
                  </Field>
                  <Field label="Precio unitario">
                    <input
                      inputMode="decimal"
                      value={rule.price}
                      onChange={e =>
                        setPriceRules(current =>
                          current.map((item, i) =>
                            i === index ? { ...item, price: e.target.value } : item
                          )
                        )
                      }
                    />
                  </Field>
                  <div style={{ gridColumn: "span 2", display: "flex", justifyContent: "flex-end" }}>
                    <button
                      type="button"
                      className="text-button danger-text"
                      onClick={() =>
                        setPriceRules(current =>
                          current.filter((_, i) => i !== index)
                        )
                      }
                    >
                      Quitar tramo
                    </button>
                  </div>
                </div>
              ))}
              <button type="button" className="button-secondary" onClick={addRule}>
                Agregar tramo
              </button>
            </div>

            <div className="form-section">
              <div className="form-section-title">
                <span>
                  <BadgeDollarSign size={18} />
                </span>
                <div>
                  <h2>Control de inventario</h2>
                  <p>
                    El mínimo ayuda a detectar mercadería que necesita reposición.
                  </p>
                </div>
              </div>
              <div className="form-grid two">
                <Field label="Stock mínimo" error={errors.lowStockThreshold}>
                  <input
                    type="number"
                    min="0"
                    value={form.lowStockThreshold}
                    onChange={e => update("lowStockThreshold", e.target.value)}
                  />
                </Field>
                {!isEdit && (
                  <>
                    <Field label="Stock inicial" error={errors.initialStock}>
                      <input
                        type="number"
                        min="0"
                        value={form.initialStock}
                        onChange={e => update("initialStock", e.target.value)}
                      />
                    </Field>
                    <Field
                      label="Depósito de ingreso"
                      error={errors.warehouseId}
                      className="full"
                    >
                      <ModernSelect
                        value={form.warehouseId}
                        onChange={value => update("warehouseId", value)}
                        options={warehouseOptions}
                        placeholder="Seleccioná un depósito"
                        icon={<WarehouseIcon size={15} />}
                        className="w-full"
                        minWidth="100%"
                        side="bottom"
                        avoidCollisions={false}
                        matchTriggerWidth={true}
                      />
                      {warehouses.length > 0 ? (
                        <small className="field-hint">
                          {Number(form.initialStock) > 0
                            ? `Se registrarán ${form.initialStock} unidades en este depósito al crear el producto.`
                            : "Depósito asignado al producto (ingresará con 0 u. iniciales)."}
                        </small>
                      ) : (
                        <small className="field-hint">
                          Primero necesitás registrar al menos un depósito en "Stock y depósitos".
                        </small>
                      )}
                    </Field>
                  </>
                )}
              </div>
            </div>

            <div className="form-actions">
              <button
                type="button"
                className="button-secondary"
                onClick={handleClose}
              >
                Cancelar
              </button>
              <SubmitButton pending={pending}>
                <Save size={16} />
                {isEdit ? "Guardar cambios" : "Incorporar producto"}
              </SubmitButton>
            </div>
          </form>
        )}
      </section>
    </div>
  );
}
