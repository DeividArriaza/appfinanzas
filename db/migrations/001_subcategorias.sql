-- Migracion 001: subcategorias propias por usuario.
-- Aplicar a bases ya existentes. Las instalaciones nuevas ya lo traen en init.sql.
-- Idempotente: se puede correr mas de una vez sin error.

CREATE TABLE IF NOT EXISTS subcategorias (
    id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    usuario_id UUID NOT NULL REFERENCES usuarios(id) ON DELETE CASCADE,
    categoria  categoria NOT NULL,
    tipo       tipo_movimiento,
    nombre     TEXT NOT NULL,
    creado_en  TIMESTAMPTZ NOT NULL DEFAULT now(),
    CONSTRAINT subcategoria_unica UNIQUE (usuario_id, categoria, nombre)
);

ALTER TABLE movimientos
    ADD COLUMN IF NOT EXISTS subcategoria_id UUID
    REFERENCES subcategorias(id) ON DELETE SET NULL;
