import { afterEach, describe, expect, it, vi } from "vitest";
import { saleService } from "./sales";

describe("StockIA dashboard analytics service", () => {
  afterEach(() => vi.unstubAllGlobals());

  it("loads real chart datasets from the dashboard endpoint", async () => {
    const response = {
      products: 4,
      warehouses: 2,
      inventoryValueCents: 125000,
      todaySalesCents: 32000,
      todaySaleCount: 3,
      lowStock: [],
      salesByDay: [
        { date: "2026-09-02", label: "mié", totalCents: 32000, count: 3 },
      ],
      inventoryByCategory: [
        { category: "Bebidas", units: 12, valueCents: 48000 },
      ],
      inventoryStatus: [{ label: "Saludable", value: 4, color: "var(--status-ok)" }],
    };
    const fetchMock = vi
      .fn()
      .mockResolvedValue(
        new Response(JSON.stringify(response), { status: 200 })
      );
    vi.stubGlobal("fetch", fetchMock);
    const result = await saleService.dashboard();
    expect(result.salesByDay[0]).toMatchObject({ totalCents: 32000, count: 3 });
    expect(result.inventoryByCategory[0]).toMatchObject({
      category: "Bebidas",
      units: 12,
    });
    expect(result.inventoryStatus[0]?.label).toBe("Saludable");
    expect(fetchMock).toHaveBeenCalledWith(
      `${import.meta.env.VITE_API_URL}/api/dashboard`,
      expect.objectContaining({ credentials: "include" })
    );
  });
});
