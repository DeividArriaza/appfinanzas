-- Migracion 004: recordatorio diario por notificacion push. Idempotente.

-- Suscripciones Web Push (una por navegador/dispositivo del usuario).
CREATE TABLE IF NOT EXISTS push_suscripciones (
    id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    usuario_id UUID NOT NULL REFERENCES usuarios(id) ON DELETE CASCADE,
    endpoint   TEXT NOT NULL UNIQUE,
    p256dh     TEXT NOT NULL,
    auth       TEXT NOT NULL,
    creado_en  TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_push_suscripciones_usuario ON push_suscripciones (usuario_id);

-- Configuracion del recordatorio diario (uno por usuario).
CREATE TABLE IF NOT EXISTS recordatorios (
    usuario_id   UUID PRIMARY KEY REFERENCES usuarios(id) ON DELETE CASCADE,
    activo       BOOLEAN NOT NULL DEFAULT true,
    -- Hora local del usuario (HH:MM) en su zona horaria.
    hora         TIME NOT NULL,
    zona_horaria TEXT NOT NULL DEFAULT 'America/Guatemala',
    -- Fecha local del ultimo envio: evita mandar dos veces el mismo dia.
    ultimo_envio DATE
);
