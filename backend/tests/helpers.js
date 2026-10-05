import prisma from '../config/prisma.js';

// Limpia las tablas en orden seguro respetando FKs (para tests aislados).
export async function resetDb() {
  await prisma.transferItem.deleteMany();
  await prisma.transfer.deleteMany();
  await prisma.saleItem.deleteMany();
  await prisma.sale.deleteMany();
  await prisma.telegramOffer.deleteMany();
  await prisma.customer.deleteMany();
  await prisma.stockMovement.deleteMany();
  await prisma.stock.deleteMany();
  await prisma.priceRule.deleteMany();
  await prisma.product.deleteMany();
  await prisma.deposit.deleteMany();
  await prisma.user.deleteMany();
}

export async function createDeposit(overrides = {}) {
  return prisma.deposit.create({
    data: { name: 'Depósito Test', location: 'Test', ...overrides }
  });
}

export async function createProduct(overrides = {}) {
  return prisma.product.create({
    data: {
      name: 'Producto Test',
      code: `SKU-${Math.random().toString(36).slice(2, 8)}`,
      price: 100,
      ...overrides
    }
  });
}

export async function createUser(overrides = {}) {
  return prisma.user.create({
    data: {
      name: 'Usuario Test',
      email: `user-${Math.random().toString(36).slice(2, 8)}@stockia.com`,
      password: 'password123',
      appRole: 'caja',
      ...overrides,
    },
  });
}

