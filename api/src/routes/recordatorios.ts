// Recordatorio diario por notificacion push: "registra tus gastos de hoy".
// Usa Web Push (VAPID). Si faltan las llaves VAPID en el entorno, la funcion
// queda desactivada y los endpoints responden 503 sin romper la API.
import type { FastifyInstance } from 'fastify';
import webpush from 'web-push';
import { query } from '../db.js';

const VAPID_PUBLIC = process.env.VAPID_PUBLIC_KEY ?? '';
const VAPID_PRIVATE = process.env.VAPID_PRIVATE_KEY ?? '';
const VAPID_SUBJECT = process.env.VAPID_SUBJECT || 'mailto:admin@cuencla.duckdns.org';
const pushHabilitado = Boolean(VAPID_PUBLIC && VAPID_PRIVATE);

if (pushHabilitado) {
  webpush.setVapidDetails(VAPID_SUBJECT, VAPID_PUBLIC, VAPID_PRIVATE);
}

const HORA_RE = /^([01]\d|2[0-3]):[0-5]\d$/;

function zonaValida(tz: string): boolean {
  try {
    new Intl.DateTimeFormat('es', { timeZone: tz });
    return true;
  } catch {
    return false;
  }
}

type RecordatorioRow = { activo: boolean; hora: string; zona_horaria: string };
type SuscripcionRow = { id: string; endpoint: string; p256dh: string; auth: string };

// Envia una notificacion a todas las suscripciones del usuario. Borra las que
// el servicio de push reporta como vencidas (404/410). Devuelve cuantas llegaron.
async function enviarAUsuario(usuarioId: string, payload: object): Promise<number> {
  const subs = await query<SuscripcionRow>(
    'SELECT id, endpoint, p256dh, auth FROM push_suscripciones WHERE usuario_id = $1',
    [usuarioId],
  );
  let enviados = 0;
  for (const s of subs) {
    try {
      await webpush.sendNotification(
        { endpoint: s.endpoint, keys: { p256dh: s.p256dh, auth: s.auth } },
        JSON.stringify(payload),
        { TTL: 60 * 60 * 6 },
      );
      enviados++;
    } catch (e) {
      const status = (e as { statusCode?: number }).statusCode;
      if (status === 404 || status === 410) {
        await query('DELETE FROM push_suscripciones WHERE id = $1', [s.id]);
      } else {
        throw e;
      }
    }
  }
  return enviados;
}

const MENSAJE = {
  title: 'Cuencla',
  body: '¿Ya registraste tus gastos de hoy? Toma un minuto para anotarlos.',
  url: '/',
};

// Revisa cada minuto que recordatorios ya alcanzaron su hora local de hoy y
// aun no se enviaron. La ventana de 2 horas permite recuperar envios si la
// API estuvo reiniciandose justo a la hora configurada, sin mandar tarde de mas.
export function iniciarProgramadorRecordatorios(app: FastifyInstance) {
  if (!pushHabilitado) {
    app.log.warn('Recordatorios push desactivados: faltan VAPID_PUBLIC_KEY/VAPID_PRIVATE_KEY');
    return;
  }
  let ocupado = false;
  const revisar = async () => {
    if (ocupado) return;
    ocupado = true;
    try {
      // Reclamamos los pendientes marcando ultimo_envio en el mismo UPDATE:
      // asi no se repite el envio aunque haya dos procesos de la API.
      const pendientes = await query<{ usuario_id: string }>(
        `UPDATE recordatorios r
            SET ultimo_envio = (now() AT TIME ZONE r.zona_horaria)::date
          WHERE r.activo
            AND (r.ultimo_envio IS NULL
                 OR r.ultimo_envio < (now() AT TIME ZONE r.zona_horaria)::date)
            AND (now() AT TIME ZONE r.zona_horaria)::time >= r.hora
            AND (now() AT TIME ZONE r.zona_horaria)::time - r.hora < interval '2 hours'
          RETURNING r.usuario_id`,
      );
      for (const p of pendientes) {
        try {
          await enviarAUsuario(p.usuario_id, MENSAJE);
        } catch (e) {
          app.log.error(e, 'No se pudo enviar el recordatorio');
        }
      }
    } catch (e) {
      app.log.error(e, 'Error revisando recordatorios');
    } finally {
      ocupado = false;
    }
  };
  setInterval(revisar, 60_000).unref();
  void revisar();
}

export async function rutasRecordatorios(app: FastifyInstance) {
  // Llave publica VAPID: el navegador la necesita para suscribirse.
  app.get('/push/llave-publica', async (_req, reply) => {
    if (!pushHabilitado) {
      return reply.code(503).send({ error: 'Las notificaciones no están configuradas en el servidor' });
    }
    return { llave: VAPID_PUBLIC };
  });

  // Registrar (o actualizar) la suscripcion de este dispositivo.
  app.post('/push/suscripcion', { onRequest: [app.authenticate] }, async (req, reply) => {
    const body = (req.body ?? {}) as {
      endpoint?: unknown;
      keys?: { p256dh?: unknown; auth?: unknown };
    };
    const endpoint = typeof body.endpoint === 'string' ? body.endpoint : '';
    const p256dh = typeof body.keys?.p256dh === 'string' ? body.keys.p256dh : '';
    const auth = typeof body.keys?.auth === 'string' ? body.keys.auth : '';
    if (!endpoint.startsWith('https://') || !p256dh || !auth) {
      return reply.code(400).send({ error: 'Suscripción no válida' });
    }
    await query(
      `INSERT INTO push_suscripciones (usuario_id, endpoint, p256dh, auth)
       VALUES ($1, $2, $3, $4)
       ON CONFLICT (endpoint)
       DO UPDATE SET usuario_id = EXCLUDED.usuario_id, p256dh = EXCLUDED.p256dh, auth = EXCLUDED.auth`,
      [req.user.sub, endpoint, p256dh, auth],
    );
    return { ok: true };
  });

  // Quitar la suscripcion de este dispositivo.
  app.delete('/push/suscripcion', { onRequest: [app.authenticate] }, async (req) => {
    const body = (req.body ?? {}) as { endpoint?: unknown };
    if (typeof body.endpoint === 'string') {
      await query('DELETE FROM push_suscripciones WHERE endpoint = $1 AND usuario_id = $2', [
        body.endpoint,
        req.user.sub,
      ]);
    }
    return { ok: true };
  });

  // Configuracion actual del recordatorio (null si nunca se configuro).
  app.get('/recordatorio', { onRequest: [app.authenticate] }, async (req) => {
    const filas = await query<RecordatorioRow>(
      `SELECT activo, to_char(hora, 'HH24:MI') AS hora, zona_horaria
         FROM recordatorios WHERE usuario_id = $1`,
      [req.user.sub],
    );
    return { recordatorio: filas[0] ?? null, habilitado: pushHabilitado };
  });

  // Guardar hora / activar / desactivar.
  app.put('/recordatorio', { onRequest: [app.authenticate] }, async (req, reply) => {
    const body = (req.body ?? {}) as Record<string, unknown>;
    const activo = body.activo !== false;
    const hora = String(body.hora ?? '');
    const zona = String(body.zona_horaria || 'America/Guatemala');
    if (!HORA_RE.test(hora)) {
      return reply.code(400).send({ error: 'La hora no es válida (HH:MM)' });
    }
    if (!zonaValida(zona)) {
      return reply.code(400).send({ error: 'La zona horaria no es válida' });
    }
    // Si se cambia la hora a una posterior a la actual, que pueda sonar hoy.
    const filas = await query<RecordatorioRow>(
      `INSERT INTO recordatorios (usuario_id, activo, hora, zona_horaria)
       VALUES ($1, $2, $3, $4)
       ON CONFLICT (usuario_id) DO UPDATE
         SET activo = EXCLUDED.activo,
             hora = EXCLUDED.hora,
             zona_horaria = EXCLUDED.zona_horaria,
             ultimo_envio = CASE
               WHEN EXCLUDED.hora <> recordatorios.hora
                 OR EXCLUDED.zona_horaria <> recordatorios.zona_horaria
               THEN NULL ELSE recordatorios.ultimo_envio END
       RETURNING activo, to_char(hora, 'HH24:MI') AS hora, zona_horaria`,
      [req.user.sub, activo, hora, zona],
    );
    return { recordatorio: filas[0] };
  });

  // Notificacion de prueba para confirmar que el dispositivo la recibe.
  app.post('/recordatorio/prueba', { onRequest: [app.authenticate] }, async (req, reply) => {
    if (!pushHabilitado) {
      return reply.code(503).send({ error: 'Las notificaciones no están configuradas en el servidor' });
    }
    const enviados = await enviarAUsuario(req.user.sub, {
      ...MENSAJE,
      body: '¡Listo! Así se verá tu recordatorio diario.',
    });
    if (enviados === 0) {
      return reply.code(404).send({ error: 'Este usuario no tiene dispositivos suscritos' });
    }
    return { enviados };
  });
}
