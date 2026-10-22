import prisma from '../config/prisma.js';

export const MAX_APRILTAG_ID = 586; // Familia tag36h11 (0 a 586 = 587 tags)

/**
 * Obtiene el primer apriltag_id disponible (menor número libre entre 0 y 586).
 * Los productos inactivos (dados de baja) conservan su tag para evitar colisiones
 * con etiquetas físicas ya adheridas a mercadería.
 *
 * @param {import('@prisma/client').PrismaClient | import('@prisma/client').Prisma.TransactionClient} [client]
 * @returns {Promise<number>}
 */
export async function getNextAvailableAprilTagId(client = prisma) {
  const existing = await client.product.findMany({
    where: { apriltagId: { not: null } },
    select: { apriltagId: true },
  });

  const used = new Set(existing.map((p) => p.apriltagId));

  for (let id = 0; id <= MAX_APRILTAG_ID; id++) {
    if (!used.has(id)) {
      return id;
    }
  }

  const error = new Error('Se ha alcanzado el límite máximo de códigos AprilTag disponibles (587 tags, familia tag36h11).');
  error.status = 409;
  error.statusCode = 409;
  throw error;
}

/**
 * Asigna secuencialmente un apriltag_id a todos los productos existentes que no tengan uno.
 *
 * @param {import('@prisma/client').PrismaClient} [client]
 * @returns {Promise<{ updatedCount: number, assignments: Array<{ productId: number, apriltagId: number, name: string }> }>}
 */
export async function assignMissingAprilTags(client = prisma) {
  const pendingProducts = await client.product.findMany({
    where: { apriltagId: null },
    orderBy: { id: 'asc' },
    select: { id: true, name: true, code: true },
  });

  if (pendingProducts.length === 0) {
    return { updatedCount: 0, assignments: [] };
  }

  const existing = await client.product.findMany({
    where: { apriltagId: { not: null } },
    select: { apriltagId: true },
  });
  const used = new Set(existing.map((p) => p.apriltagId));

  const assignments = [];

  for (const product of pendingProducts) {
    let nextId = -1;
    for (let id = 0; id <= MAX_APRILTAG_ID; id++) {
      if (!used.has(id)) {
        nextId = id;
        break;
      }
    }

    if (nextId === -1) {
      throw new Error(`Cupo de AprilTags agotado al intentar asignar al producto ${product.name} (ID ${product.id}).`);
    }

    used.add(nextId);
    await client.product.update({
      where: { id: product.id },
      data: { apriltagId: nextId },
    });

    assignments.push({
      productId: product.id,
      apriltagId: nextId,
      name: product.name,
      code: product.code,
    });
  }

  return { updatedCount: assignments.length, assignments };
}
