// Rutas de movimientos: listar por mes, crear, editar y eliminar.
// El tipo (fijo/variable) solo aplica a ingreso y gasto. Un movimiento puede
// llevar una subcategoria del usuario (ej. "Gasolina"); en ese caso la
// categoria y el tipo se toman de la subcategoria.
import type { FastifyInstance } from 'fastify';
import { query } from '../db.js';
import { idsDeVista } from '../lib/pareja.js';

const CATEGORIAS = ['ingreso', 'gasto', 'ahorro', 'inversion'] as const;
const MONEDAS = ['GTQ', 'USD'] as const;
const TIPOS = ['fijo', 'variable'] as const;
const CON_TIPO = ['ingreso', 'gasto'];
const FECHA_RE = /^\d{4}-\d{2}-\d{2}$/;

type SubcategoriaRow = {
  id: string;
  categoria: string;
  tipo: string | null;
  nombre: string;
};

type Resuelto = {
  fecha: string;
  monto: number;
  moneda: string;
  categoria: string;
  tipo: string | null;
  subcategoria_id: string | null;
  subNombre: string | null;
  descripcion: string;
};

// Valida el cuerpo y resuelve categoria/tipo (derivandolos de la subcategoria
// si se envio una). Devuelve un error o los datos listos para guardar.
async function resolver(
  body: Record<string, unknown>,
  usuarioId: string,
): Promise<{ error: string } | Resuelto> {
  const fecha = String(body.fecha ?? '');
  const monto = Number(body.monto);
  const moneda = String(body.moneda ?? '');
  const descripcion = String(body.descripcion ?? '').trim();
  const subId = body.subcategoria_id ? String(body.subcategoria_id) : null;
  let categoria = String(body.categoria ?? '');
  let tipo = body.tipo == null ? null : String(body.tipo);
  let subNombre: string | null = null;

  if (!FECHA_RE.test(fecha)) return { error: 'La fecha no es válida' };
  if (!Number.isFinite(monto) || monto <= 0) {
    return { error: 'El monto debe ser mayor que cero' };
  }
  if (!MONEDAS.includes(moneda as (typeof MONEDAS)[number])) {
    return { error: 'Moneda inválida' };
  }

  if (subId) {
    const sub = (
      await query<SubcategoriaRow>(
        'SELECT id, categoria, tipo, nombre FROM subcategorias WHERE id = $1 AND usuario_id = $2',
        [subId, usuarioId],
      )
    )[0];
    if (!sub) return { error: 'Subcategoría no válida' };
    // La categoria y el tipo mandan desde la subcategoria.
    categoria = sub.categoria;
    tipo = sub.tipo;
    subNombre = sub.nombre;
  } else {
    if (!CATEGORIAS.includes(categoria as (typeof CATEGORIAS)[number])) {
      return { error: 'Categoría inválida' };
    }
    if (CON_TIPO.includes(categoria)) {
      if (!tipo || !TIPOS.includes(tipo as (typeof TIPOS)[number])) {
        return { error: 'Elige si es fijo o variable' };
      }
    } else {
      tipo = null;
    }
  }

  return {
    fecha,
    monto,
    moneda,
    categoria,
    tipo,
    subcategoria_id: subId,
    subNombre,
    descripcion,
  };
}

export async function rutasMovimientos(app: FastifyInstance) {
  app.addHook('onRequest', app.authenticate);

  // Movimientos para un mes/anio, segun la vista (mio | pareja | comun).
  // Incluye el dueño de cada movimiento (para vistas de pareja/comun).
  app.get('/movimientos', async (req, reply) => {
    const q = req.query as Record<string, unknown>;
    const anio = Number(q.anio);
    const mes = Number(q.mes);
    if (!Number.isInteger(anio) || !Number.isInteger(mes) || mes < 1 || mes > 12) {
      return reply.code(400).send({ error: 'Parámetros de fecha inválidos' });
    }

    const r = await idsDeVista(req.user.sub, String(q.vista ?? 'mio'));
    if ('error' in r) return reply.code(400).send({ error: r.error });

    const filas = await query(
      `SELECT m.id, m.fecha::text AS fecha, m.monto, m.moneda, m.categoria,
              m.tipo, m.subcategoria_id, s.nombre AS subcategoria_nombre,
              m.descripcion, m.usuario_id, u.nombre AS usuario_nombre
       FROM movimientos m
       LEFT JOIN subcategorias s ON s.id = m.subcategoria_id
       JOIN usuarios u ON u.id = m.usuario_id
       WHERE m.usuario_id = ANY($1::uuid[])
         AND EXTRACT(YEAR FROM m.fecha) = $2
         AND EXTRACT(MONTH FROM m.fecha) = $3
       ORDER BY m.fecha DESC, m.creado_en DESC`,
      [r.ids, anio, mes],
    );
    return filas;
  });

  // Crear movimiento.
  app.post('/movimientos', async (req, reply) => {
    const r = await resolver((req.body ?? {}) as Record<string, unknown>, req.user.sub);
    if ('error' in r) return reply.code(400).send({ error: r.error });

    const filas = await query<Record<string, unknown>>(
      `INSERT INTO movimientos
         (usuario_id, fecha, monto, moneda, categoria, tipo, subcategoria_id, descripcion)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
       RETURNING id, fecha::text AS fecha, monto, moneda, categoria, tipo,
                 subcategoria_id, descripcion`,
      [req.user.sub, r.fecha, r.monto, r.moneda, r.categoria, r.tipo, r.subcategoria_id, r.descripcion],
    );
    return reply.code(201).send({ ...filas[0], subcategoria_nombre: r.subNombre });
  });

  // Editar movimiento (solo si es del usuario).
  app.put('/movimientos/:id', async (req, reply) => {
    const { id } = req.params as { id: string };
    const r = await resolver((req.body ?? {}) as Record<string, unknown>, req.user.sub);
    if ('error' in r) return reply.code(400).send({ error: r.error });

    const filas = await query<Record<string, unknown>>(
      `UPDATE movimientos
       SET fecha = $1, monto = $2, moneda = $3, categoria = $4, tipo = $5,
           subcategoria_id = $6, descripcion = $7
       WHERE id = $8 AND usuario_id = $9
       RETURNING id, fecha::text AS fecha, monto, moneda, categoria, tipo,
                 subcategoria_id, descripcion`,
      [r.fecha, r.monto, r.moneda, r.categoria, r.tipo, r.subcategoria_id, r.descripcion, id, req.user.sub],
    );
    if (filas.length === 0) {
      return reply.code(404).send({ error: 'Movimiento no encontrado' });
    }
    return { ...filas[0], subcategoria_nombre: r.subNombre };
  });

  // Eliminar movimiento (solo si es del usuario).
  app.delete('/movimientos/:id', async (req, reply) => {
    const { id } = req.params as { id: string };
    const filas = await query(
      'DELETE FROM movimientos WHERE id = $1 AND usuario_id = $2 RETURNING id',
      [id, req.user.sub],
    );
    if (filas.length === 0) {
      return reply.code(404).send({ error: 'Movimiento no encontrado' });
    }
    return { ok: true };
  });
}
