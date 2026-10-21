import '../config/env.js';
import prisma from '../config/prisma.js';
import { assignMissingAprilTags } from '../services/apriltag.service.js';

async function main() {
  console.log('--- Iniciando asignación de AprilTags para productos existentes ---');
  try {
    const { updatedCount, assignments } = await assignMissingAprilTags(prisma);
    if (updatedCount === 0) {
      console.log('Todos los productos ya cuentan con un apriltag_id asignado.');
    } else {
      console.log(`Se asignaron exitosamente ${updatedCount} AprilTags:`);
      for (const a of assignments) {
        console.log(`  - Producto [${a.code}] "${a.name}" (ID ${a.productId}) -> AprilTag #${a.apriltagId}`);
      }
    }
  } catch (error) {
    console.error('Error al asignar AprilTags:', error);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

main();
