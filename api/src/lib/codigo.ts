// Genera el codigo unico con el que tu pareja te encuentra en la app.
import { randomInt } from 'node:crypto';

// Sin caracteres ambiguos (0/O, 1/I/L) para que sea facil de dictar.
const ALFABETO = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';

export function generarCodigo(longitud = 8): string {
  let salida = '';
  for (let i = 0; i < longitud; i++) {
    salida += ALFABETO[randomInt(ALFABETO.length)];
  }
  return salida;
}
