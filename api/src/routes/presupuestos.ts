// Rutas de presupuestos: consultar por mes, crear/actualizar (upsert) y eliminar.
import type { FastifyInstance } from 'fastify';
import { query } from '../db.js';
import { idsDeVista } from '../lib/pareja.js';

const CATEGORIAS = ['ingreso', 'gasto', 'ahorro', 'inversion'] as const;
const MONEDAS = ['GTQ', 'USD'] as const;

type PresupuestoRow = {
  id: string;
  categoria: string;
  monto_planificado: string; // NUMERIC llega como texto desde Postgres
  moneda: string;
};

export async function rutasPresupuestos(app: FastifyInstance) {
  app.addHook('onRequest', app.authenticate);

  // Presupuestos para un mes/anio, segun la vista (mio | pareja | comun).
  // En 'comun' puede haber una fila por usuario y categoria (el frontend suma).
  app.get('/presupuestos', async (req, reply) => {
    const q = req.query as Record<string, unknown>;
    const anio = Number(q.anio);
    const mes = Number(q.mes);
    if (!Number.isInteger(anio) || !Number.isInteger(mes) || mes < 1 || mes > 12) {
      return reply.code(400).send({ error: 'Parámetros de fecha inválidos' });
    }

    const r = await idsDeVista(req.user.sub, String(q.vista ?? 'mio'));
    if ('error' in r) return reply.code(400).send({ error: r.error });

    const filas = await query<PresupuestoRow>(
      `SELECT id, categoria, monto_planificado, moneda
       FROM presupuestos
       WHERE usuario_id = ANY($1::uuid[]) AND anio = $2 AND mes = $3`,
      [r.ids, anio, mes],
    );
    return filas;
  });

  // Crear o actualizar el presupuesto de una categoria en un mes (upsert).
  app.put('/presupuestos', async (req, reply) => {
    const body = (req.body ?? {}) as Record<string, unknown>;
    const anio = Number(body.anio);
    const mes = Number(body.mes);
    const categoria = String(body.categoria ?? '');
    const monto = Number(body.monto_planificado);
    const moneda = String(body.moneda ?? '');

    if (!Number.isInteger(anio) || !Number.isInteger(mes) || mes < 1 || mes > 12) {
      return reply.code(400).send({ error: 'Parámetros de fecha inválidos' });
    }
    if (!CATEGORIAS.includes(categoria as (typeof CATEGORIAS)[number])) {
      return reply.code(400).send({ error: 'Categoría inválida' });
    }
    if (!MONEDAS.includes(moneda as (typeof MONEDAS)[number])) {
      return reply.code(400).send({ error: 'Moneda inválida' });
    }
    if (!Number.isFinite(monto) || monto < 0) {
      return reply.code(400).send({ error: 'El monto no es válido' });
    }

    const filas = await query<PresupuestoRow>(
      `INSERT INTO presupuestos (usuario_id, anio, mes, categoria, monto_planificado, moneda)
       VALUES ($1, $2, $3, $4, $5, $6)
       ON CONFLICT (usuario_id, anio, mes, categoria)
       DO UPDATE SET monto_planificado = EXCLUDED.monto_planificado,
                     moneda = EXCLUDED.moneda
       RETURNING id, categoria, monto_planificado, moneda`,
      [req.user.sub, anio, mes, categoria, monto, moneda],
    );
    return filas[0];
  });

  // Eliminar un presupuesto (solo si es del usuario).
  app.delete('/presupuestos/:id', async (req, reply) => {
    const { id } = req.params as { id: string };
    const filas = await query(
      'DELETE FROM presupuestos WHERE id = $1 AND usuario_id = $2 RETURNING id',
      [id, req.user.sub],
    );
    if (filas.length === 0) {
      return reply.code(404).send({ error: 'Presupuesto no encontrado' });
    }
    return { ok: true };
  });
}
