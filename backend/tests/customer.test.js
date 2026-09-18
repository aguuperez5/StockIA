import { test, before, after, beforeEach } from 'node:test';
import assert from 'node:assert/strict';
import prisma from '../config/prisma.js';
import { resetDb, createProduct, createDeposit } from './helpers.js';
import { listCustomers, createCustomer, updateCustomer, deleteCustomer, customerDetail, createSaleCompat, getSale, listSales } from '../controllers/integration.controller.js';

function mockRes() {
  return {
    statusCode: 200,
    body: undefined,
    status(code) { this.statusCode = code; return this; },
    json(payload) { this.body = payload; return this; }
  };
}
const adminReq = (body) => ({ body, user: { id: 1 } });

before(async () => { await resetDb(); });
beforeEach(async () => { await resetDb(); });
after(async () => { await prisma.$disconnect(); });

test('ABM clientes: alta, edición y detalle', async () => {
  const created = mockRes();
  await createCustomer(adminReq({ name: 'Ana', contact: 'telegram:@ana', email: 'ana@x.com', phone: null }), created);
  assert.equal(created.statusCode, 201);

  const updated = mockRes();
  await updateCustomer({ params: { id: String(created.body.id) }, body: { name: 'Ana Gómez', contact: 'telegram:@ana' } }, updated);
  assert.equal(updated.statusCode, 200);

  const detail = mockRes();
  await customerDetail({ params: { id: String(created.body.id) } }, detail);
  assert.equal(detail.body.customer.name, 'Ana Gómez');

  const listed = mockRes();
  await listCustomers({ query: { search: 'gómez' } }, listed);
  assert.equal(listed.body.items.length, 1);
});

test('editar cliente sin datos obligatorios devuelve 400 y si no existe 404', async () => {
  const bad = mockRes();
  await updateCustomer({ params: { id: '1' }, body: { name: '', contact: '' } }, bad);
  assert.equal(bad.statusCode, 400);

  const missing = mockRes();
  await updateCustomer({ params: { id: '999999' }, body: { name: 'X', contact: 'Y' } }, missing);
  assert.equal(missing.statusCode, 404);
});

test('elimina un cliente sin ventas y desaparece del listado', async () => {
  const created = mockRes();
  await createCustomer(adminReq({ name: 'Borrable', contact: 'c' }), created);

  const del = mockRes();
  await deleteCustomer({ params: { id: String(created.body.id) } }, del);
  assert.equal(del.statusCode, 200);
  assert.equal(await prisma.customer.findUnique({ where: { id: created.body.id } }), null);
});

async function seedSeller() {
  return prisma.user.create({ data: { name: 'Vendedor Test', email: `vend-${Date.now()}-${Math.random()}@t.com`, password: 'x', role: 'USER' } });
}

test('no elimina un cliente con ventas asociadas', async () => {
  const seller = await seedSeller();
  const created = mockRes();
  await createCustomer(adminReq({ name: 'Comprador', contact: 'c' }), created);
  const deposit = await createDeposit();
  const product = await createProduct({ code: 'CLI-1', price: 100 });
  await prisma.stock.create({ data: { productId: product.id, depositId: deposit.id, quantity: 10 } });

  const sale = mockRes();
  await createSaleCompat({ body: { items: [{ productId: product.id, warehouseId: deposit.id, quantity: 1 }], customerId: created.body.id }, user: { id: seller.id } }, sale);
  assert.equal(sale.statusCode, 201);

  const del = mockRes();
  await deleteCustomer({ params: { id: String(created.body.id) } }, del);
  assert.equal(del.statusCode, 400);

  const gone = mockRes();
  await deleteCustomer({ params: { id: '999999' } }, gone);
  assert.equal(gone.statusCode, 404);
});

test('el ticket y el historial muestran a quién se vendió', async () => {
  const seller = await seedSeller();
  const created = mockRes();
  await createCustomer(adminReq({ name: 'Ticket Cli', contact: 't' }), created);
  const deposit = await createDeposit();
  const product = await createProduct({ code: 'CLI-2', price: 50 });
  await prisma.stock.create({ data: { productId: product.id, depositId: deposit.id, quantity: 10 } });

  const sale = mockRes();
  await createSaleCompat({ body: { items: [{ productId: product.id, warehouseId: deposit.id, quantity: 2 }], customerId: created.body.id }, user: { id: seller.id } }, sale);
  const saleId = sale.body.sale.id;

  const ticket = mockRes();
  await getSale({ params: { id: String(saleId) } }, ticket);
  assert.equal(ticket.body.sale.customer?.name, 'Ticket Cli');

  const noCustomer = mockRes();
  await createSaleCompat({ body: { items: [{ productId: product.id, warehouseId: deposit.id, quantity: 1 }] }, user: { id: seller.id } }, mockRes());
  const history = mockRes();
  await listSales({ query: {} }, history);
  const withCustomer = history.body.items.find((s) => s.id === saleId);
  assert.equal(withCustomer.customerName, 'Ticket Cli');
  assert.ok(history.body.items.some((s) => s.customerName === null));
});

test('rechaza cliente con email o teléfono de formato inválido', async () => {
  const badEmail = mockRes();
  await createCustomer(adminReq({ name: 'Carlos', contact: 'tel', email: 'carlos-sin-dominio-valido' }), badEmail);
  assert.equal(badEmail.statusCode, 400);

  const badPhone = mockRes();
  await createCustomer(adminReq({ name: 'Carlos', contact: 'tel', phone: 'telefono-invalido' }), badPhone);
  assert.equal(badPhone.statusCode, 400);

  const shortPhone = mockRes();
  await createCustomer(adminReq({ name: 'Carlos', contact: 'tel', phone: '123' }), shortPhone);
  assert.equal(shortPhone.statusCode, 400);

  const good = mockRes();
  await createCustomer(adminReq({ name: 'Carlos', contact: 'tel', email: 'carlos@gmail.com', phone: '+54 9 11 4444-5555' }), good);
  assert.equal(good.statusCode, 201);
});
