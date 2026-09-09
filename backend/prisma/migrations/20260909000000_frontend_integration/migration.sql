ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "appRole" TEXT NOT NULL DEFAULT 'caja';
ALTER TABLE "products" ADD COLUMN IF NOT EXISTS "lowStockThreshold" INTEGER NOT NULL DEFAULT 5;
ALTER TABLE "deposits" ADD COLUMN IF NOT EXISTS "type" TEXT NOT NULL DEFAULT 'Principal';
ALTER TABLE "deposits" ADD COLUMN IF NOT EXISTS "address" TEXT NOT NULL DEFAULT '';
ALTER TABLE "deposits" ADD COLUMN IF NOT EXISTS "manager" TEXT NOT NULL DEFAULT '';
ALTER TABLE "sales" ADD COLUMN IF NOT EXISTS "customerId" INTEGER;
ALTER TABLE "sales" ADD COLUMN IF NOT EXISTS "userId" INTEGER;
ALTER TABLE "sale_items" ADD COLUMN IF NOT EXISTS "warehouseId" INTEGER;

CREATE TABLE IF NOT EXISTS "customers" (
  "id" SERIAL NOT NULL,
  "name" TEXT NOT NULL,
  "contact" TEXT NOT NULL,
  "email" TEXT,
  "phone" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "customers_pkey" PRIMARY KEY ("id")
);
CREATE TABLE IF NOT EXISTS "transfers" (
  "id" SERIAL NOT NULL,
  "originWarehouseId" INTEGER NOT NULL,
  "destinationWarehouseId" INTEGER NOT NULL,
  "status" TEXT NOT NULL DEFAULT 'Confirmada',
  "userId" INTEGER,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "transfers_pkey" PRIMARY KEY ("id")
);
CREATE TABLE IF NOT EXISTS "transfer_items" (
  "id" SERIAL NOT NULL,
  "transferId" INTEGER NOT NULL,
  "productId" INTEGER NOT NULL,
  "quantity" INTEGER NOT NULL,
  CONSTRAINT "transfer_items_pkey" PRIMARY KEY ("id")
);
CREATE TABLE IF NOT EXISTS "telegram_offers" (
  "id" SERIAL NOT NULL,
  "message" TEXT NOT NULL,
  "status" TEXT NOT NULL,
  "productIds" JSONB NOT NULL,
  "customerIds" JSONB NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "userId" INTEGER,
  CONSTRAINT "telegram_offers_pkey" PRIMARY KEY ("id")
);
CREATE INDEX IF NOT EXISTS "customers_name_idx" ON "customers"("name");
CREATE INDEX IF NOT EXISTS "transfers_originWarehouseId_idx" ON "transfers"("originWarehouseId");
CREATE INDEX IF NOT EXISTS "transfers_destinationWarehouseId_idx" ON "transfers"("destinationWarehouseId");
CREATE INDEX IF NOT EXISTS "transfer_items_transferId_idx" ON "transfer_items"("transferId");
CREATE INDEX IF NOT EXISTS "transfer_items_productId_idx" ON "transfer_items"("productId");
CREATE INDEX IF NOT EXISTS "sales_customerId_idx" ON "sales"("customerId");
CREATE INDEX IF NOT EXISTS "sale_items_warehouseId_idx" ON "sale_items"("warehouseId");
DO $$ BEGIN ALTER TABLE "sales" ADD CONSTRAINT "sales_customerId_fkey" FOREIGN KEY ("customerId") REFERENCES "customers"("id") ON DELETE SET NULL ON UPDATE CASCADE; EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN ALTER TABLE "sales" ADD CONSTRAINT "sales_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE; EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN ALTER TABLE "sale_items" ADD CONSTRAINT "sale_items_warehouseId_fkey" FOREIGN KEY ("warehouseId") REFERENCES "deposits"("id") ON DELETE SET NULL ON UPDATE CASCADE; EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN ALTER TABLE "transfers" ADD CONSTRAINT "transfers_originWarehouseId_fkey" FOREIGN KEY ("originWarehouseId") REFERENCES "deposits"("id") ON DELETE RESTRICT ON UPDATE CASCADE; EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN ALTER TABLE "sale_items" ADD CONSTRAINT "sale_items_warehouseId_fkey" FOREIGN KEY ("warehouseId") REFERENCES "deposits"("id") ON DELETE SET NULL ON UPDATE CASCADE; EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN ALTER TABLE "transfers" ADD CONSTRAINT "transfers_destinationWarehouseId_fkey" FOREIGN KEY ("destinationWarehouseId") REFERENCES "deposits"("id") ON DELETE RESTRICT ON UPDATE CASCADE; EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN ALTER TABLE "sale_items" ADD CONSTRAINT "sale_items_warehouseId_fkey" FOREIGN KEY ("warehouseId") REFERENCES "deposits"("id") ON DELETE SET NULL ON UPDATE CASCADE; EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN ALTER TABLE "transfers" ADD CONSTRAINT "transfers_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE; EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN ALTER TABLE "transfer_items" ADD CONSTRAINT "transfer_items_transferId_fkey" FOREIGN KEY ("transferId") REFERENCES "transfers"("id") ON DELETE CASCADE ON UPDATE CASCADE; EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN ALTER TABLE "transfer_items" ADD CONSTRAINT "transfer_items_productId_fkey" FOREIGN KEY ("productId") REFERENCES "products"("id") ON DELETE RESTRICT ON UPDATE CASCADE; EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN ALTER TABLE "telegram_offers" ADD CONSTRAINT "telegram_offers_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE; EXCEPTION WHEN duplicate_object THEN NULL; END $$;
