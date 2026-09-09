import { afterEach, describe, expect, it, vi } from "vitest";
import { customerService, priceRuleService, recognitionService, reportService, teamService, telegramService, transferService } from "./backlog";

describe("StockIA backlog services", () => {
  afterEach(() => vi.unstubAllGlobals());

  it("uses the expected endpoints and methods", async () => {
    const fetchMock = vi.fn().mockResolvedValue(new Response(JSON.stringify({}), { status: 200 }));
    vi.stubGlobal("fetch", fetchMock);

    await priceRuleService.save(3, [{ minQuantity: 5, price: 9 }]);
    expect(fetchMock).toHaveBeenLastCalledWith(expect.stringContaining("/api/price-rules/3"), expect.objectContaining({ method: "PUT", credentials: "include" }));
    await recognitionService.analyze("valvula", { data: "data:image/png;base64,AA==", mimeType: "image/png" });
    expect(fetchMock).toHaveBeenLastCalledWith(expect.stringContaining("/api/recognition/analyze"), expect.objectContaining({ method: "POST" }));
    await transferService.list({ productId: "3", warehouseId: "2" });
    expect(fetchMock).toHaveBeenLastCalledWith(expect.stringContaining("/api/transfers?productId=3&warehouseId=2"), expect.any(Object));
    await customerService.create({ name: "Ana", contact: "ana", email: null, phone: null });
    expect(fetchMock).toHaveBeenLastCalledWith(expect.stringContaining("/api/customers"), expect.objectContaining({ method: "POST" }));
    await telegramService.updateStatus(4, "Lista");
    expect(fetchMock).toHaveBeenLastCalledWith(expect.stringContaining("/api/telegram/4"), expect.objectContaining({ method: "PATCH" }));
    await reportService.get("2026-01-01", "2026-01-31");
    expect(fetchMock).toHaveBeenLastCalledWith(expect.stringContaining("/api/reports?from=2026-01-01&to=2026-01-31"), expect.any(Object));
    await teamService.updateRole(5, "deposito");
    expect(fetchMock).toHaveBeenLastCalledWith(expect.stringContaining("/api/team/5"), expect.objectContaining({ method: "PATCH" }));
  });

  it("surfaces API errors from service calls", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(new Response(JSON.stringify({ message: "No autorizado." }), { status: 403 })));
    await expect(teamService.list()).rejects.toMatchObject({ name: "ApiError", status: 403, message: "No autorizado." });
  });
});
