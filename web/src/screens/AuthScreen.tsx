// Pantalla de acceso: alterna entre iniciar sesion y crear cuenta.
import { useState, type FormEvent } from 'react';
import { Card, Button, Field } from '../components/ui';
import { useAuth } from '../auth/context';

type Modo = 'login' | 'registro';

export default function AuthScreen() {
  const { iniciarSesion, registrar } = useAuth();
  const [modo, setModo] = useState<Modo>('login');
  const [correo, setCorreo] = useState('');
  const [nombre, setNombre] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [enviando, setEnviando] = useState(false);

  const esRegistro = modo === 'registro';

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);
    setEnviando(true);
    try {
      if (esRegistro) {
        await registrar(correo, nombre, password);
      } else {
        await iniciarSesion(correo, password);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Ocurrio un error');
    } finally {
      setEnviando(false);
    }
  }

  function cambiarModo() {
    setModo(esRegistro ? 'login' : 'registro');
    setError(null);
  }

  return (
    <main className="min-h-screen px-6 py-16">
      <div className="mx-auto w-full max-w-md space-y-8">
        <header className="space-y-2">
          <h1 className="text-2xl font-bold text-ink">Cuencla</h1>
          <p className="text-sm text-muted">
            {esRegistro
              ? 'Crea tu cuenta para empezar'
              : 'Inicia sesión para continuar'}
          </p>
        </header>

        <Card className="p-8">
          <form onSubmit={onSubmit} className="space-y-6">
            {esRegistro && (
              <Field
                id="nombre"
                label="Nombre"
                type="text"
                autoComplete="name"
                value={nombre}
                onChange={(e) => setNombre(e.target.value)}
                placeholder="Tu nombre"
                required
              />
            )}

            <Field
              id="correo"
              label="Correo"
              type="email"
              autoComplete="email"
              value={correo}
              onChange={(e) => setCorreo(e.target.value)}
              placeholder="tucorreo@ejemplo.com"
              required
            />

            <Field
              id="password"
              label="Contraseña"
              type="password"
              autoComplete={esRegistro ? 'new-password' : 'current-password'}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder={esRegistro ? 'Mínimo 8 caracteres' : 'Tu contraseña'}
              required
            />

            {error && <p className="text-sm text-expense">{error}</p>}

            <Button type="submit" disabled={enviando}>
              {enviando
                ? 'Un momento...'
                : esRegistro
                  ? 'Crear cuenta'
                  : 'Iniciar sesión'}
            </Button>
          </form>
        </Card>

        <p className="text-center text-sm text-muted">
          {esRegistro ? '¿Ya tienes cuenta?' : '¿No tienes cuenta?'}{' '}
          <button
            type="button"
            onClick={cambiarModo}
            className="font-semibold text-primary hover:underline"
          >
            {esRegistro ? 'Inicia sesión' : 'Crea una'}
          </button>
        </p>
      </div>
    </main>
  );
}
