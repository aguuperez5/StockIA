import { ArrowLeft, BadgeDollarSign, Boxes, Save } from "lucide-react";
import { useEffect, useState } from "react";
import { useLocation, useRoute } from "wouter";
import { toast } from "sonner";
import { ErrorPanel, LoadingPanel, PageHeader, SubmitButton } from "@/components/StockUI";
import { warehouseService, type Warehouse } from "@/services/inventory";
import { productService } from "@/services/products";
import { priceRuleService } from "@/services/backlog";

type FormData = { name: string; sku: string; category: string; price: string; lowStockThreshold: string; initialStock: string; warehouseId: string; imageUrl: string };
const blank: FormData = { name: "", sku: "", category: "", price: "", lowStockThreshold: "5", initialStock: "0", warehouseId: "", imageUrl: "" };

// Acepta coma o punto como separador decimal: "10,50" y "10.50" valen 10.5;
// si hay coma, los puntos se leen como separador de miles ("1.500,50" -> 1500.5).
export const parseMoney = (value: string) => {
  const clean = String(value).trim();
  return Number(clean.includes(",") ? clean.replace(/\./g, "").replace(",", ".") : clean);
};

export default function ProductFormPage() {
  const [, setLocation] = useLocation();
  const [, params] = useRoute("/products/:id/edit");
  const editId = params?.id;
  const [form, setForm] = useState<FormData>(blank);
  const [warehouses, setWarehouses] = useState<Warehouse[]>([]);
  const [knownCategories, setKnownCategories] = useState<string[]>([]);
  useEffect(() => { productService.list().then(result => setKnownCategories(Array.from(new Set(result.items.map(item => item.category).filter(Boolean))).sort())).catch(() => undefined); }, []);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [pageError, setPageError] = useState("");
  const [loading, setLoading] = useState(Boolean(editId));
  const [pending, setPending] = useState(false);
  const [priceRules, setPriceRules] = useState<Array<{ minQuantity: string; price: string }>>([]);
  useEffect(() => { warehouseService.list().then(result => setWarehouses(result.items)).catch((reason: Error) => setPageError(reason.message)); }, []);
  useEffect(() => { if (!editId) return; productService.get(editId).then(({ item }) => setForm({ name: item.name, sku: item.sku, category: item.category, price: String(item.price), lowStockThreshold: String(item.lowStockThreshold), initialStock: "0", warehouseId: "", imageUrl: item.imageUrl ?? "" })).catch((reason: Error) => setPageError(reason.message)).finally(() => setLoading(false)); priceRuleService.list(editId).then(result => setPriceRules(result.items.map(rule => ({ minQuantity: String(rule.minQuantity), price: String(rule.price ?? "") })))).catch(() => undefined); }, [editId]);
  const update = (key: keyof FormData, value: string) => setForm(current => ({ ...current, [key]: value }));
  const addRule = () => setPriceRules(current => [...current, { minQuantity: "2", price: form.price }]);
  const submit = async (event: React.FormEvent) => {
    event.preventDefault();
    const next: Record<string, string> = {};
    if (!form.name.trim()) next.name = "Ingresá el nombre comercial.";
    if (!form.sku.trim()) next.sku = "Ingresá un SKU o código interno.";
    if (!form.category.trim()) next.category = "Indicá una categoría.";
    if (!Number.isFinite(parseMoney(form.price)) || parseMoney(form.price) <= 0) next.price = "El precio debe ser mayor a cero.";
    if (!Number.isInteger(Number(form.lowStockThreshold)) || Number(form.lowStockThreshold) < 0) next.lowStockThreshold = "Ingresá un mínimo válido.";
    if (!editId && (!Number.isInteger(Number(form.initialStock)) || Number(form.initialStock) < 0)) next.initialStock = "Ingresá una cantidad válida.";
    if (!editId && Number(form.initialStock) > 0 && !form.warehouseId) next.warehouseId = "Elegí dónde queda el stock inicial.";
    setErrors(next); if (Object.keys(next).length) return;
    setPending(true); setPageError("");
    const input = { name: form.name, sku: form.sku, category: form.category, price: parseMoney(form.price), lowStockThreshold: Number(form.lowStockThreshold), initialStock: Number(form.initialStock), warehouseId: form.warehouseId ? Number(form.warehouseId) : undefined, imageUrl: form.imageUrl.trim() ? form.imageUrl.trim() : null };
    const rules = priceRules.map(rule => ({ minQuantity: Number(rule.minQuantity), price: parseMoney(rule.price) }));
    if (rules.some((rule, index) => !Number.isInteger(rule.minQuantity) || rule.minQuantity < 2 || rule.price <= 0 || (index > 0 && rule.minQuantity <= rules[index - 1].minQuantity))) { setPageError("Revisá los tramos de precio: cantidades ascendentes y precios válidos."); setPending(false); return; }
    try { const result = editId ? await productService.update(editId, input) : await productService.create(input); const productId: string | number = editId ?? ("id" in result ? Number(result.id) : 0); if (productId && (editId || rules.length)) await priceRuleService.save(productId, rules); toast.success(editId ? "Producto actualizado correctamente." : "Producto incorporado correctamente."); setLocation("/products"); } catch (reason) { setPageError((reason as Error).message); } finally { setPending(false); }
  };
  if (loading) return <LoadingPanel rows={6} />;
  return <><PageHeader eyebrow={editId ? "Catálogo · edición" : "Catálogo · alta"} title={editId ? "Editar producto" : "Incorporar producto"} description={editId ? "Actualizá la ficha comercial sin alterar los movimientos de inventario." : "Definí la ficha comercial y, si corresponde, el stock con el que ingresa."} action={<button className="button-secondary" onClick={() => setLocation("/products")}><ArrowLeft size={16} />Volver al catálogo</button>} />
    {pageError && <ErrorPanel message={pageError} />}
    <form className="form-card product-form" onSubmit={submit} noValidate><div className="form-section"><div className="form-section-title"><span><Boxes size={18} /></span><div><h2>Ficha del producto</h2><p>Información que identifica el artículo en tu operación.</p></div></div><div className="form-grid two"><Field label="Nombre del producto" error={errors.name}><input value={form.name} onChange={e => update("name", e.target.value)} placeholder="Ej. Yerba mate orgánica 500 g" /></Field><Field label="Código SKU" error={errors.sku}><input value={form.sku} onChange={e => update("sku", e.target.value.toUpperCase())} placeholder="Ej. YER-500-ORG" /></Field><Field label="Categoría" error={errors.category}><input value={form.category} onChange={e => update("category", e.target.value)} placeholder="Ej. Almacén" list="known-categories" /><datalist id="known-categories">{knownCategories.map(option => <option key={option} value={option} />)}</datalist></Field><Field label="Precio de venta" error={errors.price}><div className="input-prefix"><span>$</span><input inputMode="decimal" value={form.price} onChange={e => update("price", e.target.value)} placeholder="0,00" /></div></Field><Field label="URL de imagen (opcional)"><div className="image-field"><input value={form.imageUrl} onChange={e => update("imageUrl", e.target.value)} placeholder="https://…" inputMode="url" />{form.imageUrl.trim() ? <img key={form.imageUrl.trim()} src={form.imageUrl.trim()} alt="Vista previa" className="image-preview" onError={e => { (e.target as HTMLImageElement).style.display = "none"; }} /> : null}</div></Field></div></div>
      <div className="form-section"><div className="form-section-title"><span><BadgeDollarSign size={18} /></span><div><h2>Precios por cantidad</h2><p>Opcional: definí descuentos por volumen.</p></div></div>{priceRules.map((rule, index) => <div className="form-grid two" key={index}><Field label="Desde unidades"><input type="number" min="2" value={rule.minQuantity} onChange={e => setPriceRules(current => current.map((item, i) => i === index ? { ...item, minQuantity: e.target.value } : item))} /></Field><Field label="Precio unitario"><input inputMode="decimal" value={rule.price} onChange={e => setPriceRules(current => current.map((item, i) => i === index ? { ...item, price: e.target.value } : item))} /></Field><button type="button" className="text-button" onClick={() => setPriceRules(current => current.filter((_, i) => i !== index))}>Quitar tramo</button></div>)}<button type="button" className="button-secondary" onClick={addRule}>Agregar tramo</button></div><div className="form-section"><div className="form-section-title"><span><BadgeDollarSign size={18} /></span><div><h2>Control de inventario</h2><p>El mínimo ayuda a detectar mercadería que necesita reposición.</p></div></div><div className="form-grid two"><Field label="Stock mínimo" error={errors.lowStockThreshold}><input type="number" min="0" value={form.lowStockThreshold} onChange={e => update("lowStockThreshold", e.target.value)} /></Field>{!editId && <><Field label="Stock inicial" error={errors.initialStock}><input type="number" min="0" value={form.initialStock} onChange={e => update("initialStock", e.target.value)} /></Field><Field label="Depósito de ingreso" error={errors.warehouseId} className="full"><select value={form.warehouseId} onChange={e => update("warehouseId", e.target.value)} disabled={Number(form.initialStock) === 0}><option value="">Seleccioná un depósito</option>{warehouses.map(warehouse => <option key={warehouse.id} value={warehouse.id}>{warehouse.name} · {warehouse.type}</option>)}</select>{!warehouses.length && <small className="field-hint">Primero necesitás registrar un depósito para asignar stock inicial.</small>}</Field></>}</div></div><div className="form-actions"><button type="button" className="button-secondary" onClick={() => setLocation("/products")}>Cancelar</button><SubmitButton pending={pending}><Save size={16} />{editId ? "Guardar cambios" : "Incorporar producto"}</SubmitButton></div></form></>;
}

function Field({ label, error, children, className = "" }: { label: string; error?: string; children: React.ReactNode; className?: string }) { return <label className={`field ${className}`}><span>{label}</span>{children}{error ? <small className="field-error">{error}</small> : null}</label>; }
