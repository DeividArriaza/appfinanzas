// Conversion y moneda de visualizacion (el switch global del menu).
import type { Moneda } from './format';

// Tipo de cambio de respaldo (1 USD = X GTQ) por si aun no se cargo el real.
// El valor vigente lo entrega la API en GET /tipo-cambio.
export const TIPO_CAMBIO_RESPALDO = 7.8;

// Convierte un monto de una moneda a otra usando el tipo de cambio dado
// (gtqPorUsd = cuantos GTQ vale 1 USD).
export function convertir(
  monto: number,
  de: Moneda,
  a: Moneda,
  gtqPorUsd: number = TIPO_CAMBIO_RESPALDO,
): number {
  if (de === a) return monto;
  if (de === 'USD' && a === 'GTQ') return monto * gtqPorUsd;
  if (de === 'GTQ' && a === 'USD') return monto / gtqPorUsd;
  return monto;
}

const CLAVE = 'cuencla_moneda_vista';

// Moneda elegida para ver el menu (persistida). Por defecto, la preferida.
export function getMonedaVista(preferida: Moneda): Moneda {
  const v = localStorage.getItem(CLAVE);
  return v === 'GTQ' || v === 'USD' ? v : preferida;
}

export function setMonedaVista(m: Moneda): void {
  localStorage.setItem(CLAVE, m);
}
