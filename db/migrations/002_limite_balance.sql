-- Migracion 002: limite de balance del mes por usuario (para la alerta naranja).
-- En la moneda preferida del usuario. NULL = sin alerta. Idempotente.

ALTER TABLE usuarios
    ADD COLUMN IF NOT EXISTS limite_balance NUMERIC(14, 2);
