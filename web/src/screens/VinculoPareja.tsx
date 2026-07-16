// Tarjeta del panel para gestionar el vinculo de pareja segun su estado:
// sin vinculo (invitar), invitacion enviada, invitacion recibida, o activo.
import { useEffect, useState, type FormEvent } from 'react';
import { Card, Button, Field } from '../components/ui';
import { apiFetch } from '../lib/api';
import type { EstadoVinculo, Usuario } from '../types';

export default function VinculoPareja({ usuario }: { usuario: Usuario }) {
  const [estado, setEstado] = useState<EstadoVinculo | null>(null);
  const [valor, setValor] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [ocupado, setOcupado] = useState(false);

  // Cargar el estado del vinculo al montar la tarjeta.
  useEffect(() => {
    apiFetch<EstadoVinculo>('/vinculo')
      .then(setEstado)
      .catch(() => setEstado({ estado: 'ninguno' }));
  }, []);

  // Envuelve una accion: maneja "ocupado", errores y refresca el estado.
  async function accion(fn: () => Promise<EstadoVinculo>) {
    setError(null);
    setOcupado(true);
    try {
      setEstado(await fn());
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Ocurrió un error');
    } finally {
      setOcupado(false);
    }
  }

  function invitar(e: FormEvent) {
    e.preventDefault();
    // Si el texto tiene "@" lo tratamos como correo; si no, como código.
    const texto = valor.trim();
    if (!texto) return;
    const cuerpo = texto.includes('@') ? { correo: texto } : { codigo: texto };
    accion(() =>
      apiFetch<EstadoVinculo>('/vinculo/invitar', {
        method: 'POST',
        body: JSON.stringify(cuerpo),
      }),
    ).then(() => setValor(''));
  }

  const aceptar = (id: string) =>
    accion(() =>
      apiFetch<EstadoVinculo>(`/vinculo/${id}/aceptar`, { method: 'POST' }),
    );

  const eliminar = (id: string) =>
    accion(() =>
      apiFetch<EstadoVinculo>(`/vinculo/${id}`, { method: 'DELETE' }),
    );

  if (!estado) {
    return (
      <Card className="p-6">
        <p className="text-sm text-muted">Cargando vínculo...</p>
      </Card>
    );
  }

  return (
    <Card className="p-6">
      <h2 className="text-sm font-semibold text-ink">Tu pareja</h2>

      {/* Sin vinculo: mostrar tu codigo e invitar a alguien. */}
      {estado.estado === 'ninguno' && (
        <div className="mt-4 space-y-6">
          <div>
            <p className="text-sm text-muted">Tu código para que te encuentren</p>
            <p className="nums mt-1 text-2xl font-extrabold tracking-widest text-ink">
              {usuario.codigo_unico}
            </p>
          </div>

          <form onSubmit={invitar} className="space-y-4">
            <Field
              id="pareja"
              label="Invitar por código o correo"
              value={valor}
              onChange={(e) => setValor(e.target.value)}
              placeholder="Código o correo de tu pareja"
            />
            {error && <p className="text-sm text-expense">{error}</p>}
            <Button type="submit" disabled={ocupado}>
              {ocupado ? 'Enviando...' : 'Enviar invitación'}
            </Button>
          </form>
        </div>
      )}

      {/* Invitacion enviada: esperando respuesta. */}
      {estado.estado === 'pendiente_enviada' && (
        <div className="mt-4 space-y-4">
          <p className="break-words text-sm text-ink">
            Invitaste a <strong>{estado.pareja.nombre}</strong>. Esperando que
            acepte.
          </p>
          {error && <p className="text-sm text-expense">{error}</p>}
          <Button
            variant="secondary"
            disabled={ocupado}
            onClick={() => eliminar(estado.vinculoId)}
          >
            Cancelar invitación
          </Button>
        </div>
      )}

      {/* Invitacion recibida: aceptar o rechazar. */}
      {estado.estado === 'pendiente_recibida' && (
        <div className="mt-4 space-y-4">
          <p className="break-words text-sm text-ink">
            <strong>{estado.pareja.nombre}</strong> te invitó a vincularse.
          </p>
          {error && <p className="text-sm text-expense">{error}</p>}
          <div className="flex gap-3">
            <Button
              disabled={ocupado}
              onClick={() => aceptar(estado.vinculoId)}
            >
              Aceptar
            </Button>
            <Button
              variant="secondary"
              disabled={ocupado}
              onClick={() => eliminar(estado.vinculoId)}
            >
              Rechazar
            </Button>
          </div>
        </div>
      )}

      {/* Vinculo activo. */}
      {estado.estado === 'activo' && (
        <div className="mt-4 space-y-4">
          <p className="break-words text-sm text-ink">
            Vinculado con <strong>{estado.pareja.nombre}</strong>.
          </p>
          {error && <p className="text-sm text-expense">{error}</p>}
          <Button
            variant="secondary"
            disabled={ocupado}
            onClick={() => eliminar(estado.vinculoId)}
          >
            Desvincular
          </Button>
        </div>
      )}
    </Card>
  );
}
