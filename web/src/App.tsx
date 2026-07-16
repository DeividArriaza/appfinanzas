import { AuthProvider, useAuth } from './auth/context';
import AuthScreen from './screens/AuthScreen';
import Dashboard from './screens/Dashboard';

// Decide que pantalla mostrar segun el estado de la sesion.
function Enrutador() {
  const { usuario, cargando } = useAuth();

  if (cargando) {
    return (
      <main className="flex min-h-screen items-center justify-center">
        <p className="text-sm text-muted">Cargando...</p>
      </main>
    );
  }

  return usuario ? <Dashboard /> : <AuthScreen />;
}

export default function App() {
  return (
    <AuthProvider>
      <Enrutador />
    </AuthProvider>
  );
}
