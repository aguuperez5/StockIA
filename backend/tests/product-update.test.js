import { test, before, after, beforeEach } from 'node:test';
import assert from 'node:assert/strict';
import prisma from '../config/prisma.js';
import { resetDb, createProduct } from './helpers.js';
import { createProductCompat, updateProductCompat, getProductCompat } from '../controllers/integration.controller.js';

function mockRes() {
  return {
    statusCode: 200,
    body: undefined,
    status(code) { this.statusCode = code; return this; },
    json(payload) { this.body = payload; return this; }
  };
}

before(async () => { await resetDb(); });
beforeEach(async () => { await resetDb(); });
after(async () => { await prisma.$disconnect(); });

test('crea producto con imagen y la expone en el detalle', async () => {
  const res = mockRes();
  await createProductCompat({ body: { name: 'Con Foto', sku: 'IMG-1', category: 'Almacen', price: 100, imageUrl: 'https://ejemplo.com/foto.png' } }, res);
  assert.equal(res.statusCode, 201);

  const get = mockRes();
  await getProductCompat({ params: { id: String(res.body.id) } }, get);
  assert.equal(get.body.item.imageUrl, 'https://ejemplo.com/foto.png');
});

test('rechaza imagen con formato inválido', async () => {
  const res = mockRes();
  await createProductCompat({ body: { name: 'Mala Foto', sku: 'IMG-2', category: 'Almacen', price: 100, imageUrl: 'ftp://no-valido' } }, res);
  assert.equal(res.statusCode, 400);
});

test('editar permite cambiar imagen y reactivar un producto dado de baja', async () => {
  const product = await createProduct({ code: 'IMG-3' });
  await prisma.product.update({ where: { id: product.id }, data: { active: false } });

  const res = mockRes();
  await updateProductCompat({ params: { id: String(product.id) }, body: { active: true, imageUrl: 'https://ejemplo.com/nueva.png' } }, res);
  assert.equal(res.statusCode, 200);

  const stored = await prisma.product.findUnique({ where: { id: product.id } });
  assert.equal(stored.active, true);
  assert.equal(stored.imageUrl, 'https://ejemplo.com/nueva.png');
});

test('editar con id inválido devuelve 400', async () => {
  const res = mockRes();
  await updateProductCompat({ params: { id: 'abc' }, body: { name: 'X' } }, res);
  assert.equal(res.statusCode, 400);
});
