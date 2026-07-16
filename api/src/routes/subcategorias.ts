// Rutas de subcategorias propias del usuario (ej. "Gasolina" dentro de gasto).
import type { FastifyInstance } from 'fastify';
import { query } from '../db.js';

const CATEGORIAS = ['ingreso', 'gasto', 'ahorro', 'inversion'] as const;
const TIPOS = ['fijo', 'variable'] as const;
const CON_TIPO = ['ingreso', 'gasto'];

type SubcategoriaRow = {
  id: string;
  categoria: string;
  tipo: string | null;
  nombre: string;
};

export async function rutasSubcategorias(app: FastifyInstance) {
  app.addHook('onRequest', app.authenticate);

  // Todas las subcategorias del usuario.
  app.get('/subcategorias', async (req) => {
    return query<SubcategoriaRow>(
      `SELECT id, categoria, tipo, nombre
       FROM subcategorias
       WHERE usuario_id = $1
       ORDER BY nombre`,
      [req.user.sub],
    );
  });

  // Crear una subcategoria.
  app.post('/subcategorias', async (req, reply) => {
    const body = (req.body ?? {}) as Record<string, unknown>;
    const categoria = String(body.categoria ?? '');
    const nombre = String(body.nombre ?? '').trim();
    let tipo = body.tipo == null ? null : String(body.tipo);

    if (!CATEGORIAS.includes(categoria as (typeof CATEGORIAS)[number])) {
      return reply.code(400).send({ error: 'Categoría inválida' });
    }
    if (!nombre) {
      return reply.code(400).send({ error: 'Escribe un nombre' });
    }
    if (CON_TIPO.includes(categoria)) {
      if (!tipo || !TIPOS.includes(tipo as (typeof TIPOS)[number])) {
        return reply.code(400).send({ error: 'Elige si es fijo o variable' });
      }
    } else {
      tipo = null;
    }

    try {
      const filas = await query<SubcategoriaRow>(
        `INSERT INTO subcategorias (usuario_id, categoria, tipo, nombre)
         VALUES ($1, $2, $3, $4)
         RETURNING id, categoria, tipo, nombre`,
        [req.user.sub, categoria, tipo, nombre],
      );
      return reply.code(201).send(filas[0]);
    } catch (e) {
      const err = e as { code?: string };
      if (err.code === '23505') {
        return reply
          .code(409)
          .send({ error: 'Ya tienes una subcategoría con ese nombre' });
      }
      throw e;
    }
  });

  // Eliminar una subcategoria (los movimientos que la usaban quedan sin ella).
  app.delete('/subcategorias/:id', async (req, reply) => {
    const { id } = req.params as { id: string };
    const filas = await query(
      'DELETE FROM subcategorias WHERE id = $1 AND usuario_id = $2 RETURNING id',
      [id, req.user.sub],
    );
    if (filas.length === 0) {
      return reply.code(404).send({ error: 'Subcategoría no encontrada' });
    }
    return { ok: true };
  });
}
