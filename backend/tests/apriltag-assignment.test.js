import test from 'node:test';
import assert from 'node:assert/strict';
import prisma from '../config/prisma.js';
import { resetDb } from './helpers.js';
import { getNextAvailableAprilTagId } from '../services/apriltag.service.js';

test.describe('AprilTags: Asignación automática y modelo', () => {
  test.beforeEach(async () => {
    await resetDb();
  });

  test.after(async () => {
    await resetDb();
    await prisma.$disconnect();
  });

  test('asigna id 0 al primer producto y 1 al segundo', async () => {
    const next0 = await getNextAvailableAprilTagId(prisma);
    assert.equal(next0, 0);

    const p0 = await prisma.product.create({
      data: {
        name: 'Producto Cero',
        code: 'PROD-000',
        price: 100,
        apriltagId: next0,
      },
    });
    assert.equal(p0.apriltagId, 0);

    const next1 = await getNextAvailableAprilTagId(prisma);
    assert.equal(next1, 1);

    const p1 = await prisma.product.create({
      data: {
        name: 'Producto Uno',
        code: 'PROD-001',
        price: 200,
        apriltagId: next1,
      },
    });
    assert.equal(p1.apriltagId, 1);
  });

  test('los productos dados de baja (active: false) mantienen su apriltag reservado', async () => {
    const p0 = await prisma.product.create({
      data: {
        name: 'Producto A',
        code: 'PROD-A',
        price: 150,
        apriltagId: 0,
        active: false, // inactivo / dado de baja
      },
    });
    assert.equal(p0.active, false);

    // El siguiente disponible NO debe ser 0 porque sigue reservado
    const next = await getNextAvailableAprilTagId(prisma);
    assert.equal(next, 1);
  });

  test('reutiliza el menor hueco si un registro es eliminado físicamente', async () => {
    await prisma.product.create({
      data: { name: 'P0', code: 'P0', price: 10, apriltagId: 0 },
    });
    const p1 = await prisma.product.create({
      data: { name: 'P1', code: 'P1', price: 10, apriltagId: 1 },
    });
    await prisma.product.create({
      data: { name: 'P2', code: 'P2', price: 10, apriltagId: 2 },
    });

    // Eliminamos P1
    await prisma.product.delete({ where: { id: p1.id } });

    // El menor disponible debe ser 1 (el hueco liberado)
    const next = await getNextAvailableAprilTagId(prisma);
    assert.equal(next, 1);
  });

  test('assignMissingAprilTags asigna secuencialmente a productos que tienen null', async () => {
    await prisma.product.create({
      data: { name: 'Prod A', code: 'PROD-A', price: 10, apriltagId: null },
    });
    await prisma.product.create({
      data: { name: 'Prod B', code: 'PROD-B', price: 20, apriltagId: null },
    });

    const { updatedCount, assignments } = await import('../services/apriltag.service.js').then(s => s.assignMissingAprilTags(prisma));
    assert.equal(updatedCount, 2);
    assert.equal(assignments[0].apriltagId, 0);
    assert.equal(assignments[1].apriltagId, 1);

    const prods = await prisma.product.findMany({ orderBy: { id: 'asc' } });
    assert.equal(prods[0].apriltagId, 0);
    assert.equal(prods[1].apriltagId, 1);
  });
});

