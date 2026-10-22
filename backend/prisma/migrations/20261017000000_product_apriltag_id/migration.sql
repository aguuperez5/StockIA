-- AlterTable
ALTER TABLE "products" ADD COLUMN "apriltag_id" INTEGER;

-- CreateIndex
CREATE UNIQUE INDEX "products_apriltag_id_key" ON "products"("apriltag_id");
