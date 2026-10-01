import { Minus, Plus, Trash2 } from "lucide-react";
import { money } from "@/components/StockUI";
import type { InventoryItem } from "@/services/inventory";

export type CartLine = InventoryItem & { cartQuantity: number };

export interface SaleCartLineProps {
  line: CartLine;
  onChangeQuantity: (inventoryId: number, nextQuantity: number) => void;
}

export function SaleCartLine({ line, onChangeQuantity }: SaleCartLineProps) {
  return (
    <div className="cart-line" key={line.inventoryId}>
      <div>
        <b>{line.productName}</b>
        <small>
          {line.warehouseName} · {money(line.priceCents)} c/u
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
        <strong>{money(line.priceCents * line.cartQuantity)}</strong>
      </div>
    </div>
  );
}
