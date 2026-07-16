// Conexion a Postgres usando un "pool" de conexiones reutilizables.
// El pool evita abrir y cerrar una conexion nueva en cada consulta.
import pg from 'pg';

const { Pool } = pg;

const connectionString = process.env.DATABASE_URL;
if (!connectionString) {
  throw new Error('Falta la variable de entorno DATABASE_URL');
}

export const pool = new Pool({ connectionString });

// Ayudante corto para hacer consultas. Devuelve las filas directamente.
export async function query<T = unknown>(
  text: string,
  params?: unknown[],
): Promise<T[]> {
  const result = await pool.query(text, params);
  return result.rows as T[];
}
