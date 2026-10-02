import test from 'node:test';
import assert from 'node:assert/strict';
import { findRecognitionCatalogCandidates, normalizeCatalogText, rankRecognitionProducts, scoreCatalogName } from '../services/catalog-match.agent.js';

test('normalizes Spanish accents and punctuation before matching', () => {
  assert.equal(normalizeCatalogText('Válvula esférica 1/2"'), 'valvula esferica 1 2');
});

test('scores name evidence by token overlap without calling it model confidence', () => {
  assert.ok(scoreCatalogName('Válvula esférica', [{ text: 'Válvula esférica de bronce' }]) > 0.5);
  assert.equal(scoreCatalogName('Tornillo', [{ text: 'Leche entera' }]), 0);
});

test('marks uncorroborated barcode matches for human review', () => {
  const product = {
    id: 3, name: 'Válvula', code: '7791000000109', price: 120,
    stocks: [{ depositId: 2, quantity: 4, deposit: { name: 'Central' } }],
  };
  const analysis = {
    status: 'needs_review',
    identifiers: [{ value: product.code, source: 'barcode', checksum_valid: true }],
    consensus: { corroborated_values: [] },
  };
  const [match] = rankRecognitionProducts({ products: [product], validCodes: [product.code], evidenceLines: [], analysis });
  assert.equal(match.matchMethod, 'barcode');
  assert.equal(match.reviewRequired, true);
  assert.equal(match.matchScore, 1);
  assert.equal(match.stocks[0].warehouseName, 'Central');
});

test('looks up an EAN reading against an equivalent UPC catalog code', async () => {
  const product = { id: 1, name: 'Producto UPC', code: '042100005264', price: 10, stocks: [] };
  const analysis = {
    status: 'corroborated',
    identifiers: [
      { value: '0042100005264', source: 'barcode', checksum_valid: true },
      { value: product.code, source: 'ocr', checksum_valid: true },
    ],
    consensus: { corroborated_values: ['0042100005264'] },
  };
  const prisma = { product: { findMany: async ({ where }) => {
    assert.ok(where.code.in.includes(product.code));
    return [product];
  } } };
  const candidates = await findRecognitionCatalogCandidates(prisma, analysis);
  const [match] = rankRecognitionProducts(candidates);
  assert.equal(match.sku, product.code);
  assert.equal(match.matchMethod, 'barcode_ocr');
  assert.equal(match.reviewRequired, false);
});

test('does not substitute a similar name for an unknown retail barcode', () => {
  const product = { id: 1, name: 'Leche entera', code: '7791000000109', price: 10 };
  const matches = rankRecognitionProducts({
    products: [product], validCodes: ['7791000000116'],
    evidenceLines: ['Leche entera'],
    analysis: { identifiers: [], consensus: { corroborated_values: [] } },
  });
  assert.deepEqual(matches, []);
});
