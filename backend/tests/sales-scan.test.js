import { test, before, after, beforeEach } from 'node:test';
import assert from 'node:assert/strict';
import prisma from '../config/prisma.js';
import { resetDb, createProduct, createDeposit } from './helpers.js';
import { salesScan } from '../controllers/integration.controller.js';
import { requireAppRole, ROLE } from '../middleware.js';

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
  };
}

function restoreEnv(saved) {
  if (saved.url === undefined) delete process.env.AI_SERVICE_URL;
  else process.env.AI_SERVICE_URL = saved.url;
  if (saved.token === undefined) delete process.env.AI_SERVICE_TOKEN;
  else process.env.AI_SERVICE_TOKEN = saved.token;
  globalThis.fetch = saved.fetch;
}

before(async () => {
  await resetDb();
});
beforeEach(async () => {
  await resetDb();
});
after(async () => {
  await prisma.$disconnect();
});

test('rechaza /api/sales/scan sin imagen en el body con 400', async () => {
  const res = mockRes();
  await salesScan({ body: {} }, res);
  assert.equal(res.statusCode, 400);
  assert.match(res.body.message, /requiere una imagen/i);
});

test('devuelve 503 cuando el servicio de IA no está configurado o está caído', async () => {
  const saved = saveEnv();
  delete process.env.AI_SERVICE_URL;
  const res = mockRes();

  try {
    await salesScan(
      {
        body: {
          photoData: 'data:image/jpeg;base64,aGVsbG8=',
          photoMimeType: 'image/jpeg',
        },
      },
      res,
    );
    assert.equal(res.statusCode, 503);
  } finally {
    restoreEnv(saved);
  }
});

test('procesa escaneo exitoso con mock de IA y Open Food Facts, propagando suggestedQuantity', async () => {
  const saved = saveEnv();
  process.env.AI_SERVICE_URL = 'http://127.0.0.1:8010';

  const deposit = await createDeposit({ name: 'Depósito Central' });
  const product = await createProduct({
    name: 'Aceite de Girasol 1.5L',
    code: '7791337603615',
    price: 850,
  });
  await prisma.stock.create({
    data: { productId: product.id, depositId: deposit.id, quantity: 20 },
  });

  // Mock global fetch para la IA y Open Food Facts
  globalThis.fetch = async (url) => {
    const urlStr = String(url);
    if (urlStr.includes('/v1/analyze')) {
      return new Response(
        JSON.stringify({
          request_id: 'test-req-123',
          pipeline_version: '0.1.0',
          status: 'corroborated',
          quality: { usable: true, width: 640, height: 480, brightness_mean: 120, sharpness_variance: 200, warnings: [] },
          identifiers: [
            {
              value: '7791337603615',
              format: 'EAN-13',
              source: 'barcode',
              checksum_valid: true,
              occurrences: 3,
              quantity: 3,
            },
            {
              value: '7791337603615',
              format: 'EAN-13',
              source: 'ocr',
              checksum_valid: true,
              occurrences: 1,
              quantity: 1,
            },
          ],
          text_evidence: [{ text: 'Aceite de Girasol', score: 0.95 }],
          consensus: {
            status: 'corroborated',
            candidate_values: ['7791337603615'],
            corroborated_values: ['7791337603615'],
            quantities: { '7791337603615': 3 },
            warnings: [],
          },
          agents: {
            barcode: { state: 'ready', detail: 'zxing-cpp' },
            ocr: { state: 'ready', detail: 'mock' },
          },
          timings_ms: { decode: 5, quality: 3, barcode: 12, ocr: 45 },
          warnings: [],
        }),
        { status: 200, headers: { 'content-type': 'application/json' } },
      );
    }
    // Mock open food facts
    if (urlStr.includes('openfoodfacts')) {
      return new Response(
        JSON.stringify({
          status: 1,
          product: { product_name: 'Aceite Girasol', brands: 'Marca Test' },
        }),
        { status: 200, headers: { 'content-type': 'application/json' } },
      );
    }
    return new Response('Not found', { status: 404 });
  };

  const res = mockRes();
  try {
    await salesScan(
      {
        body: {
          photoData: 'data:image/jpeg;base64,aGVsbG8=',
          photoMimeType: 'image/jpeg',
        },
      },
      res,
    );

    assert.equal(res.statusCode, 200);
    assert.equal(res.body.status, 'corroborated');
    assert.equal(res.body.items.length, 1);
    const item = res.body.items[0];
    assert.equal(item.sku, '7791337603615');
    assert.equal(item.suggestedQuantity, 3);
    assert.equal(item.name, 'Aceite de Girasol 1.5L');

    assert.equal(res.body.detections.length, 1);
    assert.equal(res.body.detections[0].suggestedQuantity, 3);
    assert.equal(res.body.detections[0].inLocalCatalog, true);
  } finally {
    restoreEnv(saved);
  }
});

test('control de roles sobre /api/sales/scan: solo administrador y caja tienen acceso', () => {
  const middleware = requireAppRole(ROLE.ADMIN, ROLE.SALES);

  // Rol depósito -> 403
  let calledNext = false;
  const resDeposito = mockRes();
  middleware(
    { user: { role: 'USER', appRole: 'deposito' } },
    resDeposito,
    () => {
      calledNext = true;
    },
  );
  assert.equal(calledNext, false);
  assert.equal(resDeposito.statusCode, 403);

  // Rol caja -> permitido (llama a next)
  calledNext = false;
  const resCaja = mockRes();
  middleware(
    { user: { role: 'USER', appRole: 'caja' } },
    resCaja,
    () => {
      calledNext = true;
    },
  );
  assert.equal(calledNext, true);

  // Rol administrador -> permitido (llama a next)
  calledNext = false;
  const resAdmin = mockRes();
  middleware(
    { user: { role: 'ADMIN', appRole: 'administrador' } },
    resAdmin,
    () => {
      calledNext = true;
    },
  );
  assert.equal(calledNext, true);
});
