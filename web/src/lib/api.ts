// Cliente minimo para hablar con la API. Agrega el token de sesion si existe
// y convierte los errores del servidor en excepciones con mensaje legible.
// URL de la API. Si VITE_API_URL esta definida (util en produccion) se usa;
// si no, se deriva del host por el que se abrio la app. Asi funciona tanto en
// "localhost" como al abrirla desde el telefono con la IP de la red local.
const API_URL =
  import.meta.env.VITE_API_URL ||
  `${window.location.protocol}//${window.location.hostname}:3001`;

const CLAVE_TOKEN = 'cuencla_token';

export function getToken(): string | null {
  return localStorage.getItem(CLAVE_TOKEN);
}

export function setToken(token: string): void {
  localStorage.setItem(CLAVE_TOKEN, token);
}

export function clearToken(): void {
  localStorage.removeItem(CLAVE_TOKEN);
}

export async function apiFetch<T = unknown>(
  path: string,
  options: RequestInit = {},
): Promise<T> {
  const token = getToken();
  const headers: Record<string, string> = {
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
    ...((options.headers as Record<string, string>) ?? {}),
  };
  // Solo declaramos JSON cuando de verdad enviamos un cuerpo. Si no, Fastify
  // rechaza con 400 al intentar parsear un cuerpo vacio.
  if (options.body != null) {
    headers['Content-Type'] = 'application/json';
  }

  const res = await fetch(`${API_URL}${path}`, { ...options, headers });

  const data = (await res.json().catch(() => ({}))) as Record<string, unknown>;
  if (!res.ok) {
    const mensaje =
      typeof data.error === 'string' ? data.error : 'Ocurrio un error';
    throw new Error(mensaje);
  }
  return data as T;
}
