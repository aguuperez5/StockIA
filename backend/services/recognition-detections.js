import { canonicalGtin } from "./catalog-match.agent.js";
import { lookupOpenFoodFactsProduct } from "./openfoodfacts.client.js";

function validGtin(value) {
  if (typeof value !== "string" || !/^(?:\d{8}|\d{12,14})$/.test(value))
    return false;
  const payload = value.slice(0, -1).split("").reverse();
  const sum = payload.reduce(
    (total, digit, index) => total + Number(digit) * (index % 2 ? 1 : 3),
    0,
  );
  return (10 - (sum % 10)) % 10 === Number(value.at(-1));
}

export async function buildRecognitionDetections(
  analysis,
  { lookup = lookupOpenFoodFactsProduct } = {},
) {
  const grouped = new Map();
  for (const evidence of analysis.identifiers || []) {
    if (
      !evidence.checksum_valid ||
      !validGtin(evidence.value) ||
      !["barcode", "ocr"].includes(evidence.source)
    )
      continue;
    const key = canonicalGtin(evidence.value);
    const detection = grouped.get(key) || {
      value: evidence.value,
      sources: new Set(),
    };
    // Preserve the barcode representation when OCR provides a padded alias.
    if (evidence.source === "barcode") detection.value = evidence.value;
    detection.sources.add(evidence.source);
    grouped.set(key, detection);
  }
  // Every scan requests fresh metadata for each unique valid identifier,
  // including local matches. The provider client enforces its rate limit.
  return Promise.all(
    [...grouped.values()].map(async (detection) => {
      let catalogLookup;
      try {
        catalogLookup = await lookup(detection.value);
      } catch {
        catalogLookup = { provider: "openfoodfacts", status: "unavailable" };
      }
      return {
        value: detection.value,
        sources: [...detection.sources].sort(),
        matchMethod:
          detection.sources.size > 1
            ? "barcode_ocr"
            : detection.sources.has("barcode")
              ? "barcode"
              : "ocr_code",
        reviewRequired:
          detection.sources.size < 2 || analysis.status === "ambiguous",
        catalogLookup,
      };
    }),
  );
}
