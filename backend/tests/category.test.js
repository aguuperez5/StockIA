import { test, before, after, beforeEach } from 'node:test';
import assert from 'node:assert/strict';
import prisma from '../config/prisma.js';
import { resetDb } from './helpers.js';
import {
  createCategory,
  updateCategory,
  deleteCategory,
  listCategories,
  createProductCompat,
  updateProductCompat,
} from '../controllers/integration.controller.js';

function mockRes() {
  return {
    statusCode: 200,
    body: undefined,
    status(code) { this.statusCode = code; return this; },
    json(payload) { this.body = payload; return this; },
  };
}

before(async () => { await resetDb(); });
beforeEach(async () => { await resetDb(); });
after(async () => { await prisma.$disconnect(); });

test('crea y lista categorías ordenadas', async () => {
  for (const name of ['Limpieza', 'Almacén']) {
    const res = mockRes();
    await createCategory({ body: { name } }, res);
    assert.equal(res.statusCode, 201);
  }
  const list = mockRes();
  await listCategories({}, list);
  assert.deepEqual(list.body.items.map(i => i.name), ['Almacén', 'Limpieza']);
});

test('rechaza categoría duplicada sin importar mayúsculas', async () => {
  const first = mockRes();
  await createCategory({ body: { name: 'Almacén' } }, first);
  assert.equal(first.statusCode, 201);
  const dup = mockRes();
  await createCategory({ body: { name: '  almacén ' } }, dup);
  assert.equal(dup.statusCode, 409);
});

test('rechaza nombre demasiado corto', async () => {
  const res = mockRes();
  await createCategory({ body: { name: 'A' } }, res);
  assert.equal(res.statusCode, 400);
});

test('crear producto exige categoría del catálogo cuando existe', async () => {
  const cat = mockRes();
  await createCategory({ body: { name: 'Almacén' } }, cat);
  assert.equal(cat.statusCode, 201);

  const bad = mockRes();
  await createProductCompat(
    { body: { name: 'Yerba', sku: 'YER-1', category: 'Almacen trucho', price: 100 } },
    bad,
  );
  assert.equal(bad.statusCode, 400);

  const ok = mockRes();
  await createProductCompat(
    { body: { name: 'Yerba', sku: 'YER-1', category: '  almacén ', price: 100 } },
    ok,
  );
  assert.equal(ok.statusCode, 201);
  const stored = await prisma.product.findUnique({ where: { id: ok.body.id } });
  assert.equal(stored.category, 'Almacén');
});

test('renombrar categoría actualiza productos en cascada', async () => {
  const cat = mockRes();
  await createCategory({ body: { name: 'Almacén' } }, cat);
  const prod = mockRes();
  await createProductCompat(
    { body: { name: 'Yerba', sku: 'YER-2', category: 'Almacén', price: 100 } },
    prod,
  );
  assert.equal(prod.statusCode, 201);

  const upd = mockRes();
  await updateCategory({ params: { id: String(cat.body.id) }, body: { name: 'Despensa' } }, upd);
  assert.equal(upd.statusCode, 200);
  const stored = await prisma.product.findUnique({ where: { id: prod.body.id } });
  assert.equal(stored.category, 'Despensa');
});

test('no elimina categoría con productos asociados', async () => {
  const cat = mockRes();
  await createCategory({ body: { name: 'Almacén' } }, cat);
  const prod = mockRes();
  await createProductCompat(
    { body: { name: 'Yerba', sku: 'YER-3', category: 'Almacén', price: 100 } },
    prod,
  );
  assert.equal(prod.statusCode, 201);

  const del = mockRes();
  await deleteCategory({ params: { id: String(cat.body.id) } }, del);
  assert.equal(del.statusCode, 409);

  await prisma.product.delete({ where: { id: prod.body.id } });
  const delOk = mockRes();
  await deleteCategory({ params: { id: String(cat.body.id) } }, delOk);
  assert.equal(delOk.statusCode, 200);
});

test('editar producto con categoría inexistente devuelve 400', async () => {
  const cat = mockRes();
  await createCategory({ body: { name: 'Almacén' } }, cat);
  const prod = mockRes();
  await createProductCompat(
    { body: { name: 'Yerba', sku: 'YER-4', category: 'Almacén', price: 100 } },
    prod,
  );
  const upd = mockRes();
  await updateProductCompat({ params: { id: String(prod.body.id) }, body: { category: 'Inexistente' } }, upd);
  assert.equal(upd.statusCode, 400);
});
