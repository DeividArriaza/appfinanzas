// Rutas de autenticacion: registro, inicio de sesion y datos del usuario actual.
import type { FastifyInstance } from 'fastify';
import { query } from '../db.js';
import { hashPassword, verifyPassword } from '../lib/password.js';
import { generarCodigo } from '../lib/codigo.js';

type UsuarioRow = {
  id: string;
  correo: string;
  nombre: string;
  codigo_unico: string;
  moneda_preferida: 'GTQ' | 'USD';
  limite_balance: string | null;
  password_hash: string;
};

// Version segura para enviar al frontend: sin el hash de la contrasena.
type UsuarioPublico = Omit<UsuarioRow, 'password_hash'>;

function aPublico(u: UsuarioRow): UsuarioPublico {
  const { password_hash: _omitido, ...resto } = u;
  return resto;
}

// Validacion basica de correo (formato general, no exhaustiva).
const CORREO_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export async function rutasAuth(app: FastifyInstance) {
  // --- Registro ---
  app.post('/auth/register', async (req, reply) => {
    const body = (req.body ?? {}) as Record<string, unknown>;
    const correo = String(body.correo ?? '').trim().toLowerCase();
    const nombre = String(body.nombre ?? '').trim();
    const password = String(body.password ?? '');

    if (!correo || !nombre || !password) {
      return reply.code(400).send({ error: 'Faltan campos obligatorios' });
    }
    if (!CORREO_RE.test(correo)) {
      return reply.code(400).send({ error: 'El correo no es válido' });
    }
    if (password.length < 8) {
      return reply
        .code(400)
        .send({ error: 'La contraseña debe tener al menos 8 caracteres' });
    }

    const existentes = await query('SELECT id FROM usuarios WHERE correo = $1', [
      correo,
    ]);
    if (existentes.length > 0) {
      return reply.code(409).send({ error: 'Ese correo ya está registrado' });
    }

    const hash = await hashPassword(password);

    // Insertamos reintentando si el codigo unico choca (muy improbable).
    let filas: UsuarioRow[] = [];
    for (let intento = 0; intento < 5; intento++) {
      try {
        filas = await query<UsuarioRow>(
          `INSERT INTO usuarios (correo, nombre, codigo_unico, password_hash)
           VALUES ($1, $2, $3, $4)
           RETURNING *`,
          [correo, nombre, generarCodigo(), hash],
        );
        break;
      } catch (e) {
        const err = e as { code?: string; constraint?: string };
        // 23505 = violacion de unicidad. Si fue por el codigo, reintentar.
        if (err.code === '23505' && err.constraint?.includes('codigo')) continue;
        throw e;
      }
    }

    if (filas.length === 0) {
      return reply
        .code(500)
        .send({ error: 'No se pudo generar el código único, intenta de nuevo' });
    }

    const usuario = filas[0];
    const token = app.jwt.sign({ sub: usuario.id });
    return { token, usuario: aPublico(usuario) };
  });

  // --- Inicio de sesion ---
  app.post('/auth/login', async (req, reply) => {
    const body = (req.body ?? {}) as Record<string, unknown>;
    const correo = String(body.correo ?? '').trim().toLowerCase();
    const password = String(body.password ?? '');

    if (!correo || !password) {
      return reply.code(400).send({ error: 'Faltan campos obligatorios' });
    }

    const filas = await query<UsuarioRow>(
      'SELECT * FROM usuarios WHERE correo = $1',
      [correo],
    );
    const usuario = filas[0];

    // Mensaje generico a proposito: no revelamos si el correo existe.
    const valido =
      usuario && (await verifyPassword(password, usuario.password_hash));
    if (!valido) {
      return reply.code(401).send({ error: 'Correo o contraseña incorrectos' });
    }

    const token = app.jwt.sign({ sub: usuario.id });
    return { token, usuario: aPublico(usuario) };
  });

  // --- Usuario actual (ruta protegida) ---
  app.get('/auth/me', { onRequest: [app.authenticate] }, async (req, reply) => {
    const filas = await query<UsuarioRow>(
      'SELECT * FROM usuarios WHERE id = $1',
      [req.user.sub],
    );
    if (filas.length === 0) {
      return reply.code(404).send({ error: 'Usuario no encontrado' });
    }
    return { usuario: aPublico(filas[0]) };
  });

  // --- Fijar/limpiar el limite de balance (ruta protegida) ---
  app.put(
    '/auth/limite-balance',
    { onRequest: [app.authenticate] },
    async (req, reply) => {
      const body = (req.body ?? {}) as Record<string, unknown>;
      // null o vacio = quitar la alerta.
      let limite: number | null = null;
      if (body.limite_balance != null && body.limite_balance !== '') {
        limite = Number(body.limite_balance);
        if (!Number.isFinite(limite) || limite < 0) {
          return reply.code(400).send({ error: 'El límite no es válido' });
        }
      }
      const filas = await query<UsuarioRow>(
        'UPDATE usuarios SET limite_balance = $1 WHERE id = $2 RETURNING *',
        [limite, req.user.sub],
      );
      return { usuario: aPublico(filas[0]) };
    },
  );
}
