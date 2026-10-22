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
    setQuantities(prev => {
      const current = prev[id] || 1;
      const next = Math.max(1, Math.min(200, current + delta));
      return { ...prev, [id]: next };
    });
  };

  const setExactQuantity = (id: number, val: number) => {
    const safe = Math.max(1, Math.min(200, val || 1));
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
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-6 bg-black/60 backdrop-blur-xs">
      {/* Contenedor Modal */}
      <div className="bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 rounded-xl shadow-2xl flex flex-col w-full max-w-4xl max-h-[92vh] overflow-hidden no-print">
        {/* Cabecera del modal */}
        <div className="px-6 py-4 border-b border-neutral-200 dark:border-neutral-800 flex items-center justify-between shrink-0">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-brand/10 text-brand rounded-lg">
              <Printer size={20} />
            </div>
            <div>
              <h2 className="text-lg font-bold text-neutral-900 dark:text-white">
                Imprimir Códigos AprilTag (tag36h11)
              </h2>
              <p className="text-xs text-neutral-500 dark:text-neutral-400">
                Grilla A4 de alta precisión (25 mm x 25 mm con quiet zone y bordes nítidos).
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 text-neutral-400 hover:text-neutral-700 dark:hover:text-neutral-200 rounded-md"
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
                  className="absolute left-3 top-1/2 -translate-y-1/2 text-neutral-400"
                />
                <input
                  type="text"
                  value={search}
                  onChange={e => setSearch(e.target.value)}
                  placeholder="Buscar por producto, SKU o ID de AprilTag..."
                  className="w-full pl-9 pr-3 py-2 text-sm bg-neutral-50 dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700 rounded-lg focus:outline-hidden focus:ring-2 focus:ring-brand"
                />
              </div>
              <div className="flex items-center gap-2 text-xs">
                <button
                  type="button"
                  onClick={selectAll}
                  className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg border border-neutral-200 dark:border-neutral-700 hover:bg-neutral-100 dark:hover:bg-neutral-800 text-neutral-700 dark:text-neutral-200 cursor-pointer font-medium"
                >
                  <CheckSquare size={14} />
                  <span>Seleccionar todos</span>
                </button>
                {selectedIds.size > 0 && (
                  <button
                    type="button"
                    onClick={deselectAll}
                    className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg border border-neutral-200 dark:border-neutral-700 hover:bg-neutral-100 dark:hover:bg-neutral-800 text-neutral-700 dark:text-neutral-200 cursor-pointer font-medium"
                  >
                    <Square size={14} />
                    <span>Deseleccionar ({selectedIds.size})</span>
                  </button>
                )}
              </div>
            </div>

            {/* Listado de productos */}
            {filteredProducts.length === 0 ? (
              <div className="text-center py-12 text-neutral-500">
                <AlertCircle size={32} className="mx-auto mb-2 opacity-50" />
                <p className="text-sm">No se encontraron productos con AprilTag asignado.</p>
              </div>
            ) : (
              <div className="border border-neutral-200 dark:border-neutral-800 rounded-lg overflow-hidden">
                <table className="w-full text-left text-sm">
                  <thead className="bg-neutral-50 dark:bg-neutral-800/60 border-b border-neutral-200 dark:border-neutral-800 text-xs text-neutral-600 dark:text-neutral-400">
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
                          className="rounded-sm border-neutral-300 text-brand focus:ring-brand cursor-pointer"
                        />
                      </th>
                      <th className="py-2.5 px-3">AprilTag</th>
                      <th className="py-2.5 px-3">Producto / SKU</th>
                      <th className="py-2.5 px-3">Stock Disp.</th>
                      <th className="py-2.5 px-3 text-right">Cantidad de etiquetas</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-neutral-200 dark:divide-neutral-800">
                    {filteredProducts.map(product => {
                      const isSelected = selectedIds.has(product.id);
                      const qty = quantities[product.id] || 1;
                      const formattedTag = `#${String(product.apriltagId).padStart(3, "0")}`;

                      return (
                        <tr
                          key={product.id}
                          className={`hover:bg-neutral-50/70 dark:hover:bg-neutral-800/50 transition-colors ${
                            isSelected ? "bg-brand/5 dark:bg-brand/10" : ""
                          }`}
                        >
                          <td className="py-2.5 px-3 text-center">
                            <input
                              type="checkbox"
                              checked={isSelected}
                              onChange={() => toggleSelect(product.id)}
                              className="rounded-sm border-neutral-300 text-brand focus:ring-brand cursor-pointer"
                            />
                          </td>
                          <td className="py-2.5 px-3">
                            <div className="flex items-center gap-2">
                              <img
                                src={`/api/apriltags/${product.apriltagId}/image?size=80`}
                                alt={`Tag ${formattedTag}`}
                                width={26}
                                height={26}
                                className="rounded-xs border border-neutral-200 dark:border-neutral-700 bg-white"
                                style={{ imageRendering: "pixelated" }}
                              />
                              <span className="font-mono text-xs font-semibold text-[var(--scanner)]">
                                {formattedTag}
                              </span>
                            </div>
                          </td>
                          <td className="py-2.5 px-3">
                            <div className="font-medium text-neutral-900 dark:text-neutral-100">
                              {product.name}
                            </div>
                            <div className="text-xs font-mono text-[var(--muted-ink)]">
                              {product.sku}
                            </div>
                          </td>
                          <td className="py-2.5 px-3 text-xs text-neutral-600 dark:text-neutral-300">
                            {product.stock} u.
                          </td>
                          <td className="py-2.5 px-3 text-right">
                            <div className="inline-flex items-center border border-neutral-200 dark:border-neutral-700 rounded-lg overflow-hidden bg-white dark:bg-neutral-800">
                              <button
                                type="button"
                                disabled={!isSelected || qty <= 1}
                                onClick={() => updateQuantity(product.id, -1)}
                                className="px-2 py-1 hover:bg-neutral-100 dark:hover:bg-neutral-700 disabled:opacity-30 cursor-pointer"
                              >
                                <Minus size={13} />
                              </button>
                              <input
                                type="number"
                                min={1}
                                max={200}
                                disabled={!isSelected}
                                value={qty}
                                onChange={e =>
                                  setExactQuantity(product.id, parseInt(e.target.value, 10))
                                }
                                className="w-12 text-center text-xs font-semibold py-1 bg-transparent border-0 focus:outline-hidden"
                              />
                              <button
                                type="button"
                                disabled={!isSelected || qty >= 200}
                                onClick={() => updateQuantity(product.id, 1)}
                                className="px-2 py-1 hover:bg-neutral-100 dark:hover:bg-neutral-700 disabled:opacity-30 cursor-pointer"
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
          <div className="flex-1 overflow-y-auto p-6 bg-neutral-100 dark:bg-neutral-950 flex flex-col items-center">
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
                      src={`/api/apriltags/${item.product.apriltagId}/image?size=250`}
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
        <div className="px-6 py-4 border-t border-neutral-200 dark:border-neutral-800 bg-neutral-50 dark:bg-neutral-800/60 flex flex-col sm:flex-row items-center justify-between gap-3 shrink-0">
          <div className="flex items-center gap-4 text-xs">
            <div className="flex items-center gap-1.5">
              <FileText size={15} className="text-neutral-500" />
              <span>
                <b>{selectedIds.size}</b> productos seleccionados
              </span>
            </div>
            <div className="flex items-center gap-1.5">
              <Printer size={15} className="text-neutral-500" />
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
                  className="flex-1 sm:flex-initial inline-flex items-center justify-center gap-2 px-4 py-2 text-sm font-medium border border-neutral-300 dark:border-neutral-700 rounded-lg hover:bg-neutral-100 dark:hover:bg-neutral-800 transition-colors"
                >
                  <ArrowLeft size={16} />
                  <span>Volver a selección</span>
                </button>
                <button
                  type="button"
                  disabled={totalStickers === 0}
                  onClick={handlePrint}
                  className="flex-1 sm:flex-initial inline-flex items-center justify-center gap-2 px-5 py-2 text-sm font-medium bg-brand text-white rounded-lg shadow-sm hover:bg-brand-hover transition-colors cursor-pointer"
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
                  className="flex-1 sm:flex-initial px-4 py-2 text-sm font-medium border border-neutral-300 dark:border-neutral-700 rounded-lg hover:bg-neutral-100 dark:hover:bg-neutral-800 transition-colors"
                >
                  Cancelar
                </button>
                <button
                  type="button"
                  disabled={totalStickers === 0}
                  onClick={() => setPreviewMode(true)}
                  className="flex-1 sm:flex-initial inline-flex items-center justify-center gap-2 px-4 py-2 text-sm font-medium border border-neutral-300 dark:border-neutral-700 rounded-lg hover:bg-neutral-100 dark:hover:bg-neutral-800 transition-colors"
                >
                  <Eye size={16} />
                  <span>Vista Previa A4</span>
                </button>
                <button
                  type="button"
                  disabled={totalStickers === 0}
                  onClick={handlePrint}
                  className="flex-1 sm:flex-initial inline-flex items-center justify-center gap-2 px-5 py-2 text-sm font-medium bg-brand text-white rounded-lg shadow-sm hover:bg-brand-hover transition-colors cursor-pointer"
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
                src={`/api/apriltags/${item.product.apriltagId}/image?size=300`}
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
