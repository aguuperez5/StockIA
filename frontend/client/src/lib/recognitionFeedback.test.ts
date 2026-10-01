import { describe, expect, it } from "vitest";
import { recognitionFeedback } from "./recognitionFeedback";

describe("recognition feedback", () => {
  it("explains a successful scan missing from the local catalog", () => {
    const message = recognitionFeedback({
      items: [],
      identifiers: [{ value: "7790070410115", checksum_valid: true }],
    });
    expect(message).toContain("7790070410115");
    expect(message).toContain("No está en el catálogo local");
  });

  it("does not present an invalid checksum as a successful scan", () => {
    expect(
      recognitionFeedback({
        items: [],
        identifiers: [{ value: "7790070410110", checksum_valid: false }],
      })
    ).not.toContain("Código leído");
  });

  it("keeps several product readings subject to review", () => {
    expect(
      recognitionFeedback({ items: [{ id: 1 }], status: "ambiguous" })
    ).toContain("varios códigos");
  });
});
