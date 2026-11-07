import prisma from '../config/prisma.js';
import bcrypt from 'bcryptjs';
import { getNextAvailableAprilTagId } from '../services/apriltag.service.js';

// Deposit no tiene una clave de negocio única en el schema (dos depósitos
// podrían compartir nombre); para un seed idempotente alcanza con
// buscar-o-crear por nombre.
async function findOrCreateDeposit(client, name, location) {
  const existing = await client.deposit.findFirst({ where: { name } });
  if (existing) return existing;
  return client.deposit.create({ data: { name, location, address: location, type: name.includes('Norte') ? 'Sucursal' : 'Principal', manager: 'Admin StockIA', capacity: name.includes('Central') ? 500 : 220 } });
}

async function findOrCreateCustomer(client, data) {
  const existing = await client.customer.findFirst({ where: { email: data.email } });
  if (existing) return existing;
  return client.customer.create({ data });
}

async function findOrCreateStock(client, productId, depositId, quantity) {
  const existing = await client.stock.findUnique({ where: { productId_depositId: { productId, depositId } } });
  if (existing) return existing;
  return client.stock.create({ data: { productId, depositId, quantity } });
}

async function findOrCreateProduct(client, { code, name, category, price, lowStockThreshold = 5 }) {
  const existing = await client.product.findUnique({ where: { code } });
  if (existing) {
    if (existing.apriltagId === null) {
      const nextId = await getNextAvailableAprilTagId(client);
      return client.product.update({ where: { id: existing.id }, data: { apriltagId: nextId } });
    }
    return existing;
  }
  const nextId = await getNextAvailableAprilTagId(client);
  return client.product.create({
    data: { name, code, category, price, lowStockThreshold, apriltagId: nextId }
  });
}

async function main() {
  const password = await bcrypt.hash('test1234', 10);
  const admin = await prisma.user.upsert({
    where: { email: 'admin@stockia.dev' },
    update: { appRole: 'administrador', role: 'ADMIN' },
    create: { name: 'Admin StockIA', email: 'admin@stockia.dev', password, role: 'ADMIN', appRole: 'administrador' }
  });
  await prisma.user.upsert({
    where: { email: 'josesitosereno@gmail.com' },
    update: { appRole: 'administrador', role: 'ADMIN' },
    create: { name: 'Facundo Sereno', legajo: '12345', email: 'josesitosereno@gmail.com', password, role: 'ADMIN', appRole: 'administrador' }
  });

  // Catálogo cerrado de categorías: evita cargar lo mismo escrito de
  // distintas maneras ("Almacen" vs "Almacén"). Se gestiona en Configuración.
  const defaultCategories = [
    'Almacén',
    'Bebidas',
    'Limpieza',
    'Hogar',
    'Ferretería',
    'Electrónica',
    'Indumentaria',
    'Salud y Cuidado',
    'Mascotas',
    'Otros',
  ];
  for (const name of defaultCategories) {
    await prisma.category.upsert({ where: { name }, update: {}, create: { name } });
  }

  // Depósito principal del sistema
  const central = await findOrCreateDeposit(prisma, 'Depósito Central', 'Sede principal');

  /*
  // =========================================================================
  // DATOS DEMO (Comentados para inicializar cuentas/base de datos limpias)
  // Descomentar si se desean cargar productos, sucursales y ventas de prueba.
  // =========================================================================

  const norte = await findOrCreateDeposit(prisma, 'Depósito Norte', 'Sucursal Norte');
  const sur = await findOrCreateDeposit(prisma, 'Depósito Sur', 'Av. Independencia 1840, Rosario');
  await prisma.deposit.update({ where: { id: sur.id }, data: { type: 'Sucursal', manager: 'Mariana López', capacity: 180 } });

  const valvula = await findOrCreateProduct(prisma, { name: 'Válvula Industrial 2"', code: 'VAL-20E-ST', category: 'Válvulas', price: 1500.0 });
  const tornillo = await findOrCreateProduct(prisma, { name: 'Tornillo M8 (caja x100)', code: 'TOR-08M-CX', category: 'Ferretería', price: 3200.0 });

  // Precio por cantidad para el tornillo: 1 caja precio normal, 6+ cajas con descuento.
  await prisma.priceRule.upsert({
    where: { productId_minQuantity: { productId: tornillo.id, minQuantity: 6 } },
    update: {},
    create: { productId: tornillo.id, minQuantity: 6, price: 2900.0 }
  });

  await prisma.stock.upsert({
    where: { productId_depositId: { productId: valvula.id, depositId: central.id } },
    update: { quantity: 120 },
    create: { productId: valvula.id, depositId: central.id, quantity: 120 }
  });
  await prisma.stock.upsert({
    where: { productId_depositId: { productId: valvula.id, depositId: norte.id } },
    update: { quantity: 35 },
    create: { productId: valvula.id, depositId: norte.id, quantity: 35 }
  });
  await prisma.stock.upsert({
    where: { productId_depositId: { productId: tornillo.id, depositId: central.id } },
    update: { quantity: 50 },
    create: { productId: tornillo.id, depositId: central.id, quantity: 50 }
  });

  const demoList = [
    { name: 'Café molido demo', code: 'DEMO-CAF-001', category: 'Almacén', price: 2800, lowStockThreshold: 8 },
    { name: 'Yerba mate demo', code: 'DEMO-YER-001', category: 'Almacén', price: 3600, lowStockThreshold: 8 },
    { name: 'Aceite demo', code: 'DEMO-ACE-001', category: 'Almacén', price: 2100, lowStockThreshold: 6 },
    { name: 'Galletitas avena y miel', code: 'DEMO-GAL-001', category: 'Almacén', price: 1750, lowStockThreshold: 10 },
    { name: 'Detergente concentrado 750 ml', code: 'DEMO-DET-001', category: 'Limpieza', price: 2450, lowStockThreshold: 7 },
    { name: 'Lámpara LED 12W', code: 'DEMO-LAM-001', category: 'Hogar', price: 3900, lowStockThreshold: 5 },
  ];
  const demoProducts = [];
  for (const item of demoList) {
    demoProducts.push(await findOrCreateProduct(prisma, item));
  }
  // Sincroniza categorías históricas (ej. "Válvulas") al catálogo cerrado.
  const usedCategories = await prisma.product.findMany({
    select: { category: true },
    distinct: ['category'],
  });
  for (const row of usedCategories) {
    const name = String(row.category ?? '').trim().replace(/\s+/g, ' ');
    if (name) await prisma.category.upsert({ where: { name }, update: {}, create: { name } });
  }
  const stockPlan = [
    [demoProducts[0], central, 42], [demoProducts[0], norte, 16], [demoProducts[0], sur, 9],
    [demoProducts[1], central, 34], [demoProducts[1], norte, 12],
    [demoProducts[2], central, 28], [demoProducts[2], sur, 8],
    [demoProducts[3], central, 51], [demoProducts[3], sur, 14],
    [demoProducts[4], central, 19], [demoProducts[4], norte, 11],
    [demoProducts[5], central, 23], [demoProducts[5], norte, 7],
  ];
  for (const [product, deposit, quantity] of stockPlan) await findOrCreateStock(prisma, product.id, deposit.id, quantity);

  const customers = await Promise.all([
    findOrCreateCustomer(prisma, { name: 'Comercial El Roble', contact: 'Laura Méndez', email: 'demo.elroble@stockia.dev', phone: '+54 341 555-0182' }),
    findOrCreateCustomer(prisma, { name: 'Kiosco La Esquina', contact: 'Pablo Sosa', email: 'demo.laesquina@stockia.dev', phone: '+54 341 555-0246' }),
    findOrCreateCustomer(prisma, { name: 'Servicios Delta', contact: 'Nicolás Ferrer', email: 'demo.delta@stockia.dev', phone: '+54 11 5550-0731' }),
  ]);

  const demoSales = [
    { customer: customers[0], deposit: central, product: demoProducts[0], quantity: 4, daysAgo: 26 },
    { customer: customers[1], deposit: norte, product: demoProducts[1], quantity: 3, daysAgo: 20 },
    { customer: customers[2], deposit: central, product: demoProducts[4], quantity: 2, daysAgo: 14 },
    { customer: customers[0], deposit: sur, product: demoProducts[2], quantity: 5, daysAgo: 9 },
    { customer: customers[1], deposit: central, product: demoProducts[3], quantity: 6, daysAgo: 4 },
    { customer: customers[2], deposit: norte, product: demoProducts[5], quantity: 2, daysAgo: 1 },
  ];
  for (const demoSale of demoSales) {
    const exists = await prisma.sale.findFirst({ where: { customerId: demoSale.customer.id, depositId: demoSale.deposit.id, items: { some: { productId: demoSale.product.id } } } });
    if (exists) continue;
    const createdAt = new Date(Date.now() - demoSale.daysAgo * 24 * 60 * 60 * 1000);
    await prisma.$transaction(async tx => {
      const stock = await tx.stock.findUnique({ where: { productId_depositId: { productId: demoSale.product.id, depositId: demoSale.deposit.id } } });
      if (!stock || stock.quantity < demoSale.quantity) return;
      const total = Number(demoSale.product.price) * demoSale.quantity;
      const sale = await tx.sale.create({ data: { depositId: demoSale.deposit.id, customerId: demoSale.customer.id, userId: admin.id, total, createdAt, items: { create: [{ productId: demoSale.product.id, quantity: demoSale.quantity, price: demoSale.product.price }] } } });
      await tx.stock.update({ where: { id: stock.id }, data: { quantity: { decrement: demoSale.quantity } } });
      await tx.stockMovement.create({ data: { productId: demoSale.product.id, depositId: demoSale.deposit.id, saleId: sale.id, quantity: -demoSale.quantity, reason: `Venta demo #${sale.id}`, createdAt } });
    });
  }

  const offersCount = await prisma.telegramOffer.count();
  if (offersCount === 0 && demoProducts.length >= 4 && customers.length >= 2) {
    const nextWeek = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);
    const twoWeeks = new Date(Date.now() + 14 * 24 * 60 * 60 * 1000);
    await prisma.telegramOffer.createMany({
      data: [
        {
          title: 'Combo Desayuno y Almacén',
          message: '¡Hola *{{nombre}}*!\nArmamos este *combo de almacén* con *{{descuento}}*:\n\n{{productos}}\n\n{{vigencia}}\n_Respondé con las cantidades para reservar._',
          status: 'Lista para enviar',
          productIds: [demoProducts[0].id, demoProducts[1].id, demoProducts[3].id],
          customerIds: [customers[0].id, customers[1].id],
          items: [
            { productId: demoProducts[0].id, offerPrice: 2380 },
            { productId: demoProducts[1].id, offerPrice: 3060 },
            { productId: demoProducts[3].id, offerPrice: 1490 },
          ],
          discountPercent: 15,
          validFrom: new Date(),
          validUntil: nextWeek,
          userId: admin.id,
        },
        {
          title: 'Promo Limpieza y Hogar',
          message: '¡Hola *{{nombre}}*!\nRenová tu stock de limpieza e iluminación con *{{descuento}}* mayorista:\n\n{{productos}}\n\n{{vigencia}}\n_Pedí hoy y coordinamos la entrega._',
          status: 'Enviada',
          productIds: [demoProducts[4].id, demoProducts[5].id],
          customerIds: [],
          items: [
            { productId: demoProducts[4].id, offerPrice: 1990 },
            { productId: demoProducts[5].id, offerPrice: 3290 },
          ],
          discountPercent: 18,
          validFrom: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000),
          validUntil: twoWeeks,
          sentAt: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000),
          userId: admin.id,
        },
        {
          title: 'Beneficio Comercial El Roble',
          message: '¡Hola *{{nombre}}*!\nPor ser cliente frecuente tenés *{{descuento}}* en reposición de aceite y café:\n\n{{productos}}\n\n{{vigencia}}\n_Avisanos cuántas cajas te separamos._',
          status: 'Borrador',
          productIds: [demoProducts[2].id, demoProducts[0].id],
          customerIds: [customers[0].id],
          items: [
            { productId: demoProducts[2].id, offerPrice: null },
            { productId: demoProducts[0].id, offerPrice: null },
          ],
          discountPercent: 20,
          validFrom: new Date(),
          validUntil: twoWeeks,
          userId: admin.id,
        },
      ],
    });
  }
  */

  console.log('Seed completado.');
}

main()
  .catch((e) => {
    console.error(e);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
