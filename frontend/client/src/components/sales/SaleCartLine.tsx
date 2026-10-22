import { Minus, Plus, Trash2 } from "lucide-react";
import { money } from "@/components/StockUI";
import type { InventoryItem } from "@/services/inventory";
import { calculateLinePricing } from "@/lib/pricing";

export type CartLine = InventoryItem & {
  cartQuantity: number;
  reviewRequired?: boolean;
  isAmbiguous?: boolean;
  matchMethod?: string;
  appliedRuleLabel?: string;
  effectiveUnitPriceCents?: number;
};

export interface SaleCartLineProps {
  line: CartLine;
  onChangeQuantity: (inventoryId: number, nextQuantity: number) => void;
}

export function SaleCartLine({ line, onChangeQuantity }: SaleCartLineProps) {
  const dynamicPricing = calculateLinePricing(
    line.priceCents,
    line.priceRules,
    line.cartQuantity
  );
  const unitPrice = line.effectiveUnitPriceCents ?? dynamicPricing.unitPriceCents;
  const appliedLabel = line.appliedRuleLabel ?? dynamicPricing.appliedRuleLabel;
  const isFlagged = Boolean(line.reviewRequired || line.isAmbiguous);

  return (
    <div className={`cart-line ${isFlagged ? "cart-line-flagged" : ""}`} key={line.inventoryId}>
      <div>
        <div style={{ display: "flex", alignItems: "center", gap: "6px", flexWrap: "wrap" }}>
          <b>{line.productName}</b>
          {isFlagged && (
            <span
              className="analysis-match-evidence needs-review"
              style={{ fontSize: "10px", padding: "1px 5px", borderRadius: "4px" }}
              title="Lectura asistida por IA que requiere verificación del operador"
            >
              {line.isAmbiguous ? "Ambiguo - Revisar" : "Revisar"}
            </span>
          )}
          {line.appliedRuleLabel && (
            <span
              className="analysis-match-evidence"
              style={{ fontSize: "10px", padding: "1px 5px", background: "var(--status-ok-bg)", color: "var(--status-ok-text)", borderRadius: "4px" }}
            >
              {line.appliedRuleLabel}
            </span>
          )}
        </div>
        <small>
          {line.warehouseName} · {money(unitPrice)} c/u
        </small>
      </div>
      <button
        type="button"
        className="remove-line"
        onClick={() => onChangeQuantity(line.inventoryId, 0)}
        aria-label={`Quitar ${line.productName}`}
      >
        <Trash2 size={15} />
      </button>
      <div className="line-bottom">
        <div className="quantity-stepper">
          <button
            type="button"
            aria-label="Disminuir cantidad"
            onClick={() =>
              onChangeQuantity(line.inventoryId, line.cartQuantity - 1)
            }
          >
            <Minus size={13} />
          </button>
          <span>{line.cartQuantity}</span>
          <button
            type="button"
            aria-label="Aumentar cantidad"
            disabled={line.cartQuantity >= line.quantity}
            onClick={() =>
              onChangeQuantity(line.inventoryId, line.cartQuantity + 1)
            }
          >
            <Plus size={13} />
          </button>
        </div>
        <strong>{money(unitPrice * line.cartQuantity)}</strong>
      </div>
    </div>
  );
}
