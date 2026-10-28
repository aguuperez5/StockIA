import { test, before, after, beforeEach } from 'node:test';
import assert from 'node:assert/strict';
import prisma from '../config/prisma.js';
import { resetDb, createProduct, createDeposit } from './helpers.js';
import {
  listTelegram,
  getTelegram,
  createTelegram,
  updateTelegramFull,
  updateTelegram,
  duplicateTelegram,
  broadcastTelegram,
  deleteTelegram,
  previewTelegram,
  suggestTelegram,
} from '../controllers/integration.controller.js';
import {
  canTransition,
  isValidStatus,
  normalizeOfferInput,
  validateOfferShape,
  buildPersonalizedMessage,
  normalizeWhatsAppPhone,
  buildWaMeLink,
  isExpired,
  offerSavings,
} from '../services/telegram-offer.service.js';

function mockRes() {
  return {
    statusCode: 200,
    body: undefined,
    status(code) { this.statusCode = code; return this; },
    json(payload) { this.body = payload; return this; },
  };
}
const seller = (id) => ({ user: { id } });

let userId;
async function seedUser() {
  const u = await prisma.user.create({
    data: { name: 'Ofertas Test', email: `ofertas-${Date.now()}-${Math.random()}@t.com`, password: 'x', role: 'USER' },
  });
  return u.id;
}
async function seedProductWithStock(code, price, qty) {
  const dep = await prisma.deposit.findFirst() || await createDeposit();
  const p = await createProduct({ code, price, name: `Prod ${code}` });
  await prisma.stock.upsert({
    where: { productId_depositId: { productId: p.id, depositId: dep.id } },
    create: { productId: p.id, depositId: dep.id, quantity: qty },
    update: { quantity: qty },
  });
  return p;
}
async function seedCustomer(name = 'Cliente Oferta') {
  return prisma.customer.create({ data: { name, contact: 'telegram:@test' } });
}
function validBody(p, c) {
  return {
    title: 'Oferta de la semana',
    message: 'Aprovechá esta oferta especial con {{descuento}} en {{productos}}. {{vigencia}}',
    items: [{ productId: p.id }],
    customerIds: c ? [c.id] : [],
    status: 'Borrador',
  };
}

before(async () => { await resetDb(); });
beforeEach(async () => { await resetDb(); userId = await seedUser(); });
after(async () => { await prisma.$disconnect(); });

// ─── Lógica pura ───
test('máquina de estados: transiciones válidas e inválidas', () => {
  assert.ok(isValidStatus('Borrador'));
  assert.ok(!isValidStatus('Inexistente'));
  assert.ok(canTransition('Borrador', 'Lista para enviar'));
  assert.ok(canTransition('Lista para enviar', 'Enviada'));
  assert.ok(canTransition('Enviada', 'Archivada'));
  assert.ok(canTransition('Archivada', 'Borrador'));
  assert.ok(canTransition('Cancelada', 'Borrador'));
  assert.ok(!canTransition('Borrador', 'Enviada'));
  assert.ok(!canTransition('Enviada', 'Borrador'));
  assert.ok(!canTransition('Archivada', 'Enviada'));
});

test('normaliza formato legacy productIds y deriva título', () => {
  const n = normalizeOfferInput({ message: 'Oferta imperdible de la semana para todos', productIds: [1, 2, 2], customerIds: [] });
  assert.equal(n.items.length, 2);
  assert.ok(n.title.length >= 3);
  assert.deepEqual(n.customerIds, []);
});

test('valida forma: título, mensaje, productos y descuento', () => {
  const bad = validateOfferShape({ title: 'ab', message: 'hola', items: [], customerIds: [], discountPercent: 99, status: 'Borrador' });
  assert.ok(bad.errors.length >= 3);
  const ok = validateOfferShape({ title: 'Oferta válida', message: 'Mensaje suficientemente largo para la campaña', items: [{ productId: 1, offerPrice: null }], customerIds: [], discountPercent: 20, status: 'Borrador' });
  assert.deepEqual(ok.errors, []);
});

test('mensaje personalizado resuelve placeholders y adjunta productos si faltan placeholders', () => {
  const text = buildPersonalizedMessage({
    baseMessage: 'Hola {{nombre}}, {{productos}} con {{descuento}}. {{vigencia}}',
    customerName: 'Ana',
    products: [{ id: 1, name: 'Yerba', price: 1000 }],
    items: [{ productId: 1, offerPrice: 800 }],
    discountPercent: 20,
    validUntil: '2026-12-31',
  });
  assert.ok(text.includes('Ana'));
  assert.ok(text.includes('Yerba'));
  assert.ok(text.includes('800') || text.includes('$'));

  // Si solo usa {{nombre}} sin {{productos}} ni {{vigencia}}, debe anexarlos al final
  const partial = buildPersonalizedMessage({
    baseMessage: 'Hola {{nombre}}, tenemos precios especiales hoy.',
    customerName: 'Carlos',
    products: [{ id: 1, name: 'Café', price: 2000 }],
    items: [{ productId: 1, offerPrice: null }],
    discountPercent: 15,
    validUntil: '2026-12-31',
  });
  assert.ok(partial.includes('Carlos'));
  assert.ok(partial.includes('Café'));
  assert.ok(partial.includes('Válido hasta'));
});

test('isExpired respeta zona horaria local y offerSavings calcula con discountPercent global', () => {
  const now = new Date();
  const todayIso = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
  assert.equal(isExpired(todayIso), false);
  assert.equal(isExpired('2020-01-01'), true);

  const map = new Map([[1, { id: 1, price: 1000 }], [2, { id: 2, price: 2000 }]]);
  const totals = offerSavings(
    [{ productId: 1, offerPrice: null }, { productId: 2, offerPrice: 1500 }],
    map,
    20,
  );
  // Producto 1 ahorra 20% de 1000 = 200; Producto 2 ahorra 2000 - 1500 = 500 -> Total 700
  assert.deepEqual(totals, { base: 3000, offer: 2300, savings: 700 });

  assert.equal(normalizeWhatsAppPhone('+54 341 555-0182'), '543415550182');
  assert.equal(normalizeWhatsAppPhone('3415550182'), '5493415550182');
  assert.equal(
    buildWaMeLink('+54 341 555-0182', 'Hola Laura, oferta especial'),
    'https://wa.me/543415550182?text=Hola%20Laura%2C%20oferta%20especial',
  );
  assert.equal(
    buildWaMeLink('', 'Oferta general'),
    'https://api.whatsapp.com/send?text=Oferta%20general',
  );
});

// ─── CRUD ───
test('CRUD: crea, lee, edita, avanza estado, duplica y elimina un borrador', async () => {
  const p = await seedProductWithStock('OF-1', 1000, 10);
  const c = await seedCustomer();

  const created = mockRes();
  await createTelegram({ body: validBody(p, c), ...seller(userId) }, created);
  assert.equal(created.statusCode, 201);
  const id = created.body.id;

  const got = mockRes();
  await getTelegram({ params: { id: String(id) } }, got);
  assert.equal(got.body.offer.title, 'Oferta de la semana');
  assert.equal(got.body.offer.items.length, 1);
  assert.equal(got.body.offer.canEdit, true);

  const edited = mockRes();
  await updateTelegramFull({ params: { id: String(id) }, body: { ...validBody(p, c), title: 'Oferta editada', discountPercent: 15 } }, edited);
  assert.equal(edited.statusCode, 200);
  assert.equal(edited.body.item.discountPercent, 15);

  const toList = mockRes();
  await updateTelegram({ params: { id: String(id) }, body: { status: 'Lista para enviar' } }, toList);
  assert.equal(toList.statusCode, 200);

  const toSent = mockRes();
  await updateTelegram({ params: { id: String(id) }, body: { status: 'Enviada' } }, toSent);
  assert.equal(toSent.statusCode, 200);
  assert.ok(toSent.body.item.sentAt);

  // Enviada no se edita ni se elimina.
  const editSent = mockRes();
  await updateTelegramFull({ params: { id: String(id) }, body: { ...validBody(p, c), title: 'Intento' } }, editSent);
  assert.equal(editSent.statusCode, 409);
  const delSent = mockRes();
  await deleteTelegram({ params: { id: String(id) } }, delSent);
  assert.equal(delSent.statusCode, 409);

  const dup = mockRes();
  await duplicateTelegram({ params: { id: String(id) }, ...seller(userId) }, dup);
  assert.equal(dup.statusCode, 201);
  assert.equal(dup.body.item.status, 'Borrador');

  const del = mockRes();
  await deleteTelegram({ params: { id: String(dup.body.id) } }, del);
  assert.equal(del.statusCode, 200);
});

test('rechaza crear sin productos o con producto inexistente/inactivo', async () => {
  const p = await seedProductWithStock('OF-2', 500, 5);
  const noItems = mockRes();
  await createTelegram({ body: { title: 'Sin productos', message: 'Mensaje largo suficiente para validar la oferta', items: [], status: 'Borrador' }, ...seller(userId) }, noItems);
  assert.equal(noItems.statusCode, 400);

  const missing = mockRes();
  await createTelegram({ body: { title: 'Oferta rota', message: 'Mensaje largo suficiente para validar la oferta', items: [{ productId: 999999 }], status: 'Borrador' }, ...seller(userId) }, missing);
  assert.equal(missing.statusCode, 400);

  await prisma.product.update({ where: { id: p.id }, data: { active: false } });
  const inactive = mockRes();
  await createTelegram({ body: { title: 'Oferta inactiva', message: 'Mensaje largo suficiente para validar la oferta', items: [{ productId: p.id }], status: 'Borrador' }, ...seller(userId) }, inactive);
  assert.equal(inactive.statusCode, 400);
});

test('rechaza precio de oferta mayor o igual al base', async () => {
  const p = await seedProductWithStock('OF-3', 1000, 5);
  const res = mockRes();
  await createTelegram({ body: { title: 'Oferta cara', message: 'Mensaje largo suficiente para validar la oferta', items: [{ productId: p.id, offerPrice: 1200 }], status: 'Borrador' }, ...seller(userId) }, res);
  assert.equal(res.statusCode, 400);
});

test('no lista para enviar sin stock ni con vigencia vencida', async () => {
  const p = await seedProductWithStock('OF-4', 700, 0);
  const created = mockRes();
  await createTelegram({ body: validBody(p, null), ...seller(userId) }, created);
  assert.equal(created.statusCode, 201);
  const id = created.body.id;

  const toList = mockRes();
  await updateTelegram({ params: { id: String(id) }, body: { status: 'Lista para enviar' } }, toList);
  assert.equal(toList.statusCode, 400);

  // Con stock sí avanza; luego se vence y no se puede enviar.
  await prisma.stock.updateMany({ where: { productId: p.id }, data: { quantity: 5 } });
  const okList = mockRes();
  await updateTelegram({ params: { id: String(id) }, body: { status: 'Lista para enviar' } }, okList);
  assert.equal(okList.statusCode, 200);
  await prisma.telegramOffer.update({ where: { id }, data: { validUntil: new Date('2020-01-01') } });
  const toSent = mockRes();
  await updateTelegram({ params: { id: String(id) }, body: { status: 'Enviada' } }, toSent);
  assert.equal(toSent.statusCode, 400);
});

test('transición inválida Borrador → Enviada devuelve 409', async () => {
  const p = await seedProductWithStock('OF-5', 300, 5);
  const created = mockRes();
  await createTelegram({ body: validBody(p, null), ...seller(userId) }, created);
  const jump = mockRes();
  await updateTelegram({ params: { id: String(created.body.id) }, body: { status: 'Enviada' } }, jump);
  assert.equal(jump.statusCode, 409);
});

test('compatibilidad legacy: crear solo con message + productIds', async () => {
  const p = await seedProductWithStock('OF-6', 900, 4);
  const res = mockRes();
  await createTelegram({ body: { message: 'Oferta legacy de la semana con descuento', productIds: [p.id], customerIds: [], status: 'Lista para enviar' }, ...seller(userId) }, res);
  assert.equal(res.statusCode, 201);
  assert.ok(res.body.id);
});

test('lista con filtros por estado y búsqueda', async () => {
  const p = await seedProductWithStock('OF-7', 400, 6);
  const a = mockRes();
  await createTelegram({ body: { ...validBody(p, null), title: 'Yerba en oferta', status: 'Borrador' }, ...seller(userId) }, a);
  const b = mockRes();
  await createTelegram({ body: { ...validBody(p, null), title: 'Azúcar en oferta', status: 'Borrador' }, ...seller(userId) }, b);
  await updateTelegram({ params: { id: String(b.body.id) }, body: { status: 'Lista para enviar' } }, mockRes());

  const byStatus = mockRes();
  await listTelegram({ query: { status: 'Lista para enviar', search: '' } }, byStatus);
  assert.equal(byStatus.body.items.length, 1);

  const bySearch = mockRes();
  await listTelegram({ query: { status: '', search: 'yerba' } }, bySearch);
  assert.equal(bySearch.body.items.length, 1);
  assert.match(bySearch.body.items[0].title.toLowerCase(), /yerba/);
});

test('difusión: desde Borrador envía a todos y limpia destinatarios', async () => {
  const p = await seedProductWithStock('OF-B1', 500, 8);
  const c = await seedCustomer('Con Destino');
  const created = mockRes();
  await createTelegram({ body: { ...validBody(p, c), status: 'Borrador' }, ...seller(userId) }, created);
  assert.equal(created.statusCode, 201);

  const bc = mockRes();
  await broadcastTelegram({ params: { id: String(created.body.id) } }, bc);
  assert.equal(bc.statusCode, 200);
  assert.equal(bc.body.item.status, 'Enviada');
  assert.deepEqual(bc.body.item.customerIds, []);
  assert.ok(bc.body.item.sentAt);

  const stored = await prisma.telegramOffer.findUnique({ where: { id: created.body.id } });
  assert.deepEqual(stored.customerIds, []);
  assert.equal(stored.status, 'Enviada');
});

test('difusión: desde Lista funciona; Enviada o Archivada devuelven 409', async () => {
  const p = await seedProductWithStock('OF-B2', 500, 8);
  const created = mockRes();
  await createTelegram({ body: validBody(p, null), ...seller(userId) }, created);
  const id = created.body.id;
  await updateTelegram({ params: { id: String(id) }, body: { status: 'Lista para enviar' } }, mockRes());

  const bc = mockRes();
  await broadcastTelegram({ params: { id: String(id) } }, bc);
  assert.equal(bc.statusCode, 200);

  const again = mockRes();
  await broadcastTelegram({ params: { id: String(id) } }, again);
  assert.equal(again.statusCode, 409);

  await updateTelegram({ params: { id: String(id) }, body: { status: 'Archivada' } }, mockRes());
  const arch = mockRes();
  await broadcastTelegram({ params: { id: String(id) } }, arch);
  assert.equal(arch.statusCode, 409);
});

test('difusión bloqueada sin stock, vencida o inexistente', async () => {
  const p = await seedProductWithStock('OF-B3', 500, 0);
  const created = mockRes();
  await createTelegram({ body: validBody(p, null), ...seller(userId) }, created);

  const noStock = mockRes();
  await broadcastTelegram({ params: { id: String(created.body.id) } }, noStock);
  assert.equal(noStock.statusCode, 400);

  await prisma.stock.updateMany({ where: { productId: p.id }, data: { quantity: 5 } });
  await prisma.telegramOffer.update({ where: { id: created.body.id }, data: { validUntil: new Date('2020-01-01') } });
  const expired = mockRes();
  await broadcastTelegram({ params: { id: String(created.body.id) } }, expired);
  assert.equal(expired.statusCode, 400);

  const missing = mockRes();
  await broadcastTelegram({ params: { id: '999999' } }, missing);
  assert.equal(missing.statusCode, 404);
});

test('preview personaliza por cliente y suggest usa historial', async () => {
  const dep = await prisma.deposit.findFirst() || await createDeposit();
  const p = await seedProductWithStock('OF-8', 1200, 10);
  const c = await seedCustomer('Ana Gómez');
  // Historial: Ana compró 3 unidades.
  await prisma.stock.updateMany({ where: { productId: p.id }, data: { quantity: 20 } });
  const sale = await prisma.sale.create({ data: { depositId: dep.id, customerId: c.id, userId, total: 3600, items: { create: [{ productId: p.id, quantity: 3, price: 1200 }] } } });
  assert.ok(sale.id);

  const created = mockRes();
  await createTelegram({ body: { ...validBody(p, c), message: 'Hola {{nombre}}, mirá {{productos}} con {{descuento}}. {{vigencia}}' }, ...seller(userId) }, created);
  const prev = mockRes();
  await previewTelegram({ params: { id: String(created.body.id) }, query: { customerId: String(c.id) } }, prev);
  assert.ok(prev.body.preview.includes('Ana'));
  assert.ok(prev.body.preview.includes('OF-8') || prev.body.preview.toLowerCase().includes('prod'));

  const sug = mockRes();
  await suggestTelegram({ query: { customerId: String(c.id) } }, sug);
  assert.ok(sug.body.items.length >= 1);
  assert.ok(sug.body.message.length > 10);
});
