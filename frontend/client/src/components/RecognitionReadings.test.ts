import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import RecognitionReadings from "./RecognitionReadings";
import type { RecognitionDetection } from "@/services/backlog";

const reading = (
  overrides: Partial<RecognitionDetection> = {}
): RecognitionDetection => ({
  value: "7791337603615",
  sources: ["barcode"],
  matchMethod: "barcode",
  reviewRequired: true,
  inLocalCatalog: false,
  catalogLookup: {
    provider: "openfoodfacts",
    status: "found",
    product: {
      code: "7791337603615",
      name: "Yogur vainilla",
      brand: "La Serenísima",
      url: "https://world.openfoodfacts.org/product/7791337603615",
    },
  },
  ...overrides,
});

describe("recognition readings", () => {
  it("shows the detected code, source and Open Food Facts product even without a local product", () => {
    const html = renderToStaticMarkup(
      createElement(RecognitionReadings, { detections: [reading()] })
    );
    expect(html).toContain("7791337603615");
    expect(html).toContain("Código de barras");
    expect(html).toContain("Yogur vainilla");
    expect(html).toContain("La Serenísima");
    expect(html).toContain(
      'href="https://world.openfoodfacts.org/product/7791337603615"'
    );
    expect(html).toContain("Ver fuente en Open Food Facts");
    expect(html).toContain("No está en el catálogo local");
  });

  it("identifies an OCR-only number instead of labelling it as a barcode decode", () => {
    const html = renderToStaticMarkup(
      createElement(RecognitionReadings, {
        detections: [reading({ sources: ["ocr"], matchMethod: "ocr_code" })],
      })
    );
    expect(html).toContain("Número impreso (OCR)");
    expect(html).not.toContain("Código de barras");
  });

  it("shows matching independent reads and a provider rate limit together", () => {
    const html = renderToStaticMarkup(
      createElement(RecognitionReadings, {
        detections: [
          reading({
            sources: ["barcode", "ocr"],
            matchMethod: "barcode_ocr",
            reviewRequired: false,
            catalogLookup: {
              provider: "openfoodfacts",
              status: "rate_limited",
              httpStatus: 429,
              retryAfterSeconds: 30,
            },
          }),
        ],
      })
    );
    expect(html).toContain("Barras + número impreso (OCR)");
    expect(html).toContain("7791337603615");
    expect(html).toContain("Volvé a analizar en 30 segundos");
    expect(html).not.toContain("Yogur vainilla");
  });
});
