import prisma from '../config/prisma.js';
import bcrypt from 'bcryptjs';

// Deposit no tiene una clave de negocio única en el schema (dos depósitos
// podrían compartir nombre); para un seed idempotente alcanza con
// buscar-o-crear por nombre.
async function findOrCreateDeposit(client, name, location) {
  const existing = await client.deposit.findFirst({ where: { name } });
  if (existing) return existing;
  return client.deposit.create({ data: { name, location, address: location, type: name.includes('Norte') ? 'Sucursal' : 'Principal', manager: 'Admin StockIA' } });
}

async function main() {
  const password = await bcrypt.hash('test1234', 10);
  await prisma.user.upsert({
    where: { email: 'admin@stockia.dev' },
    update: { appRole: 'administrador', role: 'ADMIN' },
    create: { name: 'Admin StockIA', email: 'admin@stockia.dev', password, role: 'ADMIN', appRole: 'administrador' }
  });

  const central = await findOrCreateDeposit(prisma, 'Depósito Central', 'Sede principal');
  const norte = await findOrCreateDeposit(prisma, 'Depósito Norte', 'Sucursal Norte');

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
