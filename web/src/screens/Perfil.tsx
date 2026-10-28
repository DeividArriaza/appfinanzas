// Seccion "Perfil": datos de la cuenta, vinculacion de pareja y cerrar sesion.
import { Card, Button } from '../components/ui';
import { useAuth } from '../auth/context';
import VinculoPareja from './VinculoPareja';
import Recordatorio from './Recordatorio';

export default function Perfil() {
  const { usuario, cerrarSesion } = useAuth();
  if (!usuario) return null;

  return (
    <div className="space-y-8">
      <header className="space-y-1">
        <h1 className="text-2xl font-bold text-ink">Perfil</h1>
        <p className="text-sm text-muted">Tu cuenta y tu pareja</p>
      </header>

      {/* Datos de la cuenta. */}
      <Card className="p-6">
        <dl className="space-y-4 text-sm">
          <div className="flex justify-between gap-4">
            <dt className="shrink-0 text-muted">Nombre</dt>
            <dd className="min-w-0 break-words text-right font-medium text-ink">
              {usuario.nombre}
            </dd>
          </div>
          <div className="flex justify-between gap-4">
            <dt className="shrink-0 text-muted">Correo</dt>
            <dd className="min-w-0 break-words text-right font-medium text-ink">
              {usuario.correo}
            </dd>
          </div>
          <div className="flex justify-between gap-4">
            <dt className="shrink-0 text-muted">Moneda preferida</dt>
            <dd className="min-w-0 break-words text-right font-medium text-ink">
              {usuario.moneda_preferida}
            </dd>
          </div>
        </dl>
      </Card>

      {/* Vinculacion de pareja. */}
      <VinculoPareja usuario={usuario} />

      {/* Recordatorio diario por notificacion. */}
      <Recordatorio />

      <Button variant="secondary" onClick={cerrarSesion}>
        Cerrar sesión
      </Button>
    </div>
  );
}
