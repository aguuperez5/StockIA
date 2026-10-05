import type { PriceRuleItem } from "@/services/inventory";

export interface PricingResult {
  unitPriceCents: number;
  totalCents: number;
  appliedRule: PriceRuleItem | null;
  appliedRuleLabel?: string;
}

/**
 * Calculates effective unit price according to volume tier rules.
 * Backend parity rule: Highest minQuantity <= quantity is applied; if none applies, basePriceCents is used.
 */
export function unitPriceForQuantity(
  basePriceCents: number,
  rules: PriceRuleItem[] | undefined | null,
  quantity: number
): number {
  if (!rules || !rules.length || quantity <= 0) {
    return basePriceCents;
  }
  const applicable = [...rules]
    .filter(r => Number(r.minQuantity) <= quantity)
    .sort((a, b) => Number(b.minQuantity) - Number(a.minQuantity));

  if (applicable.length > 0) {
    const best = applicable[0];
    return typeof best.priceCents === "number"
      ? best.priceCents
      : Math.round(Number(best.price) * 100);
  }
  return basePriceCents;
}

/**
 * Calculates full line pricing breakdown including effective unit price, line subtotal,
 * and rule label when a volume tier applies.
 */
export function calculateLinePricing(
  basePriceCents: number,
  rules: PriceRuleItem[] | undefined | null,
  quantity: number
): PricingResult {
  if (!rules || !rules.length || quantity <= 0) {
    return {
      unitPriceCents: basePriceCents,
      totalCents: basePriceCents * Math.max(0, quantity),
      appliedRule: null,
    };
  }

  const applicable = [...rules]
    .filter(r => Number(r.minQuantity) <= quantity)
    .sort((a, b) => Number(b.minQuantity) - Number(a.minQuantity));

  if (applicable.length > 0) {
    const best = applicable[0];
    const unitPriceCents =
      typeof best.priceCents === "number"
        ? best.priceCents
        : Math.round(Number(best.price) * 100);

    return {
      unitPriceCents,
      totalCents: unitPriceCents * quantity,
      appliedRule: best,
      appliedRuleLabel: "Precio mayorista aplicado",
    };
  }

  return {
    unitPriceCents: basePriceCents,
    totalCents: basePriceCents * Math.max(0, quantity),
    appliedRule: null,
  };
}
