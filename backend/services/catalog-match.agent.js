const MIN_NAME_MATCH_SCORE = 0.28;

// UPC-A, EAN-13 and padded GTIN-14 can identify the same retail item.
export function canonicalGtin(value) {
  const code = String(value);
  return /^\d{8}$|^\d{12,14}$/.test(code) ? code.padStart(14, "0") : code;
}

function catalogCodeVariants(value) {
  const canonical = canonicalGtin(value);
  if (!/^\d{14}$/.test(canonical)) return [String(value)];
  return [8, 12, 13, 14]
    .filter(length => /^0*$/.test(canonical.slice(0, 14 - length)))
    .map(length => canonical.slice(-length));
}

export function normalizeCatalogText(value) {
  return String(value || "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, " ")
    .trim();
}

function textTokens(value) {
  return normalizeCatalogText(value).split(/\s+/).filter(token => token.length >= 3);
}

export function scoreCatalogName(productName, textEvidence = []) {
  const name = normalizeCatalogText(productName);
  const nameTokens = new Set(textTokens(name));
  if (!name || !nameTokens.size) return 0;

  let best = 0;
  for (const line of textEvidence) {
    const text = normalizeCatalogText(typeof line === "string" ? line : line?.text);
    if (!text) continue;
    if (text === name) best = Math.max(best, 1);
    else if (text.includes(name) || name.includes(text)) {
      const shorter = Math.min(text.length, name.length);
      const longer = Math.max(text.length, name.length);
      best = Math.max(best, 0.85 * (shorter / longer));
    }

    const evidenceTokens = new Set(textTokens(text));
    const intersection = [...nameTokens].filter(token => evidenceTokens.has(token)).length;
    if (!intersection) continue;
    const precision = intersection / evidenceTokens.size;
    const recall = intersection / nameTokens.size;
    const f1 = (2 * precision * recall) / (precision + recall);
    best = Math.max(best, f1);
  }
  return Number(best.toFixed(3));
}

export async function findRecognitionCatalogCandidates(prisma, analysis) {
  const validCodes = [...new Set(
    (analysis.identifiers || [])
      .filter(item => item.checksum_valid)
      .flatMap(item => catalogCodeVariants(item.value)),
  )];
  const evidenceLines = (analysis.text_evidence || [])
    .map(item => String(item.text || "").trim())
    .filter(text => text.length >= 3 && text.length <= 120)
    .slice(0, 12);
  const searchTokens = [...new Set(evidenceLines.flatMap(textTokens))]
    .sort((left, right) => right.length - left.length)
    .slice(0, 8);
  const include = { stocks: { include: { deposit: true } } };
  const [codeMatches, textMatches] = await Promise.all([
    validCodes.length
      ? prisma.product.findMany({
          where: { active: true, code: { in: validCodes } },
          include,
        })
      : [],
    searchTokens.length
      ? prisma.product.findMany({
          where: {
            active: true,
            OR: searchTokens.map(token => ({ name: { contains: token, mode: "insensitive" } })),
          },
          include,
          take: 100,
        })
      : [],
  ]);

  const unique = new Map();
  for (const product of [...codeMatches, ...textMatches]) unique.set(product.id, product);
  return { products: [...unique.values()], validCodes, evidenceLines, analysis };
}

export function rankRecognitionProducts({ products, validCodes, evidenceLines, analysis }) {
  const corroborated = new Set((analysis.consensus?.corroborated_values || []).map(canonicalGtin));
  const codeEvidence = new Map();
  for (const evidence of analysis.identifiers || []) {
    if (!evidence.checksum_valid) continue;
    const key = canonicalGtin(evidence.value);
    const sources = codeEvidence.get(key) || new Set();
    sources.add(evidence.source);
    codeEvidence.set(key, sources);
  }

  const ranked = products.map(product => {
    const exactCode = validCodes.includes(String(product.code));
    const score = exactCode ? 1 : scoreCatalogName(product.name, evidenceLines);
    const sources = codeEvidence.get(canonicalGtin(product.code)) || new Set();
    const matchMethod = exactCode
      ? sources.size > 1 ? "barcode_ocr" : sources.has("barcode") ? "barcode" : "ocr_code"
      : "ocr_name";
    return {
      product,
      score,
      exactCode,
      matchMethod,
      reviewRequired: !corroborated.has(canonicalGtin(product.code)) || analysis.status === "ambiguous" || !exactCode,
    };
  }).filter(match => match.exactCode || (!validCodes.length && match.score >= MIN_NAME_MATCH_SCORE));

  ranked.sort((left, right) => Number(right.exactCode) - Number(left.exactCode) || right.score - left.score);
  return ranked.slice(0, 8).map(({ product, score, matchMethod, reviewRequired }) => ({
    id: product.id,
    name: product.name,
    sku: product.code,
    priceCents: Math.round(Number(product.price) * 100),
    matchScore: score,
    matchMethod,
    reviewRequired,
    stocks: (product.stocks || []).map(stock => ({
      warehouseId: stock.depositId,
      warehouseName: stock.deposit.name,
      quantity: stock.quantity,
    })),
  }));
}
