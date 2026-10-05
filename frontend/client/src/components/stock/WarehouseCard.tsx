import { Edit3, MapPin, Trash2, Warehouse as WarehouseIcon } from "lucide-react";
import type { Warehouse } from "@/services/inventory";

export interface WarehouseCardProps {
  warehouse: Warehouse;
  isSelected: boolean;
  canManage: boolean;
  onSelect: () => void;
  onEdit: () => void;
  onDelete: () => void;
}

export function WarehouseCard({
  warehouse,
  isSelected,
  canManage,
  onSelect,
  onEdit,
  onDelete,
}: WarehouseCardProps) {
  const hasCover = Boolean(warehouse.imageUrl);

  return (
    <article
      className={`warehouse-card ${isSelected ? "warehouse-card-selected" : ""} ${hasCover ? "has-cover-image" : ""}`}
      onClick={onSelect}
    >
      {hasCover && (
        <div className="warehouse-card-cover-banner">
          <img
            src={warehouse.imageUrl!}
            alt={`Portada de ${warehouse.name}`}
            className="warehouse-cover-photo"
            onError={e => {
              // Si falla la carga de la imagen remota, oculta la portada para usar el diseño por defecto
              (e.currentTarget.parentElement as HTMLElement).style.display = "none";
            }}
          />
          <div className="warehouse-cover-shade" />
        </div>
      )}

      <div className={`warehouse-card-actions ${hasCover ? "on-cover" : ""}`}>
        {canManage && (
          <>
            <button
              className="icon-button"
              onClick={event => {
                event.stopPropagation();
                onEdit();
              }}
              aria-label={`Editar ${warehouse.name}`}
              title="Editar depósito"
            >
              <Edit3 size={15} />
            </button>
            <button
              className="icon-button"
              onClick={event => {
                event.stopPropagation();
                onDelete();
              }}
              aria-label={`Eliminar ${warehouse.name}`}
              title="Eliminar depósito"
            >
              <Trash2 size={15} />
            </button>
          </>
        )}
      </div>
      <span className="warehouse-icon">
        <WarehouseIcon size={21} />
      </span>
      <div className="warehouse-heading">
        <span className="category-tag">{warehouse.type}</span>
        <h2>{warehouse.name}</h2>
      </div>
      <div className="warehouse-detail">
        <MapPin size={16} />
        <span>{warehouse.address || "Sin dirección"}</span>
      </div>
      <div className="warehouse-stats">
        <b>{warehouse.skuCount ?? 0} SKUs</b>
        <span>
          {warehouse.stockTotal ?? 0} / {warehouse.capacity || "∞"} unidades
        </span>
      </div>
    </article>
  );
}
