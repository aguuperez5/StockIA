import { describe, expect, it } from "vitest";
import { getStockLevel, getStockBadgeInfo } from "./stockLevel";
import { StockBadge } from "@/components/StockUI";
import { renderToStaticMarkup } from "react-dom/server";
import React from "react";

describe("HU-16: Stock level and badge unified logic", () => {
  it("classifies quantity 0 as 'sin_stock'", () => {
    expect(getStockLevel(0, 5)).toBe("sin_stock");
    expect(getStockLevel(-1, 5)).toBe("sin_stock");

    const badge = getStockBadgeInfo(0, 5);
    expect(badge.level).toBe("sin_stock");
    expect(badge.label).toBe("Sin stock");
    expect(badge.badgeClass).toBe("stock-critical");
  });

  it("classifies quantity <= threshold / 2 as 'critico'", () => {
    // Threshold 10: 1 to 5 is critico
    expect(getStockLevel(1, 10)).toBe("critico");
    expect(getStockLevel(5, 10)).toBe("critico");

    const badge = getStockBadgeInfo(2, 5); // threshold 5: floor(5/2) = 2
    expect(badge.level).toBe("critico");
    expect(badge.label).toBe("Crítico");
    expect(badge.badgeClass).toBe("stock-critical");
  });

  it("classifies quantity > threshold / 2 and <= threshold as 'bajo'", () => {
    // Threshold 10: 6 to 10 is bajo
    expect(getStockLevel(6, 10)).toBe("bajo");
    expect(getStockLevel(10, 10)).toBe("bajo");

    // Threshold 5: 3, 4, 5 is bajo
    expect(getStockLevel(3, 5)).toBe("bajo");
    expect(getStockLevel(5, 5)).toBe("bajo");

    const badge = getStockBadgeInfo(5, 5);
    expect(badge.level).toBe("bajo");
    expect(badge.label).toBe("Bajo mínimo");
    expect(badge.badgeClass).toBe("stock-low");
  });

  it("classifies quantity > threshold as 'saludable'", () => {
    expect(getStockLevel(6, 5)).toBe("saludable");
    expect(getStockLevel(100, 5)).toBe("saludable");

    const badge = getStockBadgeInfo(11, 10);
    expect(badge.level).toBe("saludable");
    expect(badge.label).toBe("Saludable");
    expect(badge.badgeClass).toBe("stock-good");
  });

  it("StockBadge component renders expected markup and class for each state", () => {
    const markupSinStock = renderToStaticMarkup(
      React.createElement(StockBadge, { quantity: 0, threshold: 5 })
    );
    expect(markupSinStock).toContain("stock-critical");
    expect(markupSinStock).toContain("Sin stock");

    const markupCritico = renderToStaticMarkup(
      React.createElement(StockBadge, { quantity: 2, threshold: 5 })
    );
    expect(markupCritico).toContain("stock-critical");
    expect(markupCritico).toContain("Crítico");

    const markupBajo = renderToStaticMarkup(
      React.createElement(StockBadge, { quantity: 4, threshold: 5 })
    );
    expect(markupBajo).toContain("stock-low");
    expect(markupBajo).toContain("Bajo mínimo");

    const markupSaludable = renderToStaticMarkup(
      React.createElement(StockBadge, { quantity: 15, threshold: 5 })
    );
    expect(markupSaludable).toContain("stock-good");
    expect(markupSaludable).toContain("Saludable");
  });
});
