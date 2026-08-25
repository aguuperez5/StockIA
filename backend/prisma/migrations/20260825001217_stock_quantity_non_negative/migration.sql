-- Refuerzo a nivel de base de datos de la regla de negocio: el stock nunca
-- puede quedar negativo, incluso si la aplicación tuviera un bug o si se
-- escribe directamente por SQL.
ALTER TABLE "stock" ADD CONSTRAINT "stock_quantity_non_negative" CHECK ("quantity" >= 0);

-- La cantidad de un movimiento siempre se registra en valor absoluto;
-- el signo lo determina el campo "type" (IN/OUT/ADJUST).
ALTER TABLE "stock_movements" ADD CONSTRAINT "stock_movements_quantity_positive" CHECK ("quantity" > 0);
