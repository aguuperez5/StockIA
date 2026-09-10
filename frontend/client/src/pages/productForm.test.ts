import { describe, expect, it } from "vitest";
import { parseMoney } from "./ProductFormPage";

describe("parseMoney del alta de productos", () => {
  it("acepta punto decimal", () => {
    expect(parseMoney("10.50")).toBe(10.5);
    expect(parseMoney("1500")).toBe(1500);
  });
  it("acepta coma decimal argentina", () => {
    expect(parseMoney("10,50")).toBe(10.5);
    expect(parseMoney("0,00")).toBe(0);
  });
  it("lee puntos como miles cuando hay coma", () => {
    expect(parseMoney("1.500,50")).toBe(1500.5);
  });
  it("rechaza texto no numérico", () => {
    expect(parseMoney("abc")).toBeNaN();
    expect(parseMoney("")).toBe(0);
  });
});
