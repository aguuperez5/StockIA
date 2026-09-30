import {
  ArrowLeft,
  BadgeDollarSign,
  Boxes,
  Camera,
  Link as LinkIcon,
  Save,
  Trash2,
  Upload,
} from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { useLocation, useRoute } from "wouter";
import { toast } from "sonner";
import {
  ErrorPanel,
  LoadingPanel,
  PageHeader,
  SubmitButton,
} from "@/components/StockUI";
import { warehouseService, type Warehouse } from "@/services/inventory";
import { productService } from "@/services/products";
import { priceRuleService } from "@/services/backlog";

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
const blank: FormData = {
  name: "",
  sku: "",
  category: "",
  price: "",
  lowStockThreshold: "5",
  initialStock: "0",
  warehouseId: "",
  imageUrl: "",
};

export const parseMoney = (value: string) => {
  const clean = String(value).trim();
  return Number(
    clean.includes(",") ? clean.replace(/\./g, "").replace(",", ".") : clean
  );
};

function resizeImageToDataUrl(
  fileOrBlob: Blob,
  maxWidth = 800,
  maxHeight = 800,
  quality = 0.82
): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      const img = new Image();
      img.onload = () => {
        let width = img.width;
        let height = img.height;
        if (width > maxWidth || height > maxHeight) {
          if (width > height) {
            height = Math.round((height * maxWidth) / width);
            width = maxWidth;
          } else {
            width = Math.round((width * maxHeight) / height);
            height = maxHeight;
          }
        }
        const canvas = document.createElement("canvas");
        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext("2d");
        if (!ctx) return resolve(img.src);
        ctx.drawImage(img, 0, 0, width, height);
        resolve(canvas.toDataURL("image/jpeg", quality));
      };
      img.onerror = () =>
        reject(new Error("No se pudo procesar la imagen seleccionada."));
      img.src = reader.result as string;
    };
    reader.onerror = () =>
      reject(new Error("No se pudo leer el archivo de imagen."));
    reader.readAsDataURL(fileOrBlob);
  });
}

let cachedCategories: string[] = [];
let cachedWarehouses: Warehouse[] = [];

export default function ProductFormPage() {
  const [, setLocation] = useLocation();
  const [, params] = useRoute("/products/:id/edit");
  const editId = params?.id;
  const [form, setForm] = useState<FormData>(blank);
  const [warehouses, setWarehouses] = useState<Warehouse[]>(cachedWarehouses);
  const [knownCategories, setKnownCategories] =
    useState<string[]>(cachedCategories);
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
      .catch(() => undefined);
  }, []);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [pageError, setPageError] = useState("");
  const [loading, setLoading] = useState(Boolean(editId));
  const [pending, setPending] = useState(false);
  const [priceRules, setPriceRules] = useState<
    Array<{ minQuantity: string; price: string }>
  >([]);

  const [isCameraActive, setIsCameraActive] = useState(false);
  const [showUrlInput, setShowUrlInput] = useState(false);
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const streamRef = useRef<MediaStream | null>(null);

  useEffect(() => {
    warehouseService
      .list()
      .then(result => {
        cachedWarehouses = result.items;
        setWarehouses(result.items);
      })
      .catch((reason: Error) => setPageError(reason.message));
  }, []);
  useEffect(() => {
    if (!editId) return;
    productService
      .get(editId)
      .then(({ item }) =>
        setForm({
          name: item.name,
          sku: item.sku,
          category: item.category,
          price: String(item.price),
          lowStockThreshold: String(item.lowStockThreshold),
          initialStock: "0",
          warehouseId: "",
          imageUrl: item.imageUrl ?? "",
        })
      )
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
      .catch(() => undefined);
  }, [editId]);

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

  useEffect(() => {
    return () => {
      stopCamera();
    };
  }, []);

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
      !editId &&
      (!Number.isInteger(Number(form.initialStock)) ||
        Number(form.initialStock) < 0)
    )
      next.initialStock = "Ingresá una cantidad válida.";
    if (!editId && Number(form.initialStock) > 0 && !form.warehouseId)
      next.warehouseId = "Elegí dónde queda el stock inicial.";
    setErrors(next);
    if (Object.keys(next).length) return;
    setPending(true);
    setPageError("");
    const input = {
      name: form.name,
      sku: form.sku,
      category: form.category,
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
      const result = editId
        ? await productService.update(editId, input)
        : await productService.create(input);
      const productId: string | number =
        editId ?? ("id" in result ? Number(result.id) : 0);
      if (productId && (editId || rules.length))
        await priceRuleService.save(productId, rules);
      toast.success(
        editId
          ? "Producto actualizado correctamente."
          : "Producto incorporado correctamente."
      );
      setLocation("/products");
    } catch (reason) {
      setPageError((reason as Error).message);
    } finally {
      setPending(false);
    }
  };

  if (loading) return <LoadingPanel rows={6} />;

  return (
    <div className="centered-form-page">
      <PageHeader
        eyebrow={editId ? "Catálogo · edición" : "Catálogo · alta"}
        title={editId ? "Editar producto" : "Incorporar producto"}
        description={
          editId
            ? "Actualizá la ficha comercial sin alterar los movimientos de inventario."
            : "Definí la ficha comercial y, si corresponde, el stock con el que ingresa."
        }
        action={
          <button
            className="button-secondary"
            onClick={() => setLocation("/products")}
          >
            <ArrowLeft size={16} />
            Volver al catálogo
          </button>
        }
      />
      {pageError && <ErrorPanel message={pageError} />}
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
          <div className="form-grid two">
            <Field label="Nombre del producto" error={errors.name}>
              <input
                value={form.name}
                onChange={e => update("name", e.target.value)}
                placeholder="Ej. Yerba mate orgánica 500 g"
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
                list="known-categories"
              />
              <datalist id="known-categories">
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
                <video
                  ref={videoRef}
                  autoPlay
                  playsInline
                  muted
                  className="camera-video-stream"
                />
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
              <h2>Precios por cantidad</h2>
              <p>Opcional: definí descuentos por volumen.</p>
            </div>
          </div>
          {priceRules.map((rule, index) => (
            <div className="form-grid two" key={index}>
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
              <button
                type="button"
                className="text-button"
                onClick={() =>
                  setPriceRules(current =>
                    current.filter((_, i) => i !== index)
                  )
                }
              >
                Quitar tramo
              </button>
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
            {!editId && (
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
                  <select
                    value={form.warehouseId}
                    onChange={e => update("warehouseId", e.target.value)}
                    disabled={Number(form.initialStock) === 0}
                  >
                    <option value="">Seleccioná un depósito</option>
                    {warehouses.map(warehouse => (
                      <option key={warehouse.id} value={warehouse.id}>
                        {warehouse.name} · {warehouse.type}
                      </option>
                    ))}
                  </select>
                  {!warehouses.length && (
                    <small className="field-hint">
                      Primero necesitás registrar un depósito para asignar stock
                      inicial.
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
            onClick={() => setLocation("/products")}
          >
            Cancelar
          </button>
          <SubmitButton pending={pending}>
            <Save size={16} />
            {editId ? "Guardar cambios" : "Incorporar producto"}
          </SubmitButton>
        </div>
      </form>
    </div>
  );
}

function Field({
  label,
  error,
  children,
  className = "",
}: {
  label: string;
  error?: string;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <label className={`field ${className}`}>
      <span>{label}</span>
      {children}
      {error ? <small className="field-error">{error}</small> : null}
    </label>
  );
}
