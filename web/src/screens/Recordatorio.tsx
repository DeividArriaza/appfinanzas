// Recordatorio diario: el usuario elige una hora y recibe una notificacion
// push todos los dias para registrar sus gastos.
import { useEffect, useState } from 'react';
import { Card, Button } from '../components/ui';
import { apiFetch } from '../lib/api';

type Config = { activo: boolean; hora: string; zona_horaria: string };

// La llave VAPID viene en base64url; PushManager la pide como bytes.
function base64UrlABytes(base64: string): Uint8Array<ArrayBuffer> {
  const relleno = '='.repeat((4 - (base64.length % 4)) % 4);
  const b64 = (base64 + relleno).replace(/-/g, '+').replace(/_/g, '/');
  const bin = atob(b64);
  const bytes = new Uint8Array(new ArrayBuffer(bin.length));
  for (let i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i);
  return bytes;
}

const soportado =
  typeof window !== 'undefined' &&
  'serviceWorker' in navigator &&
  'PushManager' in window &&
  'Notification' in window;

// Pide permiso, suscribe este dispositivo y registra la suscripcion en la API.
async function suscribirDispositivo(): Promise<void> {
  const permiso = await Notification.requestPermission();
  if (permiso !== 'granted') {
    throw new Error(
      'No diste permiso de notificaciones. Actívalo en la configuración del navegador.',
    );
  }
  const reg = await navigator.serviceWorker.ready;
  let sub = await reg.pushManager.getSubscription();
  if (!sub) {
    const { llave } = await apiFetch<{ llave: string }>('/push/llave-publica');
    sub = await reg.pushManager.subscribe({
      userVisibleOnly: true,
      applicationServerKey: base64UrlABytes(llave),
    });
  }
  await apiFetch('/push/suscripcion', {
    method: 'POST',
    body: JSON.stringify(sub.toJSON()),
  });
}

export default function Recordatorio() {
  const [activo, setActivo] = useState(false);
  const [hora, setHora] = useState('20:00');
  const [habilitado, setHabilitado] = useState(true);
  const [cargando, setCargando] = useState(true);
  const [guardando, setGuardando] = useState(false);
  const [mensaje, setMensaje] = useState<{ texto: string; error?: boolean } | null>(null);

  useEffect(() => {
    apiFetch<{ recordatorio: Config | null; habilitado: boolean }>('/recordatorio')
      .then((r) => {
        setHabilitado(r.habilitado);
        if (r.recordatorio) {
          setActivo(r.recordatorio.activo);
          setHora(r.recordatorio.hora);
        }
      })
      .catch(() => setHabilitado(false))
      .finally(() => setCargando(false));
  }, []);

  async function guardar(nuevoActivo: boolean) {
    setGuardando(true);
    setMensaje(null);
    try {
      if (nuevoActivo) await suscribirDispositivo();
      const zona = Intl.DateTimeFormat().resolvedOptions().timeZone || 'America/Guatemala';
      await apiFetch('/recordatorio', {
        method: 'PUT',
        body: JSON.stringify({ activo: nuevoActivo, hora, zona_horaria: zona }),
      });
      setActivo(nuevoActivo);
      setMensaje({
        texto: nuevoActivo
          ? `Listo. Te recordaremos todos los días a las ${hora}.`
          : 'Recordatorio desactivado.',
      });
    } catch (e) {
      setMensaje({ texto: (e as Error).message, error: true });
    } finally {
      setGuardando(false);
    }
  }

  async function probar() {
    setMensaje(null);
    try {
      await suscribirDispositivo();
      await apiFetch('/recordatorio/prueba', { method: 'POST' });
      setMensaje({ texto: 'Notificación de prueba enviada.' });
    } catch (e) {
      setMensaje({ texto: (e as Error).message, error: true });
    }
  }

  if (cargando) return null;

  return (
    <Card className="space-y-4 p-6">
      <div className="space-y-1">
        <h2 className="text-base font-bold text-ink">Recordatorio diario</h2>
        <p className="text-sm text-muted">
          Recibe una notificación todos los días para registrar tus gastos.
        </p>
      </div>

      {!soportado || !habilitado ? (
        <p className="text-sm text-muted">
          {!soportado
            ? 'Este navegador no soporta notificaciones. En iPhone, primero agrega Cuencla a la pantalla de inicio (iOS 16.4 o superior) y ábrela desde ahí.'
            : 'Las notificaciones aún no están configuradas en el servidor.'}
        </p>
      ) : (
        <>
          <label className="flex items-center justify-between gap-4 text-sm">
            <span className="text-muted">Hora</span>
            <input
              type="time"
              value={hora}
              onChange={(e) => setHora(e.target.value)}
              className="rounded-control border border-line bg-card px-4 py-2 font-semibold text-ink nums focus:outline-none focus:ring-2 focus:ring-primary/30"
            />
          </label>

          <div className="space-y-2">
            <Button disabled={guardando || !hora} onClick={() => guardar(true)}>
              {activo ? 'Guardar hora' : 'Activar recordatorio'}
            </Button>
            {activo && (
              <>
                <Button variant="secondary" onClick={probar} disabled={guardando}>
                  Enviar prueba
                </Button>
                <Button
                  variant="secondary"
                  onClick={() => guardar(false)}
                  disabled={guardando}
                >
                  Desactivar
                </Button>
              </>
            )}
          </div>
        </>
      )}

      {mensaje && (
        <p className={`text-sm ${mensaje.error ? 'text-expense' : 'text-muted'}`}>
          {mensaje.texto}
        </p>
      )}
    </Card>
  );
}
