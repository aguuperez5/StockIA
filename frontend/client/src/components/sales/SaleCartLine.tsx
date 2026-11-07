import { useState, useEffect, useRef } from "react";
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
  const isFlagged = Boolean(line.reviewRequired || line.isAmbiguous);

  const [rawInput, setRawInput] = useState(String(line.cartQuantity));
  const longPressTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const didLongPressRef = useRef(false);

  useEffect(() => {
    setRawInput(String(line.cartQuantity));
  }, [line.cartQuantity]);

  const commitQuantity = (val: string) => {
    const parsed = parseInt(val, 10);
    if (isNaN(parsed) || parsed <= 0) {
      setRawInput(String(line.cartQuantity));
    } else {
      const clamped = Math.min(parsed, line.quantity);
      setRawInput(String(clamped));
      onChangeQuantity(line.inventoryId, clamped);
    }
  };

  const startLongPress = () => {
    didLongPressRef.current = false;
    if (line.cartQuantity >= line.quantity) return;
    longPressTimerRef.current = setTimeout(() => {
      didLongPressRef.current = true;
      onChangeQuantity(line.inventoryId, line.quantity);
    }, 450);
  };

  const cancelLongPress = () => {
    if (longPressTimerRef.current) {
      clearTimeout(longPressTimerRef.current);
      longPressTimerRef.current = null;
    }
  };

  const handlePlusClick = () => {
    if (didLongPressRef.current) {
      didLongPressRef.current = false;
      return;
    }
    if (line.cartQuantity < line.quantity) {
      onChangeQuantity(line.inventoryId, line.cartQuantity + 1);
    }
  };

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
          <input
            type="number"
            inputMode="numeric"
            min={1}
            max={line.quantity}
            value={rawInput}
            onChange={(e) => {
              const val = e.target.value;
              setRawInput(val);
              const parsed = parseInt(val, 10);
              if (!isNaN(parsed) && parsed > 0) {
                onChangeQuantity(line.inventoryId, Math.min(parsed, line.quantity));
              }
            }}
            onBlur={() => commitQuantity(rawInput)}
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                commitQuantity(rawInput);
                (e.target as HTMLInputElement).blur();
              }
            }}
            aria-label={`Cantidad para ${line.productName}`}
            title={`Escribí una cantidad (máx ${line.quantity} u.)`}
          />
          <button
            type="button"
            aria-label="Aumentar cantidad (mantener presionado para stock máximo)"
            title={`Clic: +1 | Mantener presionado: todo el stock (${line.quantity} u.)`}
            disabled={line.cartQuantity >= line.quantity}
            onPointerDown={startLongPress}
            onPointerUp={cancelLongPress}
            onPointerLeave={cancelLongPress}
            onPointerCancel={cancelLongPress}
            onClick={handlePlusClick}
          >
            <Plus size={13} />
          </button>
        </div>
        <strong>{money(unitPrice * line.cartQuantity)}</strong>
      </div>
    </div>
  );
}
