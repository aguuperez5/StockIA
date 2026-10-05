export type StockLevel = "sin_stock" | "critico" | "bajo" | "saludable";

/**
 * Pure function computing stock criticality level according to business rules.
 * - quantity <= 0: "sin_stock"
 * - 0 < quantity <= threshold / 2 (when threshold > 1): "critico"
 * - quantity <= threshold: "bajo"
 * - quantity > threshold: "saludable"
 */
export function getStockLevel(quantity: number, threshold: number): StockLevel {
  if (quantity <= 0) return "sin_stock";
  if (threshold <= 0) return "saludable";
  if (quantity <= threshold) {
    if (threshold > 1 && quantity <= Math.floor(threshold / 2)) {
      return "critico";
    }
    return "bajo";
  }
  return "saludable";
}

export interface StockBadgeInfo {
  level: StockLevel;
  label: string;
  badgeClass: string;
  color: string;
}

export const STOCK_LEVELS: Record<
  StockLevel,
  { label: string; badgeClass: string; color: string }
> = {
  sin_stock: {
    label: "Sin stock",
    badgeClass: "stock-critical",
    color: "#d45b55",
  },
  critico: {
    label: "Crítico",
    badgeClass: "stock-critical",
    color: "#e05244",
  },
  bajo: {
    label: "Bajo mínimo",
    badgeClass: "stock-low",
    color: "#d88936",
  },
  saludable: {
    label: "Saludable",
    badgeClass: "stock-good",
    color: "#159666",
  },
};

export function getStockBadgeInfo(
  quantity: number,
  threshold: number
): StockBadgeInfo {
  const level = getStockLevel(quantity, threshold);
  return {
    level,
    ...STOCK_LEVELS[level],
  };
}
