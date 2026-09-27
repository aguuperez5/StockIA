import test from 'node:test';
import assert from 'node:assert/strict';
import prisma from '../config/prisma.js';
import { recognition } from '../controllers/integration.controller.js';

function mockRes() {
  return {
    statusCode: 200,
    body: undefined,
    status(code) {
      this.statusCode = code;
      return this;
    },
    json(payload) {
      this.body = payload;
      return this;
    },
  };
}

function saveEnv() {
  return {
    url: process.env.AI_SERVICE_URL,
    token: process.env.AI_SERVICE_TOKEN,
    fetch: globalThis.fetch,
    findMany: prisma.product.findMany,
  };
}

function restoreEnv(saved) {
  if (saved.url === undefined) delete process.env.AI_SERVICE_URL;
  else process.env.AI_SERVICE_URL = saved.url;
  if (saved.token === undefined) delete process.env.AI_SERVICE_TOKEN;
  else process.env.AI_SERVICE_TOKEN = saved.token;
  globalThis.fetch = saved.fetch;
  prisma.product.findMany = saved.findMany;
}

const sampleProduct = {
  id: 42,
  name: 'Válvula esférica de bronce 1/2"',
  code: '7791000000109',
  price: '150.00',
  active: true,
  stocks: [
    { depositId: 2, quantity: 18, deposit: { id: 2, name: 'Depósito Central' } },
  ],
};

test('CP-RF-06: Paso 1 - Rechaza solicitudes sin foto ni término de búsqueda (HTTP 400)', async () => {
  const res = mockRes();
  await recognition({ body: {} }, res);
  assert.equal(res.statusCode, 400);
  assert.match(res.body.message, /Ingresá un término de búsqueda o capturá una foto/);
});

test('CP-RF-06: Paso 1 - Informa HTTP 503 explicativo si el pipeline de IA no está configurado', async () => {
  const saved = saveEnv();
  delete process.env.AI_SERVICE_URL;
  try {
    const res = mockRes();
    await recognition({
      body: {
        photoData: 'data:image/jpeg;base64,aGVsbG8=',
        photoMimeType: 'image/jpeg',
      },
    }, res);
    assert.equal(res.statusCode, 503);
    assert.match(res.body.message, /reconocimiento visual no está configurado/);
  } finally {
    restoreEnv(saved);
  }
});

test('CP-RF-06: Pasos 1, 2 y 3 - Lectura exitosa por código de barras (zxing-cpp) y búsqueda en catálogo', async () => {
  const saved = saveEnv();
  process.env.AI_SERVICE_URL = 'http://127.0.0.1:8010';
  process.env.AI_SERVICE_TOKEN = 'test-token';

  // Simula la respuesta del pipeline Python (FastAPI /v1/analyze) con zxing-cpp
  globalThis.fetch = async (url, options) => {
    assert.equal(url, 'http://127.0.0.1:8010/v1/analyze');
    assert.equal(options.headers.Authorization, 'Bearer test-token');
    return new Response(JSON.stringify({
      status: 'needs_review',
      request_id: 'req-cp-rf-06-barcode',
      pipeline_version: '1.0.0',
      quality: { usable: true, score: 0.95, brightness: 120, blur_variance: 450, warnings: [] },
      identifiers: [
        { value: '7791000000109', format: 'EAN-13', source: 'barcode', checksum_valid: true, score: 1.0 },
      ],
      text_evidence: [],
      consensus: { status: 'needs_review', corroborated_values: [], warnings: [] },
      warnings: [],
    }), {
      status: 200,
      headers: { 'content-type': 'application/json' },
    });
  };

  // Mock de consulta Prisma sin mutar base de datos
  prisma.product.findMany = async ({ where }) => {
    if (where.code?.in?.includes('7791000000109')) {
      return [sampleProduct];
    }
    return [];
  };

  try {
    const res = mockRes();
    await recognition({
      body: {
        photoData: 'data:image/jpeg;base64,aGVsbG8=',
        photoMimeType: 'image/jpeg',
      },
    }, res);

    assert.equal(res.statusCode, 200);
    assert.equal(res.body.simulated, false);
    assert.equal(res.body.status, 'needs_review');
    assert.equal(res.body.items.length, 1);

    const [matched] = res.body.items;
    assert.equal(matched.id, 42);
    assert.equal(matched.sku, '7791000000109');
    assert.equal(matched.matchMethod, 'barcode');
    assert.equal(matched.matchScore, 1);
    assert.equal(matched.reviewRequired, true); // Al no tener corroboración dual, requiere revisión humana
    assert.equal(matched.stocks[0].warehouseName, 'Depósito Central');
    assert.equal(matched.stocks[0].quantity, 18);
  } finally {
    restoreEnv(saved);
  }
});

test('CP-RF-06: Pasos 1, 2 y 3 - Respaldo OCR (Fallback) cuando zxing-cpp no detecta el código de barras', async () => {
  const saved = saveEnv();
  process.env.AI_SERVICE_URL = 'http://127.0.0.1:8010';

  // Simula que zxing-cpp no pudo leer el código de barras, pero PaddleOCR extrajo el código numérico y texto
  globalThis.fetch = async () => {
    return new Response(JSON.stringify({
      status: 'needs_review',
      request_id: 'req-cp-rf-06-ocr-fallback',
      pipeline_version: '1.0.0',
      quality: { usable: true, score: 0.88, brightness: 110, blur_variance: 380, warnings: [] },
      identifiers: [
        { value: '7791000000109', format: 'EAN-13', source: 'ocr', checksum_valid: true, score: 0.94 },
      ],
      text_evidence: [
        { text: 'Valvula esferica bronce 1/2', score: 0.92 },
      ],
      consensus: { status: 'needs_review', corroborated_values: [], warnings: [] },
      warnings: [],
    }), {
      status: 200,
      headers: { 'content-type': 'application/json' },
    });
  };

  prisma.product.findMany = async ({ where }) => {
    if (where.code?.in?.includes('7791000000109')) {
      return [sampleProduct];
    }
    return [];
  };

  try {
    const res = mockRes();
    await recognition({
      body: {
        photoData: 'data:image/png;base64,aGVsbG8=',
        photoMimeType: 'image/png',
      },
    }, res);

    assert.equal(res.statusCode, 200);
    assert.equal(res.body.simulated, false);
    assert.equal(res.body.items.length, 1);

    const [matched] = res.body.items;
    assert.equal(matched.sku, '7791000000109');
    assert.equal(matched.matchMethod, 'ocr_code'); // Respaldo efectivo por OCR numérico
    assert.equal(matched.reviewRequired, true);
    assert.equal(matched.stocks[0].quantity, 18);
  } finally {
    restoreEnv(saved);
  }
});

test('CP-RF-06: Pasos 1, 2 y 3 - Respaldo OCR Léxico por nombre cuando no hay código legible en la etiqueta', async () => {
  const saved = saveEnv();
  process.env.AI_SERVICE_URL = 'http://127.0.0.1:8010';

  // Simula que no hay ningún código numérico GTIN/EAN, pero OCR leyó el nombre del producto
  globalThis.fetch = async () => {
    return new Response(JSON.stringify({
      status: 'needs_review',
      request_id: 'req-cp-rf-06-ocr-name',
      pipeline_version: '1.0.0',
      quality: { usable: true, score: 0.90, brightness: 115, blur_variance: 400, warnings: [] },
      identifiers: [],
      text_evidence: [
        { text: 'Valvula esferica de bronce', score: 0.96 },
      ],
      consensus: { status: 'needs_review', corroborated_values: [], warnings: [] },
      warnings: [],
    }), {
      status: 200,
      headers: { 'content-type': 'application/json' },
    });
  };

  prisma.product.findMany = async ({ where }) => {
    if (where.OR) {
      return [sampleProduct];
    }
    return [];
  };

  try {
    const res = mockRes();
    await recognition({
      body: {
        photoData: 'data:image/jpeg;base64,aGVsbG8=',
        photoMimeType: 'image/jpeg',
      },
    }, res);

    assert.equal(res.statusCode, 200);
    assert.equal(res.body.items.length, 1);

    const [matched] = res.body.items;
    assert.equal(matched.id, 42);
    assert.equal(matched.matchMethod, 'ocr_name'); // Respaldo por nombre léxico
    assert.ok(matched.matchScore > 0.5);
    assert.equal(matched.reviewRequired, true);
  } finally {
    restoreEnv(saved);
  }
});

test('CP-RF-06: Consenso Dual - Corroboración zxing-cpp + OCR con idéntico código (reviewRequired: false)', async () => {
  const saved = saveEnv();
  process.env.AI_SERVICE_URL = 'http://127.0.0.1:8010';

  // Ambas fuentes coinciden independientemente en el mismo GTIN
  globalThis.fetch = async () => {
    return new Response(JSON.stringify({
      status: 'corroborated',
      request_id: 'req-cp-rf-06-corroborated',
      pipeline_version: '1.0.0',
      quality: { usable: true, score: 0.98, brightness: 130, blur_variance: 520, warnings: [] },
      identifiers: [
        { value: '7791000000109', format: 'EAN-13', source: 'barcode', checksum_valid: true, score: 1.0 },
        { value: '7791000000109', format: 'EAN-13', source: 'ocr', checksum_valid: true, score: 0.97 },
      ],
      text_evidence: [
        { text: '7791000000109', score: 0.97 },
      ],
      consensus: { status: 'corroborated', corroborated_values: ['7791000000109'], warnings: [] },
      warnings: [],
    }), {
      status: 200,
      headers: { 'content-type': 'application/json' },
    });
  };

  prisma.product.findMany = async ({ where }) => {
    if (where.code?.in?.includes('7791000000109')) {
      return [sampleProduct];
    }
    return [];
  };

  try {
    const res = mockRes();
    await recognition({
      body: {
        photoData: 'data:image/jpeg;base64,aGVsbG8=',
        photoMimeType: 'image/jpeg',
      },
    }, res);

    assert.equal(res.statusCode, 200);
    const [matched] = res.body.items;
    assert.equal(matched.matchMethod, 'barcode_ocr'); // Detección dual corroborada
    assert.equal(matched.reviewRequired, false);      // Alta confianza automática
  } finally {
    restoreEnv(saved);
  }
});
