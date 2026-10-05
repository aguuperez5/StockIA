import type { CartLine } from "@/components/sales/SaleCartLine";
import type { InventoryItem } from "@/services/inventory";
import type { DetectedProduct } from "@/components/PhotoCapture";
import { calculateLinePricing } from "@/lib/pricing";

export interface TrimmedItem {
  productId: number;
  productName: string;
  requested: number;
  available: number;
}

export interface PreloadResult {
  cart: CartLine[];
  trimmed: TrimmedItem[];
  selectedWarehouseId: number | null;
  hasDifferentWarehouses: boolean;
  unmatchedProducts: DetectedProduct[];
}

export function preloadCartFromDetections({
  detectedItems,
  availableInventory,
  currentWarehouseId = null,
  isAmbiguous = false,
}: {
  detectedItems: DetectedProduct[];
  availableInventory: InventoryItem[];
  currentWarehouseId?: number | null;
  isAmbiguous?: boolean;
}): PreloadResult {
  if (!detectedItems.length || !availableInventory.length) {
    return {
      cart: [],
      trimmed: [],
      selectedWarehouseId: currentWarehouseId,
      hasDifferentWarehouses: false,
      unmatchedProducts: [],
    };
  }

  // 1. Identificar en qué depósitos tienen stock los productos detectados
  const productWarehouses = new Map<number, Set<number>>();

  for (const det of detectedItems) {
    const stockItems = availableInventory.filter(
      i => i.productId === det.id && i.quantity > 0
    );
    productWarehouses.set(det.id, new Set(stockItems.map(i => i.warehouseId)));
  }

  // 2. Determinar el depósito objetivo:
  // Si currentWarehouseId está fijado, usamos ese.
  // Sino, elegimos el depósito que tenga stock para el mayor número de productos detectados.
  let targetWarehouseId = currentWarehouseId;
  if (targetWarehouseId === null) {
    const warehouseCoverage = new Map<number, number>();
    productWarehouses.forEach(whSet => {
      whSet.forEach(wId => {
        warehouseCoverage.set(wId, (warehouseCoverage.get(wId) || 0) + 1);
      });
    });
    let maxCoverage = 0;
    warehouseCoverage.forEach((count, wId) => {
      if (count > maxCoverage) {
        maxCoverage = count;
        targetWarehouseId = wId;
      }
    });
  }

  const allWarehousesWithStock = new Set<number>();
  productWarehouses.forEach(whSet => {
    whSet.forEach(wId => allWarehousesWithStock.add(wId));
  });
  const hasDifferentWarehouses = allWarehousesWithStock.size > 1;

  const newCart: CartLine[] = [];
  const trimmed: TrimmedItem[] = [];
  const unmatchedProducts: DetectedProduct[] = [];

  for (const det of detectedItems) {
    const inventoryItem = availableInventory.find(
      i =>
        i.productId === det.id &&
        (targetWarehouseId ? i.warehouseId === targetWarehouseId : true) &&
        i.quantity > 0
    );

    if (!inventoryItem) {
      unmatchedProducts.push(det);
      continue;
    }

    const requestedQty = Math.max(1, det.suggestedQuantity ?? 1);
    const availableQty = inventoryItem.quantity;
    const finalQty = Math.min(availableQty, requestedQty);

    if (requestedQty > availableQty) {
      trimmed.push({
        productId: det.id,
        productName: det.name,
        requested: requestedQty,
        available: availableQty,
      });
    }

    const needsReview = Boolean(det.reviewRequired || isAmbiguous);
    const pricing = calculateLinePricing(
      inventoryItem.priceCents,
      inventoryItem.priceRules,
      finalQty
    );

    newCart.push({
      ...inventoryItem,
      cartQuantity: finalQty,
      reviewRequired: needsReview,
      isAmbiguous,
      matchMethod: det.matchMethod,
      effectiveUnitPriceCents: pricing.unitPriceCents,
      appliedRuleLabel: pricing.appliedRuleLabel,
    });
  }

  return {
    cart: newCart,
    trimmed,
    selectedWarehouseId: targetWarehouseId,
    hasDifferentWarehouses,
    unmatchedProducts,
  };
}
