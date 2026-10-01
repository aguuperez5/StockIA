import { afterEach, describe, expect, it, vi } from "vitest";
import { authService } from "./auth";

const apiBase = String(import.meta.env.VITE_API_URL ?? "")
  .replace(/\/+$/, "")
  .replace(/\/api$/, "");

describe("StockIA authentication service", () => {
  afterEach(() => vi.unstubAllGlobals());

  it("sends login credentials with cookies enabled", async () => {
    const fetchMock = vi
      .fn()
      .mockResolvedValue(
        new Response(
          JSON.stringify({
            user: { id: 2, fullName: "Ana", email: "ana@demo.com" },
            message: "Sesión iniciada.",
          }),
          { status: 200 }
        )
      );
    vi.stubGlobal("fetch", fetchMock);
    await expect(
      authService.login({ email: "ana@demo.com", password: "password" })
    ).resolves.toMatchObject({ user: { email: "ana@demo.com" } });
    expect(fetchMock).toHaveBeenCalledWith(
      `${apiBase}/api/auth/login`,
      expect.objectContaining({
        method: "POST",
        credentials: "include",
        body: JSON.stringify({ email: "ana@demo.com", password: "password" }),
      })
    );
  });

  it("requests the current session through the protected endpoint", async () => {
    const fetchMock = vi
      .fn()
      .mockResolvedValue(
        new Response(
          JSON.stringify({
            user: { id: 2, fullName: "Ana", email: "ana@demo.com" },
          }),
          { status: 200 }
        )
      );
    vi.stubGlobal("fetch", fetchMock);
    await authService.me();
    expect(fetchMock).toHaveBeenCalledWith(
      `${apiBase}/api/auth/me`,
      expect.objectContaining({ credentials: "include" })
    );
  });
});
