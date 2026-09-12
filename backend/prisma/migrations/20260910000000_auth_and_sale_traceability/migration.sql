ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "legajo" TEXT NOT NULL DEFAULT '';
ALTER TABLE "stock_movements" ADD COLUMN IF NOT EXISTS "saleId" INTEGER;
CREATE INDEX IF NOT EXISTS "stock_movements_saleId_idx" ON "stock_movements"("saleId");
DO $$ BEGIN
  ALTER TABLE "stock_movements"
    ADD CONSTRAINT "stock_movements_saleId_fkey"
    FOREIGN KEY ("saleId") REFERENCES "sales"("id")
    ON DELETE SET NULL ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;
