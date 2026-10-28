import { describe, expect, it } from "vitest";
import { normalizeCategoryName } from "./categories";

describe("normalizeCategoryName", () => {
  it("recorta y colapsa espacios", () => {
    expect(normalizeCategoryName("  Almacén   general ")).toBe("Almacén general");
  });
  it("devuelve vacío ante nulos", () => {
    expect(normalizeCategoryName("")).toBe("");
  });
});
