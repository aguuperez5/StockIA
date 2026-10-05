import { describe, expect, it } from "vitest";
import { calculateLinePricing, unitPriceForQuantity } from "./pricing";
import type { PriceRuleItem } from "@/services/inventory";

// Helper emulating backend createSaleCompat calculation exactly
function backendCalculateLine(
  basePrice: number,
  rules: { minQuantity: number; price: number }[],
  quantity: number
) {
  const rule = [...rules]
    .filter(r => r.minQuantity <= quantity)
    .sort((a, b) => b.minQuantity - a.minQuantity)[0];
  const unitPrice = Number(rule?.price ?? basePrice);
  const total = unitPrice * quantity;
  const totalCents = Math.round(total * 100);
  const unitPriceCents = Math.round(unitPrice * 100);
  return { unitPrice, total, unitPriceCents, totalCents };
}

describe("HU-15: unitPriceForQuantity and calculateLinePricing parity", () => {
  const basePrice = 150.5; // $150.50
  const basePriceCents = 15050; // 15050 cents

  const sampleRules: PriceRuleItem[] = [
    { minQuantity: 5, priceCents: 13000, price: 130.0 },
    { minQuantity: 10, priceCents: 11000, price: 110.0 },
    { minQuantity: 25, priceCents: 9550, price: 95.5 },
  ];

  it("applies base price when product has no volume price rules", () => {
    const qty = 7;
    const frontendUnitPrice = unitPriceForQuantity(basePriceCents, [], qty);
    const linePricing = calculateLinePricing(basePriceCents, [], qty);
    const backend = backendCalculateLine(basePrice, [], qty);

    expect(frontendUnitPrice).toBe(basePriceCents);
    expect(linePricing.unitPriceCents).toBe(basePriceCents);
    expect(linePricing.totalCents).toBe(backend.totalCents);
    expect(linePricing.appliedRule).toBeNull();
    expect(linePricing.appliedRuleLabel).toBeUndefined();
  });

  it("applies base price when quantity is below the lowest threshold", () => {
    const qty = 4; // Below threshold of 5
    const frontendUnitPrice = unitPriceForQuantity(basePriceCents, sampleRules, qty);
    const linePricing = calculateLinePricing(basePriceCents, sampleRules, qty);
    const backend = backendCalculateLine(basePrice, sampleRules.map(r => ({ minQuantity: r.minQuantity, price: r.price! })), qty);

    expect(frontendUnitPrice).toBe(basePriceCents);
    expect(linePricing.unitPriceCents).toBe(backend.unitPriceCents);
    expect(linePricing.totalCents).toBe(backend.totalCents);
    expect(linePricing.appliedRule).toBeNull();
  });

  it("applies tier price exactly at the threshold border (qty === minQuantity)", () => {
    const qty = 5; // Exactly at tier 1 threshold
    const frontendUnitPrice = unitPriceForQuantity(basePriceCents, sampleRules, qty);
    const linePricing = calculateLinePricing(basePriceCents, sampleRules, qty);
    const backend = backendCalculateLine(basePrice, sampleRules.map(r => ({ minQuantity: r.minQuantity, price: r.price! })), qty);

    expect(frontendUnitPrice).toBe(13000);
    expect(linePricing.unitPriceCents).toBe(backend.unitPriceCents);
    expect(linePricing.totalCents).toBe(backend.totalCents);
    expect(linePricing.appliedRule?.minQuantity).toBe(5);
    expect(linePricing.appliedRuleLabel).toBe("Precio mayorista aplicado");
  });

  it("applies tier price when quantity is between thresholds", () => {
    const qty = 9; // >= 5 and < 10
    const frontendUnitPrice = unitPriceForQuantity(basePriceCents, sampleRules, qty);
    const linePricing = calculateLinePricing(basePriceCents, sampleRules, qty);
    const backend = backendCalculateLine(basePrice, sampleRules.map(r => ({ minQuantity: r.minQuantity, price: r.price! })), qty);

    expect(frontendUnitPrice).toBe(13000);
    expect(linePricing.unitPriceCents).toBe(backend.unitPriceCents);
    expect(linePricing.totalCents).toBe(backend.totalCents);
    expect(linePricing.appliedRule?.minQuantity).toBe(5);
  });

  it("applies highest eligible tier when multiple rules apply and rules are unordered", () => {
    const unorderedRules: PriceRuleItem[] = [
      { minQuantity: 10, priceCents: 11000, price: 110.0 },
      { minQuantity: 25, priceCents: 9550, price: 95.5 },
      { minQuantity: 5, priceCents: 13000, price: 130.0 },
    ];

    const qty = 25; // Exactly at highest tier
    const frontendUnitPrice = unitPriceForQuantity(basePriceCents, unorderedRules, qty);
    const linePricing = calculateLinePricing(basePriceCents, unorderedRules, qty);
    const backend = backendCalculateLine(basePrice, unorderedRules.map(r => ({ minQuantity: r.minQuantity, price: r.price! })), qty);

    expect(frontendUnitPrice).toBe(9550);
    expect(linePricing.unitPriceCents).toBe(backend.unitPriceCents);
    expect(linePricing.totalCents).toBe(backend.totalCents);
    expect(linePricing.appliedRule?.minQuantity).toBe(25);

    const qtyAbove = 50; // Well above highest tier
    const linePricingAbove = calculateLinePricing(basePriceCents, unorderedRules, qtyAbove);
    const backendAbove = backendCalculateLine(basePrice, unorderedRules.map(r => ({ minQuantity: r.minQuantity, price: r.price! })), qtyAbove);

    expect(linePricingAbove.unitPriceCents).toBe(9550);
    expect(linePricingAbove.totalCents).toBe(backendAbove.totalCents);
  });

  it("handles zero and negative quantities gracefully", () => {
    expect(unitPriceForQuantity(basePriceCents, sampleRules, 0)).toBe(basePriceCents);
    expect(calculateLinePricing(basePriceCents, sampleRules, 0).totalCents).toBe(0);
    expect(calculateLinePricing(basePriceCents, sampleRules, -2).totalCents).toBe(0);
  });
});
