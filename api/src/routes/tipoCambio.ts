// Tipo de cambio USD -> GTQ, obtenido de una API gratuita (open.er-api.com),
// con cache de ~1 dia y respaldo por si la API falla.
import type { FastifyInstance } from 'fastify';

const URL_API = 'https://open.er-api.com/v6/latest/USD';
const UN_DIA_MS = 24 * 60 * 60 * 1000;
// Valor de respaldo si nunca se ha podido consultar la API.
const RESPALDO = 7.8;

type Cache = { rate: number; ts: number };
let cache: Cache | null = null;

type Respuesta = {
  gtq_por_usd: number;
  fuente: 'api' | 'cache' | 'respaldo';
  actualizado: string | null;
};

async function obtenerTipoCambio(): Promise<Respuesta> {
  // Si el cache es reciente (menos de un dia), usarlo.
  if (cache && Date.now() - cache.ts < UN_DIA_MS) {
    return {
      gtq_por_usd: cache.rate,
      fuente: 'cache',
      actualizado: new Date(cache.ts).toISOString(),
    };
  }

  try {
    const res = await fetch(URL_API);
    const data = (await res.json()) as { rates?: Record<string, number> };
    const rate = data.rates?.GTQ;
    if (typeof rate === 'number' && rate > 0) {
      cache = { rate, ts: Date.now() };
      return {
        gtq_por_usd: rate,
        fuente: 'api',
        actualizado: new Date(cache.ts).toISOString(),
      };
    }
    throw new Error('La respuesta no trae GTQ');
  } catch {
    // Si falla, usar el ultimo valor conocido o el respaldo.
    if (cache) {
      return {
        gtq_por_usd: cache.rate,
        fuente: 'cache',
        actualizado: new Date(cache.ts).toISOString(),
      };
    }
    return { gtq_por_usd: RESPALDO, fuente: 'respaldo', actualizado: null };
  }
}

export async function rutasTipoCambio(app: FastifyInstance) {
  app.addHook('onRequest', app.authenticate);
  app.get('/tipo-cambio', async () => obtenerTipoCambio());
}
