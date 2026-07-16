// Ayudantes para la vista de pareja: quien es la pareja activa y de que usuarios
// hay que traer los datos segun la vista elegida (mio, pareja, comun).
import { query } from '../db.js';

// Devuelve el id de la pareja si hay un vinculo ACTIVO; si no, null.
export async function parejaActivaId(usuarioId: string): Promise<string | null> {
  const filas = await query<{ usuario_a: string; usuario_b: string }>(
    `SELECT usuario_a, usuario_b FROM vinculos
     WHERE (usuario_a = $1 OR usuario_b = $1) AND estado = 'activo'
     LIMIT 1`,
    [usuarioId],
  );
  const v = filas[0];
  if (!v) return null;
  return v.usuario_a === usuarioId ? v.usuario_b : v.usuario_a;
}

// Ids de usuario cuyos datos se deben incluir segun la vista.
// - 'pareja': solo la pareja (error si no hay vinculo).
// - 'comun': ambos (o solo yo si no hay pareja).
// - cualquier otro ('mio'): solo yo.
export async function idsDeVista(
  usuarioId: string,
  vista: string,
): Promise<{ ids: string[] } | { error: string }> {
  if (vista === 'pareja') {
    const p = await parejaActivaId(usuarioId);
    if (!p) return { error: 'No tienes una pareja vinculada' };
    return { ids: [p] };
  }
  if (vista === 'comun') {
    const p = await parejaActivaId(usuarioId);
    return { ids: p ? [usuarioId, p] : [usuarioId] };
  }
  return { ids: [usuarioId] };
}
