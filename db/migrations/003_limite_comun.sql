-- Migracion 003: limite de balance de la CUENTA COMUN, guardado en el vinculo
-- (compartido por ambos). En GTQ. NULL = sin alerta. Idempotente.

ALTER TABLE vinculos
    ADD COLUMN IF NOT EXISTS limite_balance NUMERIC(14, 2);
