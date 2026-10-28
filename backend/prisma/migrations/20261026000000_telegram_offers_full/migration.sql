-- Ofertas por Telegram: lógica completa de campañas
-- Nuevos campos: título, ítems con precio de oferta, descuento global,
-- vigencia, programación y auditoría de envío.

ALTER TABLE "telegram_offers" ADD COLUMN IF NOT EXISTS "title" TEXT NOT NULL DEFAULT '';
ALTER TABLE "telegram_offers" ADD COLUMN IF NOT EXISTS "items" JSONB NOT NULL DEFAULT '[]';
ALTER TABLE "telegram_offers" ADD COLUMN IF NOT EXISTS "discountPercent" INTEGER;
ALTER TABLE "telegram_offers" ADD COLUMN IF NOT EXISTS "validFrom" TIMESTAMP(3);
ALTER TABLE "telegram_offers" ADD COLUMN IF NOT EXISTS "validUntil" TIMESTAMP(3);
ALTER TABLE "telegram_offers" ADD COLUMN IF NOT EXISTS "scheduledAt" TIMESTAMP(3);
ALTER TABLE "telegram_offers" ADD COLUMN IF NOT EXISTS "sentAt" TIMESTAMP(3);
ALTER TABLE "telegram_offers" ADD COLUMN IF NOT EXISTS "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP;

-- Backfill: las campañas legacy guardaban productIds pero no items.
-- Se deriva items = [{productId}] para que el detalle enriquecido funcione.
UPDATE "telegram_offers"
SET "items" = (
  SELECT COALESCE(jsonb_agg(jsonb_build_object('productId', v)), '[]'::jsonb)
  FROM jsonb_array_elements_text(COALESCE("productIds", '[]'::jsonb)) AS v
  WHERE v ~ '^[0-9]+$'
)
WHERE "items" = '[]'::jsonb AND COALESCE("productIds", '[]'::jsonb) != '[]'::jsonb;

-- Backfill: título derivado del inicio del mensaje para campañas legacy.
UPDATE "telegram_offers"
SET "title" = LEFT("message", 80)
WHERE "title" = '';

-- Normalizar estados legacy desconocidos a Borrador.
UPDATE "telegram_offers"
SET "status" = 'Borrador'
WHERE "status" NOT IN ('Borrador', 'Lista para enviar', 'Enviada', 'Archivada', 'Cancelada');

CREATE INDEX IF NOT EXISTS "telegram_offers_status_idx" ON "telegram_offers"("status");
CREATE INDEX IF NOT EXISTS "telegram_offers_createdAt_idx" ON "telegram_offers"("createdAt");
