// Rutas de vinculacion de pareja: invitar por codigo/correo, aceptar, rechazar,
// cancelar y desvincular. En este producto cada usuario tiene a lo sumo UN
// vinculo a la vez (pendiente o activo).
import type { FastifyInstance } from 'fastify';
import { query } from '../db.js';

type VinculoRow = {
  id: string;
  usuario_a: string; // quien envio la invitacion
  usuario_b: string; // quien la recibio
  estado: 'pendiente' | 'activo';
  limite_balance: string | null; // limite de la cuenta comun (GTQ)
};

type Pareja = { id: string; nombre: string; correo: string };

// Estado del vinculo desde el punto de vista de un usuario.
type EstadoVinculo =
  | { estado: 'ninguno' }
  | { estado: 'pendiente_enviada'; pareja: Pareja; vinculoId: string }
  | { estado: 'pendiente_recibida'; pareja: Pareja; vinculoId: string }
  | {
      estado: 'activo';
      pareja: Pareja;
      vinculoId: string;
      limite_comun: string | null; // limite de la cuenta comun
      limite_pareja: string | null; // limite personal de la pareja (solo lectura)
    };

// Devuelve el unico vinculo en el que participa el usuario, si existe.
async function vinculoDe(usuarioId: string): Promise<VinculoRow | undefined> {
  const filas = await query<VinculoRow>(
    'SELECT * FROM vinculos WHERE usuario_a = $1 OR usuario_b = $1 LIMIT 1',
    [usuarioId],
  );
  return filas[0];
}

// Arma la respuesta de estado (incluye los datos de la pareja).
async function estadoDe(usuarioId: string): Promise<EstadoVinculo> {
  const v = await vinculoDe(usuarioId);
  if (!v) return { estado: 'ninguno' };

  const otroId = v.usuario_a === usuarioId ? v.usuario_b : v.usuario_a;
  const filas = await query<Pareja & { limite_balance: string | null }>(
    'SELECT id, nombre, correo, limite_balance FROM usuarios WHERE id = $1',
    [otroId],
  );
  const fila = filas[0];
  const pareja: Pareja = {
    id: fila.id,
    nombre: fila.nombre,
    correo: fila.correo,
  };

  if (v.estado === 'activo') {
    return {
      estado: 'activo',
      pareja,
      vinculoId: v.id,
      limite_comun: v.limite_balance,
      limite_pareja: fila.limite_balance,
    };
  }
  // Pendiente: depende de si yo la envie o la recibi.
  return v.usuario_a === usuarioId
    ? { estado: 'pendiente_enviada', pareja, vinculoId: v.id }
    : { estado: 'pendiente_recibida', pareja, vinculoId: v.id };
}

export async function rutasVinculos(app: FastifyInstance) {
  // Todas las rutas de este grupo requieren sesion.
  app.addHook('onRequest', app.authenticate);

  // Estado actual del vinculo del usuario.
  app.get('/vinculo', async (req) => estadoDe(req.user.sub));

  // Enviar invitacion por codigo unico o por correo.
  app.post('/vinculo/invitar', async (req, reply) => {
    const yo = req.user.sub;
    const body = (req.body ?? {}) as Record<string, unknown>;
    const codigo = String(body.codigo ?? '').trim().toUpperCase();
    const correo = String(body.correo ?? '').trim().toLowerCase();

    if (!codigo && !correo) {
      return reply.code(400).send({ error: 'Indica un código o un correo' });
    }

    // Buscar a la persona por el dato que se haya proporcionado.
    const objetivo = codigo
      ? (
          await query<Pareja>(
            'SELECT id, nombre, correo FROM usuarios WHERE codigo_unico = $1',
            [codigo],
          )
        )[0]
      : (
          await query<Pareja>(
            'SELECT id, nombre, correo FROM usuarios WHERE correo = $1',
            [correo],
          )
        )[0];

    if (!objetivo) {
      return reply.code(404).send({ error: 'No encontramos a esa persona' });
    }
    if (objetivo.id === yo) {
      return reply
        .code(400)
        .send({ error: 'No puedes vincularte contigo mismo' });
    }
    if (await vinculoDe(yo)) {
      return reply
        .code(409)
        .send({ error: 'Ya tienes un vínculo o una invitación pendiente' });
    }
    if (await vinculoDe(objetivo.id)) {
      return reply.code(409).send({
        error: 'Esa persona ya tiene un vínculo o una invitación pendiente',
      });
    }

    await query(
      `INSERT INTO vinculos (usuario_a, usuario_b, estado)
       VALUES ($1, $2, 'pendiente')`,
      [yo, objetivo.id],
    );
    return estadoDe(yo);
  });

  // Fijar/limpiar el limite de balance de la CUENTA COMUN (cualquiera de los dos).
  app.put('/vinculo/limite-balance', async (req, reply) => {
    const yo = req.user.sub;
    const v = await vinculoDe(yo);
    if (!v || v.estado !== 'activo') {
      return reply.code(400).send({ error: 'No tienes una cuenta común activa' });
    }

    const body = (req.body ?? {}) as Record<string, unknown>;
    let limite: number | null = null;
    if (body.limite_balance != null && body.limite_balance !== '') {
      limite = Number(body.limite_balance);
      if (!Number.isFinite(limite) || limite < 0) {
        return reply.code(400).send({ error: 'El límite no es válido' });
      }
    }
    await query('UPDATE vinculos SET limite_balance = $1 WHERE id = $2', [
      limite,
      v.id,
    ]);
    return estadoDe(yo);
  });

  // Aceptar una invitacion recibida (solo el destinatario puede).
  app.post('/vinculo/:id/aceptar', async (req, reply) => {
    const yo = req.user.sub;
    const { id } = req.params as { id: string };
    const v = (
      await query<VinculoRow>('SELECT * FROM vinculos WHERE id = $1', [id])
    )[0];

    if (!v || v.usuario_b !== yo || v.estado !== 'pendiente') {
      return reply.code(404).send({ error: 'Invitación no válida' });
    }
    await query("UPDATE vinculos SET estado = 'activo' WHERE id = $1", [id]);
    return estadoDe(yo);
  });

  // Eliminar el vinculo: sirve para rechazar, cancelar o desvincular.
  app.delete('/vinculo/:id', async (req, reply) => {
    const yo = req.user.sub;
    const { id } = req.params as { id: string };
    const v = (
      await query<VinculoRow>('SELECT * FROM vinculos WHERE id = $1', [id])
    )[0];

    if (!v || (v.usuario_a !== yo && v.usuario_b !== yo)) {
      return reply.code(404).send({ error: 'Vínculo no encontrado' });
    }
    await query('DELETE FROM vinculos WHERE id = $1', [id]);
    return { estado: 'ninguno' };
  });
}
