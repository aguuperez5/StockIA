-- DropForeignKey
ALTER TABLE "sale_items" DROP CONSTRAINT IF EXISTS "sale_items_warehouseId_fkey";

-- DropIndex
DROP INDEX IF EXISTS "sale_items_warehouseId_idx";

-- AlterTable
ALTER TABLE "sale_items" DROP COLUMN IF EXISTS "warehouseId";
