// Estado global de sesion: quien es el usuario, y como entra/sale.
import {
  createContext,
  useContext,
  useEffect,
  useState,
  type ReactNode,
} from 'react';
import { apiFetch, clearToken, getToken, setToken } from '../lib/api';
import type { Usuario } from '../types';

type RespuestaAuth = { token: string; usuario: Usuario };

type AuthContextValor = {
  usuario: Usuario | null;
  cargando: boolean;
  registrar: (
    correo: string,
    nombre: string,
    password: string,
  ) => Promise<void>;
  iniciarSesion: (correo: string, password: string) => Promise<void>;
  cerrarSesion: () => void;
  actualizarUsuario: (usuario: Usuario) => void;
};

const AuthContext = createContext<AuthContextValor | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [usuario, setUsuario] = useState<Usuario | null>(null);
  const [cargando, setCargando] = useState(true);

  // Al abrir la app, si hay token guardado intentamos restaurar la sesion.
  useEffect(() => {
    if (!getToken()) {
      setCargando(false);
      return;
    }
    apiFetch<{ usuario: Usuario }>('/auth/me')
      .then((data) => setUsuario(data.usuario))
      .catch(() => clearToken()) // token invalido o vencido
      .finally(() => setCargando(false));
  }, []);

  async function registrar(correo: string, nombre: string, password: string) {
    const data = await apiFetch<RespuestaAuth>('/auth/register', {
      method: 'POST',
      body: JSON.stringify({ correo, nombre, password }),
    });
    setToken(data.token);
    setUsuario(data.usuario);
  }

  async function iniciarSesion(correo: string, password: string) {
    const data = await apiFetch<RespuestaAuth>('/auth/login', {
      method: 'POST',
      body: JSON.stringify({ correo, password }),
    });
    setToken(data.token);
    setUsuario(data.usuario);
  }

  function cerrarSesion() {
    clearToken();
    setUsuario(null);
  }

  return (
    <AuthContext.Provider
      value={{
        usuario,
        cargando,
        registrar,
        iniciarSesion,
        cerrarSesion,
        actualizarUsuario: setUsuario,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth(): AuthContextValor {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth debe usarse dentro de <AuthProvider>');
  return ctx;
}
