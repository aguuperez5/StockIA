import React, { useState, useMemo } from "react";
import {
  Printer,
  X,
  Search,
  Plus,
  Minus,
  CheckSquare,
  Square,
  FileText,
  AlertCircle,
  Eye,
  ArrowLeft,
} from "lucide-react";
import { type Product } from "@/services/products";
import { getAprilTagImageUrl } from "@/services/http";

interface PrintAprilTagsModalProps {
  products: Product[];
  onClose: () => void;
}

export const PrintAprilTagsModal: React.FC<PrintAprilTagsModalProps> = ({
  products,
  onClose,
}) => {
  // Solo productos que tengan apriltagId
  const validProducts = useMemo(
    () => products.filter(p => p.apriltagId !== null && p.apriltagId !== undefined),
    [products]
  );

  const [search, setSearch] = useState("");
  // Mapa de productId -> cantidad a imprimir
  const [quantities, setQuantities] = useState<Record<number, number>>(() => {
    const initial: Record<number, number> = {};
    for (const p of validProducts) {
      initial[p.id] = 1;
    }
    return initial;
  });

  // Set de IDs seleccionados (inicia vacío por defecto)
  const [selectedIds, setSelectedIds] = useState<Set<number>>(() => new Set());

  const [previewMode, setPreviewMode] = useState(false);

  const filteredProducts = useMemo(() => {
    const q = search.toLowerCase().trim();
    if (!q) return validProducts;
    return validProducts.filter(
      p =>
        p.name.toLowerCase().includes(q) ||
        p.sku.toLowerCase().includes(q) ||
        String(p.apriltagId).includes(q)
    );
  }, [validProducts, search]);

  const toggleSelect = (id: number) => {
    setSelectedIds(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const selectAll = () => {
    setSelectedIds(new Set(validProducts.map(p => p.id)));
  };

  const deselectAll = () => {
    setSelectedIds(new Set());
  };

  const updateQuantity = (id: number, delta: number) => {
    setSelectedIds(prev => {
      if (!prev.has(id)) {
        const next = new Set(prev);
        next.add(id);
        return next;
      }
      return prev;
    });
    setQuantities(prev => {
      const current = prev[id] || 1;
      const next = Math.max(1, Math.min(200, current + delta));
      return { ...prev, [id]: next };
    });
  };

  const setExactQuantity = (id: number, val: number) => {
    setSelectedIds(prev => {
      if (!prev.has(id)) {
        const next = new Set(prev);
        next.add(id);
        return next;
      }
      return prev;
    });
    const safe = Math.max(1, Math.min(200, isNaN(val) ? 1 : val));
    setQuantities(prev => ({ ...prev, [id]: safe }));
  };

  const totalStickers = useMemo(() => {
    let count = 0;
    selectedIds.forEach(id => {
      count += quantities[id] || 0;
    });
    return count;
  }, [selectedIds, quantities]);

  // En una hoja A4 con grilla de 6x7 u 8 entran ~42 a 48 etiquetas
  const estimatedPages = Math.max(1, Math.ceil(totalStickers / 42));

  // Generar la lista plana de stickers a renderizar
  const stickersToPrint = useMemo(() => {
    const list: Array<{ product: Product; index: number }> = [];
    for (const p of validProducts) {
      if (selectedIds.has(p.id)) {
        const qty = quantities[p.id] || 1;
        for (let i = 0; i < qty; i++) {
          list.push({ product: p, index: i });
        }
      }
    }
    return list;
  }, [validProducts, selectedIds, quantities]);

  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-6 bg-overlay backdrop-blur-xs">
      {/* Contenedor Modal */}
      <div className="bg-surface border border-line rounded-xl shadow-2xl flex flex-col w-full max-w-4xl max-h-[92vh] overflow-hidden no-print">
        {/* Cabecera del modal */}
        <div className="px-6 py-4 border-b border-line flex items-center justify-between shrink-0">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-brand/10 text-brand rounded-lg">
              <Printer size={20} />
            </div>
            <div>
              <h2 className="text-lg font-bold text-ink">
                Imprimir Códigos AprilTag (tag36h11)
              </h2>
              <p className="text-xs text-muted-ink">
                Grilla A4 de alta precisión (25 mm x 25 mm con quiet zone y bordes nítidos).
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 text-subtle-ink hover:text-ink rounded-md"
            aria-label="Cerrar modal"
          >
            <X size={20} />
          </button>
        </div>

        {/* Contenido principal */}
        {!previewMode ? (
          <div className="flex-1 overflow-y-auto p-6 space-y-4">
            {/* Barra de búsqueda y acciones rápidas */}
            <div className="flex flex-col sm:flex-row gap-3 items-stretch sm:items-center justify-between">
              <div className="relative flex-1">
                <Search
                  size={16}
                  className="absolute left-3 top-1/2 -translate-y-1/2 text-subtle-ink"
                />
                <input
                  type="text"
                  value={search}
                  onChange={e => setSearch(e.target.value)}
                  placeholder="Buscar por producto, SKU o ID de AprilTag..."
                  className="w-full pl-9 pr-3 py-2 text-sm bg-surface-sunken border border-input rounded-lg focus:outline-hidden focus:ring-2 focus:ring-brand"
                />
              </div>
              <div className="flex items-center gap-2 text-xs">
                <button
                  type="button"
                  onClick={selectAll}
                  className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg border border-line hover:bg-surface-hover text-ink cursor-pointer font-medium"
                >
                  <CheckSquare size={14} />
                  <span>Seleccionar todos</span>
                </button>
                {selectedIds.size > 0 && (
                  <button
                    type="button"
                    onClick={deselectAll}
                    className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg border border-line hover:bg-surface-hover text-ink cursor-pointer font-medium"
                  >
                    <Square size={14} />
                    <span>Deseleccionar ({selectedIds.size})</span>
                  </button>
                )}
              </div>
            </div>

            {/* Listado de productos */}
            {filteredProducts.length === 0 ? (
              <div className="text-center py-12 text-muted-ink">
                <AlertCircle size={32} className="mx-auto mb-2 opacity-50" />
                <p className="text-sm">No se encontraron productos con AprilTag asignado.</p>
              </div>
            ) : (
              <div className="border border-line rounded-lg overflow-hidden">
                <table className="w-full text-left text-sm">
                  <thead className="bg-surface-sunken border-b border-line text-xs text-muted-ink">
                    <tr>
                      <th className="py-2.5 px-3 w-10 text-center">
                        <input
                          type="checkbox"
                          title={
                            validProducts.length > 0 && selectedIds.size === validProducts.length
                              ? "Deseleccionar todos"
                              : "Seleccionar todos"
                          }
                          checked={
                            validProducts.length > 0 && selectedIds.size === validProducts.length
                          }
                          onChange={e => {
                            if (e.target.checked) selectAll();
                            else deselectAll();
                          }}
                          className="rounded-sm border-line text-brand focus:ring-brand cursor-pointer"
                        />
                      </th>
                      <th className="py-2.5 px-3">AprilTag</th>
                      <th className="py-2.5 px-3">Producto / SKU</th>
                      <th className="py-2.5 px-3">Stock Disp.</th>
                      <th className="py-2.5 px-3 text-right">Cantidad de etiquetas</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-line">
                    {filteredProducts.map(product => {
                      const isSelected = selectedIds.has(product.id);
                      const qty = quantities[product.id] || 1;
                      const formattedTag = `#${String(product.apriltagId).padStart(3, "0")}`;

                      return (
                        <tr
                          key={product.id}
                          onClick={() => toggleSelect(product.id)}
                          title={isSelected ? "Clic para deseleccionar" : "Clic para seleccionar"}
                          className={`cursor-pointer hover:bg-surface-hover transition-colors select-none ${
                            isSelected ? "bg-brand/10 dark:bg-brand/20 font-medium" : ""
                          }`}
                        >
                          <td
                            className="py-2.5 px-3 text-center"
                            onClick={e => e.stopPropagation()}
                          >
                            <input
                              type="checkbox"
                              checked={isSelected}
                              onChange={() => toggleSelect(product.id)}
                              className="rounded-sm border-line text-brand focus:ring-brand cursor-pointer"
                            />
                          </td>
                          <td className="py-2.5 px-3">
                            <div className="flex items-center gap-2">
                              <img
                                src={getAprilTagImageUrl(product.apriltagId!, 80)}
                                alt={`Tag ${formattedTag}`}
                                width={26}
                                height={26}
                                className="rounded-xs border border-line bg-surface"
                                style={{ imageRendering: "pixelated" }}
                              />
                              <span className="font-mono text-xs font-semibold text-[var(--scanner)]">
                                {formattedTag}
                              </span>
                            </div>
                          </td>
                          <td className="py-2.5 px-3">
                            <div className="font-medium text-ink">
                              {product.name}
                            </div>
                            <div className="text-xs font-mono text-[var(--muted-ink)]">
                              {product.sku}
                            </div>
                          </td>
                          <td className="py-2.5 px-3 text-xs text-muted-ink">
                            {product.stock} u.
                          </td>
                          <td
                            className="py-2.5 px-3 text-right"
                            onClick={e => e.stopPropagation()}
                          >
                            <div className="inline-flex items-center border border-line rounded-lg overflow-hidden bg-surface-sunken">
                              <button
                                type="button"
                                disabled={qty <= 1}
                                onClick={() => updateQuantity(product.id, -1)}
                                className="px-2 py-1 hover:bg-surface-hover disabled:opacity-30 cursor-pointer text-ink"
                                aria-label="Disminuir cantidad"
                              >
                                <Minus size={13} />
                              </button>
                              <input
                                type="number"
                                min={1}
                                max={200}
                                value={qty}
                                onChange={e => {
                                  const v = parseInt(e.target.value, 10);
                                  setExactQuantity(product.id, isNaN(v) ? 1 : v);
                                }}
                                className="w-12 text-center text-xs font-semibold py-1 bg-transparent border-0 focus:outline-hidden text-ink"
                                aria-label="Cantidad de etiquetas"
                              />
                              <button
                                type="button"
                                disabled={qty >= 200}
                                onClick={() => updateQuantity(product.id, 1)}
                                className="px-2 py-1 hover:bg-surface-hover disabled:opacity-30 cursor-pointer text-ink"
                                aria-label="Aumentar cantidad"
                              >
                                <Plus size={13} />
                              </button>
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        ) : (
          /* Vista Previa de la Grilla A4 */
          <div className="flex-1 overflow-y-auto p-6 bg-paper flex flex-col items-center">
            {/* print-sheet: color literal intencional (impresión/escaneo) */}
            <div className="w-full max-w-[210mm] bg-white text-neutral-900 shadow-xl p-[8mm] border border-neutral-300 min-h-[297mm] rounded-sm">
              <div className="text-[10px] text-neutral-400 font-mono text-center border-b pb-2 mb-4">
                VISTA PREVIA DE IMPRESIÓN — Hoja A4 (210 mm x 297 mm) • AprilTags tag36h11 (25 mm x 25 mm)
              </div>
              <div
                className="grid gap-[3mm]"
                style={{
                  gridTemplateColumns: "repeat(auto-fill, minmax(28mm, 1fr))",
                }}
              >
                {stickersToPrint.map((item, idx) => (
                  <div
                    key={`${item.product.id}-${idx}`}
                    className="border border-dashed border-neutral-300 p-[2mm] flex flex-col items-center text-center bg-white"
                    style={{ width: "29mm", height: "37mm" }}
                  >
                    <img
                      src={getAprilTagImageUrl(item.product.apriltagId!, 250)}
                      alt={`Tag ${item.product.apriltagId}`}
                      style={{
                        width: "25mm",
                        height: "25mm",
                        imageRendering: "pixelated",
                      }}
                      className="block mx-auto"
                    />
                    <div className="w-full mt-[1.5mm] overflow-hidden leading-tight">
                      <div className="text-[7.5px] font-bold truncate text-black">
                        {item.product.name}
                      </div>
                      <div className="text-[6.5px] font-mono text-neutral-600 truncate">
                        {item.product.sku}
                      </div>
                      <div className="text-[7px] font-mono font-bold text-black">
                        Tag #{item.product.apriltagId}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* Barra inferior resumen y acciones */}
        <div className="px-6 py-4 border-t border-line bg-surface flex flex-col sm:flex-row items-center justify-between gap-3 shrink-0">
          <div className="flex items-center gap-4 text-xs">
            <div className="flex items-center gap-1.5">
              <FileText size={15} className="text-muted-ink" />
              <span>
                <b>{selectedIds.size}</b> productos seleccionados
              </span>
            </div>
            <div className="flex items-center gap-1.5">
              <Printer size={15} className="text-muted-ink" />
              <span>
                <b>{totalStickers}</b> etiquetas (~{estimatedPages}{" "}
                {estimatedPages === 1 ? "hoja A4" : "hojas A4"})
              </span>
            </div>
          </div>

          <div className="flex items-center gap-2 w-full sm:w-auto">
            {previewMode ? (
              <>
                <button
                  type="button"
                  onClick={() => setPreviewMode(false)}
                  className="flex-1 sm:flex-initial inline-flex items-center justify-center gap-2 px-4 py-2 text-sm font-medium border border-line rounded-lg hover:bg-surface-hover text-ink transition-colors"
                >
                  <ArrowLeft size={16} />
                  <span>Volver a selección</span>
                </button>
                <button
                  type="button"
                  disabled={totalStickers === 0}
                  onClick={handlePrint}
                  className="flex-1 sm:flex-initial inline-flex items-center justify-center gap-2 px-5 py-2 text-sm font-medium bg-brand text-brand-ink rounded-lg shadow-xs hover:bg-brand-hover transition-colors cursor-pointer"
                >
                  <Printer size={16} />
                  <span>Imprimir / Guardar PDF</span>
                </button>
              </>
            ) : (
              <>
                <button
                  type="button"
                  onClick={onClose}
                  className="flex-1 sm:flex-initial px-4 py-2 text-sm font-medium border border-line rounded-lg hover:bg-surface-hover text-ink transition-colors"
                >
                  Cancelar
                </button>
                <button
                  type="button"
                  disabled={totalStickers === 0}
                  onClick={() => setPreviewMode(true)}
                  className="flex-1 sm:flex-initial inline-flex items-center justify-center gap-2 px-4 py-2 text-sm font-medium border border-line rounded-lg hover:bg-surface-hover text-ink transition-colors"
                >
                  <Eye size={16} />
                  <span>Vista Previa A4</span>
                </button>
                <button
                  type="button"
                  disabled={totalStickers === 0}
                  onClick={handlePrint}
                  className="flex-1 sm:flex-initial inline-flex items-center justify-center gap-2 px-5 py-2 text-sm font-medium bg-brand text-brand-ink rounded-lg shadow-xs hover:bg-brand-hover transition-colors cursor-pointer"
                >
                  <Printer size={16} />
                  <span>Imprimir ({totalStickers})</span>
                </button>
              </>
            )}
          </div>
        </div>
      </div>

      {/* Estructura exclusiva para impresión (visible únicamente en @media print) */}
      {/* print-sheet: color literal intencional (impresión/escaneo) */}
      <div className="hidden print:block fixed inset-0 bg-white text-black p-0 m-0 z-9999">
        <div
          className="grid gap-[2.5mm]"
          style={{
            gridTemplateColumns: "repeat(6, 29mm)",
            margin: "0 auto",
            width: "186mm",
          }}
        >
          {stickersToPrint.map((item, idx) => (
            <div
              key={`print-${item.product.id}-${idx}`}
              className="border border-dashed border-gray-400 p-[2mm] flex flex-col items-center text-center bg-white break-inside-avoid"
              style={{
                width: "29mm",
                height: "36mm",
                boxSizing: "border-box",
              }}
            >
              <img
                src={getAprilTagImageUrl(item.product.apriltagId!, 300)}
                alt={`Tag ${item.product.apriltagId}`}
                style={{
                  width: "25mm",
                  height: "25mm",
                  imageRendering: "pixelated",
                }}
                className="block mx-auto"
              />
              <div
                className="w-full mt-[1.5mm] overflow-hidden leading-tight text-center"
                style={{ fontSize: "7pt" }}
              >
                <div className="font-bold truncate text-black">
                  {item.product.name}
                </div>
                <div className="font-mono text-gray-700 truncate" style={{ fontSize: "6pt" }}>
                  {item.product.sku}
                </div>
                <div className="font-mono font-bold text-black" style={{ fontSize: "6.5pt" }}>
                  Tag #{item.product.apriltagId}
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};
