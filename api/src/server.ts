// Punto de entrada de la API.
import Fastify from 'fastify';
import cors from '@fastify/cors';
import jwt from '@fastify/jwt';
import { query } from './db.js';
import { rutasAuth } from './routes/auth.js';
import { rutasVinculos } from './routes/vinculos.js';
import { rutasPresupuestos } from './routes/presupuestos.js';
import { rutasMovimientos } from './routes/movimientos.js';
import { rutasSubcategorias } from './routes/subcategorias.js';
import { rutasTipoCambio } from './routes/tipoCambio.js';

const app = Fastify({ logger: true });

// Permitir que el navegador (frontend) llame a esta API desde otro puerto.
await app.register(cors, { origin: true });

// Sesiones con JWT firmadas con el secreto del entorno.
const jwtSecret = process.env.JWT_SECRET;
if (!jwtSecret) {
  throw new Error('Falta la variable de entorno JWT_SECRET');
}
// Los tokens vencen a los 30 dias (si se filtra uno, no sirve para siempre).
await app.register(jwt, {
  secret: jwtSecret,
  sign: { expiresIn: '30d' },
});

// Decorador para proteger rutas: verifica el token antes de entrar al handler.
app.decorate('authenticate', async (request, reply) => {
  try {
    await request.jwtVerify();
  } catch {
    reply.code(401).send({ error: 'No autorizado' });
  }
});

// Manejador de errores: registra el detalle real en el log, pero al cliente le
// responde algo generico en los 500 (no filtra internals como nombres de tablas).
app.setErrorHandler((err, request, reply) => {
  request.log.error(err);
  const status = err.statusCode ?? 500;
  reply
    .code(status)
    .send({ error: status >= 500 ? 'Error interno del servidor' : err.message });
});

// Endpoint de salud: confirma que la API responde y que la base contesta.
app.get('/health', async () => {
  const filas = await query<{ ahora: string }>('SELECT now() AS ahora');
  return {
    estado: 'ok',
    base_de_datos: 'conectada',
    hora_servidor: filas[0]?.ahora,
  };
});

// Rutas de autenticacion (registro, login, usuario actual).
await app.register(rutasAuth);

// Rutas de vinculacion de pareja.
await app.register(rutasVinculos);

// Rutas de presupuestos.
await app.register(rutasPresupuestos);

// Rutas de movimientos.
await app.register(rutasMovimientos);

// Rutas de subcategorias.
await app.register(rutasSubcategorias);

// Ruta del tipo de cambio (USD -> GTQ).
await app.register(rutasTipoCambio);

const port = Number(process.env.API_PORT ?? 3000);

try {
  // host 0.0.0.0 para que sea accesible desde fuera del contenedor.
  await app.listen({ port, host: '0.0.0.0' });
} catch (err) {
  app.log.error(err);
  process.exit(1);
}
