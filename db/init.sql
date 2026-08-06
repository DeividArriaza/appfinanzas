-- Esquema inicial de appfinanzas.
-- Este archivo se ejecuta automaticamente la PRIMERA vez que arranca el
-- contenedor de Postgres (cuando el volumen de datos esta vacio).

-- Tipos cerrados para evitar valores invalidos en la base.
CREATE TYPE moneda AS ENUM ('GTQ', 'USD');
CREATE TYPE categoria AS ENUM ('ingreso', 'gasto', 'ahorro', 'inversion');
CREATE TYPE tipo_movimiento AS ENUM ('fijo', 'variable');
CREATE TYPE estado_vinculo AS ENUM ('pendiente', 'activo');

-- Usuarios de la aplicacion.
CREATE TABLE usuarios (
    id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    correo           TEXT NOT NULL UNIQUE,
    nombre           TEXT NOT NULL,
    -- Codigo corto y unico para que la pareja te encuentre sin dar el correo.
    codigo_unico     TEXT NOT NULL UNIQUE,
    moneda_preferida moneda NOT NULL DEFAULT 'GTQ',
    -- Limite de balance PERSONAL del mes: al bajar hasta aqui se avisa (naranja).
    -- En GTQ (canonico). NULL = sin alerta.
    limite_balance   NUMERIC(14, 2),
    password_hash    TEXT NOT NULL,
    creado_en        TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Vinculo entre dos usuarios (pareja). Un usuario a la vez para este caso.
CREATE TABLE vinculos (
    id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    usuario_a  UUID NOT NULL REFERENCES usuarios(id) ON DELETE CASCADE,
    usuario_b  UUID NOT NULL REFERENCES usuarios(id) ON DELETE CASCADE,
    estado     estado_vinculo NOT NULL DEFAULT 'pendiente',
    -- Limite de balance de la CUENTA COMUN (compartido por ambos). En GTQ.
    limite_balance NUMERIC(14, 2),
    creado_en  TIMESTAMPTZ NOT NULL DEFAULT now(),
    -- No permitir vincularse consigo mismo ni duplicar el mismo par.
    CONSTRAINT vinculo_distintos CHECK (usuario_a <> usuario_b),
    CONSTRAINT vinculo_unico UNIQUE (usuario_a, usuario_b)
);

-- Presupuesto planificado por usuario, mes y categoria.
CREATE TABLE presupuestos (
    id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    usuario_id        UUID NOT NULL REFERENCES usuarios(id) ON DELETE CASCADE,
    anio              INTEGER NOT NULL,
    mes               INTEGER NOT NULL CHECK (mes BETWEEN 1 AND 12),
    categoria         categoria NOT NULL,
    monto_planificado NUMERIC(14, 2) NOT NULL CHECK (monto_planificado >= 0),
    moneda            moneda NOT NULL DEFAULT 'GTQ',
    creado_en         TIMESTAMPTZ NOT NULL DEFAULT now(),
    -- Un solo presupuesto por usuario/mes/categoria.
    CONSTRAINT presupuesto_unico UNIQUE (usuario_id, anio, mes, categoria)
);

-- Subcategorias que crea cada usuario dentro de una categoria base
-- (ej. "Gasolina" dentro de gasto). Para ingreso/gasto guardan si son
-- fijo/variable; en ahorro/inversion el tipo queda vacio.
CREATE TABLE subcategorias (
    id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    usuario_id UUID NOT NULL REFERENCES usuarios(id) ON DELETE CASCADE,
    categoria  categoria NOT NULL,
    tipo       tipo_movimiento,
    nombre     TEXT NOT NULL,
    creado_en  TIMESTAMPTZ NOT NULL DEFAULT now(),
    CONSTRAINT subcategoria_unica UNIQUE (usuario_id, categoria, nombre)
);

-- Movimientos reales (ingresos, gastos, aportes a ahorro o inversion).
CREATE TABLE movimientos (
    id             UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    usuario_id     UUID NOT NULL REFERENCES usuarios(id) ON DELETE CASCADE,
    fecha          DATE NOT NULL,
    monto          NUMERIC(14, 2) NOT NULL CHECK (monto >= 0),
    moneda         moneda NOT NULL DEFAULT 'GTQ',
    categoria      categoria NOT NULL,
    -- fijo/variable aplica sobre todo a ingreso y gasto; puede quedar vacio.
    tipo           tipo_movimiento,
    -- Subcategoria opcional. Si se borra la subcategoria, el movimiento queda
    -- sin ella (pero conserva su categoria y tipo).
    subcategoria_id UUID REFERENCES subcategorias(id) ON DELETE SET NULL,
    descripcion    TEXT NOT NULL DEFAULT '',
    creado_en      TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Indices para las consultas mas comunes: "mis movimientos de este mes".
CREATE INDEX idx_movimientos_usuario_fecha ON movimientos (usuario_id, fecha);
CREATE INDEX idx_presupuestos_usuario_periodo ON presupuestos (usuario_id, anio, mes);
