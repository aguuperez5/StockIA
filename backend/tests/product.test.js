import { test, before, after, beforeEach } from 'node:test';
import assert from 'node:assert/strict';
import prisma from '../config/prisma.js';
import { resetDb, createProduct } from './helpers.js';

before(async () => {
  await resetDb();
});

beforeEach(async () => {
  await resetDb();
});

after(async () => {
  await prisma.$disconnect();
});

// Caso 1: Crear producto válido
test('crea un producto válido', async () => {
  const product = await createProduct({ name: 'Válvula', code: 'VAL-001', price: 150.5, category: 'Válvulas' });
  assert.equal(product.name, 'Válvula');
  assert.equal(product.code, 'VAL-001');
  assert.equal(Number(product.price), 150.5);
  assert.equal(product.active, true);
});

// Caso 2: Intentar crear producto con código duplicado
test('rechaza código (SKU) duplicado', async () => {
  await createProduct({ code: 'DUP-001' });
  await assert.rejects(() => createProduct({ code: 'DUP-001' }));
});

// Caso 3: Modificar producto existente
test('modifica un producto existente', async () => {
  const product = await createProduct({ price: 100 });
  const updated = await prisma.product.update({
    where: { id: product.id },
    data: { price: 200 }
  });
  assert.equal(Number(updated.price), 200);
});

// Caso 4: Consultar producto inexistente
test('consultar producto inexistente devuelve null', async () => {
  const product = await prisma.product.findUnique({ where: { id: 999999 } });
  assert.equal(product, null);
});

// Caso 5: Validar campos obligatorios (name, code, price)
test('rechaza producto sin campos obligatorios', async () => {
  await assert.rejects(() =>
    prisma.product.create({ data: { category: 'Sin nombre ni code ni price' } })
  );
});

// Caso 6: Persistencia después de "reiniciar la aplicación"
// (se simula reconectando el cliente Prisma y releyendo el dato)
test('el producto persiste tras reconectar el cliente', async () => {
  const product = await createProduct({ code: 'PERSIST-001' });
  await prisma.$disconnect();
  const found = await prisma.product.findUnique({ where: { id: product.id } });
  assert.ok(found);
  assert.equal(found.code, 'PERSIST-001');
});
