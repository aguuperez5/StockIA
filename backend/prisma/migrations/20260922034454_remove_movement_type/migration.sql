/*
  Warnings:

  - You are about to drop the column `type` on the `stock_movements` table. All the data in the column will be lost.

*/
-- DropIndex
DROP INDEX "customers_name_idx";

-- DropIndex
DROP INDEX "stock_movements_saleId_idx";

-- DropIndex
DROP INDEX "transfer_items_productId_idx";

-- AlterTable
ALTER TABLE "customers" ALTER COLUMN "updatedAt" DROP DEFAULT;

-- AlterTable
ALTER TABLE "stock_movements" DROP COLUMN "type";

-- DropEnum
DROP TYPE "MovementType";
