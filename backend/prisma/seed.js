import prisma from '../config/prisma.js';
import bcrypt from 'bcryptjs';

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

async function main() {
  const password = await bcrypt.hash('test1234', 10);
  const admin = await prisma.user.upsert({
    where: { email: 'admin@stockia.dev' },
    update: { appRole: 'administrador', role: 'ADMIN' },
    create: { name: 'Admin StockIA', email: 'admin@stockia.dev', password, role: 'ADMIN', appRole: 'administrador' }
  });

  const central = await findOrCreateDeposit(prisma, 'Depósito Central', 'Sede principal');
  const norte = await findOrCreateDeposit(prisma, 'Depósito Norte', 'Sucursal Norte');
  const sur = await findOrCreateDeposit(prisma, 'Depósito Sur', 'Av. Independencia 1840, Rosario');
  await prisma.deposit.update({ where: { id: sur.id }, data: { type: 'Sucursal', manager: 'Mariana López', capacity: 180 } });

  const valvula = await prisma.product.upsert({
    where: { code: 'VAL-20E-ST' },
    update: {},
    create: { name: 'Válvula Industrial 2"', code: 'VAL-20E-ST', category: 'Válvulas', price: 1500.0 }
  });
  const tornillo = await prisma.product.upsert({
    where: { code: 'TOR-08M-CX' },
    update: {},
    create: { name: 'Tornillo M8 (caja x100)', code: 'TOR-08M-CX', category: 'Ferretería', price: 3200.0 }
  });

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

  const demoProducts = await Promise.all([
    prisma.product.upsert({ where: { code: 'DEMO-CAF-001' }, update: {}, create: { name: 'Café molido demo', code: 'DEMO-CAF-001', category: 'Almacén', price: 2800, lowStockThreshold: 8 } }),
    prisma.product.upsert({ where: { code: 'DEMO-YER-001' }, update: {}, create: { name: 'Yerba mate demo', code: 'DEMO-YER-001', category: 'Almacén', price: 3600, lowStockThreshold: 8 } }),
    prisma.product.upsert({ where: { code: 'DEMO-ACE-001' }, update: {}, create: { name: 'Aceite demo', code: 'DEMO-ACE-001', category: 'Almacén', price: 2100, lowStockThreshold: 6 } }),
    prisma.product.upsert({ where: { code: 'DEMO-GAL-001' }, update: {}, create: { name: 'Galletitas avena y miel', code: 'DEMO-GAL-001', category: 'Almacén', price: 1750, lowStockThreshold: 10 } }),
    prisma.product.upsert({ where: { code: 'DEMO-DET-001' }, update: {}, create: { name: 'Detergente concentrado 750 ml', code: 'DEMO-DET-001', category: 'Limpieza', price: 2450, lowStockThreshold: 7 } }),
    prisma.product.upsert({ where: { code: 'DEMO-LAM-001' }, update: {}, create: { name: 'Lámpara LED 12W', code: 'DEMO-LAM-001', category: 'Hogar', price: 3900, lowStockThreshold: 5 } }),
  ]);
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
      const sale = await tx.sale.create({ data: { depositId: demoSale.deposit.id, customerId: demoSale.customer.id, userId: admin.id, total, createdAt, items: { create: [{ productId: demoSale.product.id, warehouseId: demoSale.deposit.id, quantity: demoSale.quantity, price: demoSale.product.price }] } } });
      await tx.stock.update({ where: { id: stock.id }, data: { quantity: { decrement: demoSale.quantity } } });
      await tx.stockMovement.create({ data: { productId: demoSale.product.id, depositId: demoSale.deposit.id, saleId: sale.id, quantity: demoSale.quantity, type: 'OUT', reason: `Venta demo #${sale.id}`, createdAt } });
    });
  }

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
