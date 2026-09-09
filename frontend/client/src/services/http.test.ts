import { afterEach, describe, expect, it, vi } from "vitest";
import { ApiError, get } from "./http";
import { productService } from "./products";
import { saleService } from "./sales";

describe("StockIA API services", () => {
  afterEach(() => vi.unstubAllGlobals());

  it("uses the central API client and parses successful responses", async () => {
    const fetchMock = vi.fn().mockResolvedValue(new Response(JSON.stringify({ status: "ok" }), { status: 200 }));
    vi.stubGlobal("fetch", fetchMock);
    await expect(get<{ status: string }>("/health")).resolves.toEqual({ status: "ok" });
    expect(fetchMock).toHaveBeenCalledWith(`${import.meta.env.VITE_API_URL}/api/health`, expect.objectContaining({ headers: { "Content-Type": "application/json" } }));
  });

  it("surfaces API messages as typed errors instead of generic browser alerts", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(new Response(JSON.stringify({ message: "No hay stock suficiente." }), { status: 422 })));
    await expect(get("/inventory")).rejects.toEqual(expect.objectContaining<ApiError>({ name: "ApiError", message: "No hay stock suficiente.", status: 422 }));
  });

  it("explains connection failures when the API cannot be reached", async () => {
    vi.stubGlobal("fetch", vi.fn().mockRejectedValue(new TypeError("Failed to fetch")));
    await expect(get("/dashboard")).rejects.toEqual(expect.objectContaining<ApiError>({ name: "ApiError", status: 0, message: "No pudimos conectar con StockIA. Revisá tu conexión e intentá nuevamente." }));
  });

  it("encodes product filters and sends sales through the central API", async () => {
    const fetchMock = vi.fn().mockResolvedValue(new Response(JSON.stringify({ items: [] }), { status: 200 }));
    vi.stubGlobal("fetch", fetchMock);
    await productService.list("café molido", "Almacén");
    expect(fetchMock).toHaveBeenLastCalledWith(`${import.meta.env.VITE_API_URL}/api/products?search=caf%C3%A9%20molido&category=Almac%C3%A9n`, expect.any(Object));
    fetchMock.mockResolvedValueOnce(new Response(JSON.stringify({ sale: { id: 7, receiptNumber: "V-1", totalCents: 2500 }, message: "ok" }), { status: 201 }));
    await saleService.create([{ productId: 3, warehouseId: 2, quantity: 1 }]);
    expect(fetchMock).toHaveBeenLastCalledWith(`${import.meta.env.VITE_API_URL}/api/sales`, expect.objectContaining({ method: "POST", body: JSON.stringify({ items: [{ productId: 3, warehouseId: 2, quantity: 1 }] }) }));
  });
});
