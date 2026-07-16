// Cifrado de contrasenas con bcrypt (bcryptjs: misma familia, sin compilar nativo).
import bcrypt from 'bcryptjs';

// El "costo" 10 es un buen equilibrio entre seguridad y velocidad.
const COSTO = 10;

export function hashPassword(plano: string): Promise<string> {
  return bcrypt.hash(plano, COSTO);
}

export function verifyPassword(plano: string, hash: string): Promise<boolean> {
  return bcrypt.compare(plano, hash);
}
