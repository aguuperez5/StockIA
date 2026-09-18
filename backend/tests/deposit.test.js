import { test, before, after, beforeEach } from 'node:test';
import assert from 'node:assert/strict';
import prisma from '../config/prisma.js';
import { resetDb, createProduct, createDeposit } from './helpers.js';
import { createDeposit as createDepositHandler, updateDeposit, getStockByDeposit } from '../controllers/deposit.controller.js';
import { createWarehouse, updateWarehouse, deleteWarehouse } from '../controllers/integration.controller.js';

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

test('crea un depósito válido', async () => {
  const res = mockRes();
  await createDepositHandler({ body: { name: 'Depósito Test', location: 'Ruta 1' } }, res);
  assert.equal(res.statusCode, 201);
  assert.equal(res.body.deposit.name, 'Depósito Test');
});

test('rechaza depósito sin nombre', async () => {
  const res = mockRes();
  await createDepositHandler({ body: { location: 'Sin nombre' } }, res);
  assert.equal(res.statusCode, 400);
});

test('ignora campos no soportados en el alta (no hace mass-assignment)', async () => {
  const res = mockRes();
  await createDepositHandler({ body: { name: 'Depósito X', extraField: 'no debería guardarse' } }, res);
  assert.equal(res.statusCode, 201);
  assert.equal(res.body.deposit.extraField, undefined);
});

test('consulta stock de un depósito existente, incluye datos del producto', async () => {
  const deposit = await createDeposit();
  const product = await createProduct({ code: 'DEP-STOCK-1' });
  await prisma.stock.create({ data: { productId: product.id, depositId: deposit.id, quantity: 25 } });

  const res = mockRes();
  await getStockByDeposit({ params: { id: String(deposit.id) } }, res);

  assert.equal(res.statusCode, 200);
  assert.equal(res.body.deposit.id, deposit.id);
  assert.equal(res.body.stock.length, 1);
  assert.equal(res.body.stock[0].quantity, 25);
  assert.equal(res.body.stock[0].product.code, 'DEP-STOCK-1');
});

test('consultar stock de un depósito inexistente devuelve 404', async () => {
  const res = mockRes();
  await getStockByDeposit({ params: { id: '999999' } }, res);
  assert.equal(res.statusCode, 404);
});

test('id de depósito inválido devuelve 400', async () => {
  const res = mockRes();
  await getStockByDeposit({ params: { id: 'no-es-un-numero' } }, res);
  assert.equal(res.statusCode, 400);
});

// HU-05 CA-02: sin nombres de depósito duplicados.
test('rechaza depósito con nombre duplicado (409)', async () => {
  const first = mockRes();
  await createDepositHandler({ body: { name: 'Central Único' } }, first);
  assert.equal(first.statusCode, 201);

  const second = mockRes();
  await createDepositHandler({ body: { name: 'Central Único' } }, second);
  assert.equal(second.statusCode, 409);
});

test('rechaza duplicado insensible a mayúsculas', async () => {
  const first = mockRes();
  await createDepositHandler({ body: { name: 'Depósito Sur' } }, first);
  assert.equal(first.statusCode, 201);

  const second = mockRes();
  await createDepositHandler({ body: { name: 'depósito sur' } }, second);
  assert.equal(second.statusCode, 409);
});

test('editar un depósito al nombre de otro devuelve 409', async () => {
  const a = await createDeposit({ name: 'Depósito A' });
  const b = await createDeposit({ name: 'Depósito B' });

  const res = mockRes();
  await updateDeposit({ params: { id: String(b.id) }, body: { name: 'Depósito A' } }, res);
  assert.equal(res.statusCode, 409);

  const ok = mockRes();
  await updateDeposit({ params: { id: String(b.id) }, body: { name: 'Depósito B' } }, ok);
  assert.equal(ok.statusCode, 200);
});

test('el endpoint integrado también rechaza nombres duplicados', async () => {
  const first = mockRes();
  await createWarehouse({ body: { name: 'Norte Único', address: 'Calle 1', manager: 'Jefe' } }, first);
  assert.equal(first.statusCode, 201);

  const second = mockRes();
  await createWarehouse({ body: { name: 'norte único', address: 'Calle 2', manager: 'Otro' } }, second);
  assert.equal(second.statusCode, 409);
});

test('editar un depósito por el endpoint integrado', async () => {
  const created = mockRes();
  await createWarehouse({ body: { name: 'Editable', address: 'Calle 1', manager: 'Jefe' } }, created);
  assert.equal(created.statusCode, 201);

  const ok = mockRes();
  await updateWarehouse({ params: { id: String(created.body.id) }, body: { name: 'Editado', type: 'Sucursal', address: 'Calle 9', manager: 'Otra' } }, ok);
  assert.equal(ok.statusCode, 200);

  const stored = await prisma.deposit.findUnique({ where: { id: created.body.id } });
  assert.equal(stored.name, 'Editado');
  assert.equal(stored.manager, 'Otra');
});

test('editar al nombre de otro depósito devuelve 409 y uno inexistente 404', async () => {
  const a = mockRes();
  await createWarehouse({ body: { name: 'Dep A', address: 'X', manager: 'Y' } }, a);
  const b = mockRes();
  await createWarehouse({ body: { name: 'Dep B', address: 'X', manager: 'Y' } }, b);

  const dup = mockRes();
  await updateWarehouse({ params: { id: String(b.body.id) }, body: { name: 'dep a', address: 'X', manager: 'Y' } }, dup);
  assert.equal(dup.statusCode, 409);

  const missing = mockRes();
  await updateWarehouse({ params: { id: '999999' }, body: { name: 'Z', address: 'X', manager: 'Y' } }, missing);
  assert.equal(missing.statusCode, 404);
});

test('eliminar un depósito vacío sin operaciones históricas tiene éxito', async () => {
  const created = mockRes();
  await createWarehouse({ body: { name: 'Para Borrar', address: 'Calle 10', manager: 'Admin' } }, created);
  assert.equal(created.statusCode, 201);
  const depId = created.body.id;

  // Registrar un producto que genera stock 0
  const product = await createProduct({ code: 'PROD-BORRAR' });
  await prisma.stock.create({ data: { productId: product.id, depositId: depId, quantity: 0 } });

  const del = mockRes();
  await deleteWarehouse({ params: { id: String(depId) } }, del);
  assert.equal(del.statusCode, 200);

  const exists = await prisma.deposit.findUnique({ where: { id: depId } });
  assert.equal(exists, null);
});

test('eliminar un depósito con stock existente devuelve 409', async () => {
  const dep = await createDeposit({ name: 'Con Stock' });
  const product = await createProduct({ code: 'PROD-CON-STOCK' });
  await prisma.stock.create({ data: { productId: product.id, depositId: dep.id, quantity: 10 } });

  const del = mockRes();
  await deleteWarehouse({ params: { id: String(dep.id) } }, del);
  assert.equal(del.statusCode, 409);
  assert.match(del.body.message, /posee 10 unidad\(es\) en stock/);
});

test('eliminar un depósito con ventas asociadas devuelve 409', async () => {
  const dep = await createDeposit({ name: 'Con Ventas' });
  await prisma.sale.create({
    data: {
      depositId: dep.id,
      total: 500,
      items: { create: [] }
    }
  });

  const del = mockRes();
  await deleteWarehouse({ params: { id: String(dep.id) } }, del);
  assert.equal(del.statusCode, 409);
  assert.match(del.body.message, /ventas o transferencias históricas/);
});
