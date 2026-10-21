import React, { useState } from "react";
import { QrCode, ZoomIn, X } from "lucide-react";

interface AprilTagBadgeProps {
  tagId: number | null | undefined;
  productName?: string;
  sku?: string;
  showPreviewOnClick?: boolean;
  size?: "sm" | "md" | "lg";
}

export const AprilTagBadge: React.FC<AprilTagBadgeProps> = ({
  tagId,
  productName,
  sku,
  showPreviewOnClick = true,
  size = "md",
}) => {
  const [modalOpen, setModalOpen] = useState(false);

  if (tagId === null || tagId === undefined) {
    return (
      <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded text-xs font-medium bg-neutral-100 text-neutral-500 dark:bg-neutral-800 dark:text-neutral-400">
        <QrCode size={12} className="opacity-50" />
        <span>Sin Tag</span>
      </span>
    );
  }

  const formattedId = `#${String(tagId).padStart(3, "0")}`;
  const imgUrl = `/api/apriltags/${tagId}/image?size=160`;
  const largeImgUrl = `/api/apriltags/${tagId}/image?size=400`;

  const badgeSizeClass =
    size === "sm"
      ? "text-[11px] py-0.5 px-1.5 gap-1"
      : size === "lg"
      ? "text-sm py-1 px-3 gap-2"
      : "text-xs py-0.5 px-2 gap-1.5";

  const thumbSize = size === "sm" ? 16 : size === "lg" ? 28 : 20;

  return (
    <>
      <button
        type="button"
        onClick={() => showPreviewOnClick && setModalOpen(true)}
        className={`inline-flex items-center rounded-md font-mono font-medium border border-neutral-200 dark:border-neutral-700 bg-white dark:bg-neutral-800 text-neutral-800 dark:text-neutral-100 shadow-xs hover:border-brand hover:text-brand transition-colors cursor-pointer group ${badgeSizeClass}`}
        title={`AprilTag ${formattedId} (familia tag36h11). Clic para ampliar.`}
      >
        <img
          src={imgUrl}
          alt={`AprilTag ${formattedId}`}
          width={thumbSize}
          height={thumbSize}
          className="rounded-xs shrink-0"
          style={{ imageRendering: "pixelated" }}
          loading="lazy"
        />
        <span>Tag {formattedId}</span>
        {showPreviewOnClick && (
          <ZoomIn
            size={11}
            className="opacity-0 group-hover:opacity-70 transition-opacity ml-0.5 text-neutral-400"
          />
        )}
      </button>

      {modalOpen && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-in fade-in"
          onClick={() => setModalOpen(false)}
        >
          <div
            className="bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 rounded-xl shadow-2xl max-w-sm w-full p-5 text-center relative"
            onClick={e => e.stopPropagation()}
          >
            <button
              type="button"
              onClick={() => setModalOpen(false)}
              className="absolute top-3 right-3 text-neutral-400 hover:text-neutral-700 dark:hover:text-neutral-200 p-1 rounded-md"
              aria-label="Cerrar vista previa"
            >
              <X size={18} />
            </button>

            <div className="flex items-center justify-center gap-2 text-xs font-semibold uppercase tracking-wider text-neutral-600 dark:text-neutral-300 mb-2">
              <QrCode size={16} />
              <span>AprilTag tag36h11</span>
            </div>

            <h3 className="text-xl font-bold font-mono text-neutral-900 dark:text-white mb-1">
              ID {formattedId}
            </h3>

            {productName && (
              <p className="text-sm font-medium text-neutral-800 dark:text-neutral-200 mb-0.5">
                {productName}
              </p>
            )}
            {sku && (
              <p className="text-xs font-mono text-neutral-600 dark:text-neutral-400 mb-4">
                SKU: {sku}
              </p>
            )}

            <div className="inline-block p-4 bg-white border border-neutral-300 dark:border-neutral-700 rounded-lg shadow-inner mb-4">
              <img
                src={largeImgUrl}
                alt={`AprilTag ${formattedId}`}
                width={220}
                height={220}
                className="mx-auto block"
                style={{ imageRendering: "pixelated" }}
              />
            </div>

            <p className="text-xs text-neutral-600 dark:text-neutral-400">
              Marcador fiducial calibrado para lectura rápida por cámara con OpenCV.
            </p>
          </div>
        </div>
      )}
    </>
  );
};
