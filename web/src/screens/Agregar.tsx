// Seccion "Agregar" (boton azul): registra un movimiento en una categoria.
// Las subcategorias propias (ej. "Gasolina") van en un desplegable que se abre
// al tocarlo, con opcion de crear una nueva ahi mismo.
import { useEffect, useState, type FormEvent } from 'react';
import { Card, Button } from '../components/ui';
import { apiFetch } from '../lib/api';
import { CATEGORIAS, type Categoria } from '../lib/categorias';
import { hoyISO } from '../lib/format';
import type { Subcategoria, Usuario } from '../types';

const CON_TIPO: Categoria[] = ['ingreso', 'gasto'];

// Boton tipo "chip" reutilizable para las selecciones.
function Chip({
  activo,
  onClick,
  children,
}: {
  activo: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`rounded-control border px-4 py-3 text-sm font-medium transition-colors ${
        activo
          ? 'border-ink bg-bg text-ink'
          : 'border-line bg-card text-muted hover:text-ink'
      }`}
    >
      {children}
    </button>
  );
}

const claseInput =
  'w-full rounded-control border border-line bg-card px-4 py-3 text-ink focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/30';

export default function Agregar({
  usuario,
  onGuardado,
}: {
  usuario: Usuario;
  onGuardado: () => void;
}) {
  const [categoria, setCategoria] = useState<Categoria | null>(null);
  const [subId, setSubId] = useState(''); // '' = sin subcategoria
  const [tipo, setTipo] = useState<'fijo' | 'variable' | null>(null);
  const [monto, setMonto] = useState('');
  const [fecha, setFecha] = useState(hoyISO());
  const [descripcion, setDescripcion] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [guardando, setGuardando] = useState(false);

  // Subcategorias del usuario.
  const [subs, setSubs] = useState<Subcategoria[]>([]);
  // Formulario para crear una subcategoria nueva.
  const [creando, setCreando] = useState(false);
  const [nuevoNombre, setNuevoNombre] = useState('');
  const [nuevoTipo, setNuevoTipo] = useState<'fijo' | 'variable' | null>(null);
  const [errorSub, setErrorSub] = useState<string | null>(null);

  useEffect(() => {
    apiFetch<Subcategoria[]>('/subcategorias')
      .then(setSubs)
      .catch(() => setSubs([]));
  }, []);

  const necesitaTipo = categoria != null && CON_TIPO.includes(categoria);
  const subsDeCategoria = subs.filter((s) => s.categoria === categoria);
  const subSeleccionada = subs.find((s) => s.id === subId) ?? null;

  function elegirCategoria(c: Categoria) {
    setCategoria(c);
    setSubId('');
    setTipo(null);
    setCreando(false);
    setError(null);
  }

  function onCambioSelect(valor: string) {
    if (valor === '__crear__') {
      setCreando(true);
      setSubId('');
      setNuevoNombre('');
      setNuevoTipo(null);
      setErrorSub(null);
    } else {
      setCreando(false);
      setSubId(valor);
    }
  }

  async function crearSubcategoria() {
    if (!categoria) return;
    setErrorSub(null);
    if (!nuevoNombre.trim()) return setErrorSub('Escribe un nombre');
    if (CON_TIPO.includes(categoria) && !nuevoTipo) {
      return setErrorSub('Elige si es fijo o variable');
    }
    try {
      const creada = await apiFetch<Subcategoria>('/subcategorias', {
        method: 'POST',
        body: JSON.stringify({
          categoria,
          tipo: CON_TIPO.includes(categoria) ? nuevoTipo : null,
          nombre: nuevoNombre.trim(),
        }),
      });
      setSubs((prev) => [...prev, creada]);
      setSubId(creada.id); // queda seleccionada
      setCreando(false);
    } catch (err) {
      setErrorSub(err instanceof Error ? err.message : 'No se pudo crear');
    }
  }

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);

    if (!categoria) return setError('Elige una categoría');
    const n = Number(monto);
    if (!Number.isFinite(n) || n <= 0) {
      return setError('El monto debe ser mayor que cero');
    }
    // Si no hay subcategoria y la categoria lleva tipo, hay que elegirlo.
    if (!subSeleccionada && necesitaTipo && !tipo) {
      return setError('Elige si es fijo o variable');
    }

    setGuardando(true);
    try {
      await apiFetch('/movimientos', {
        method: 'POST',
        body: JSON.stringify({
          // Si hay subcategoria, el backend deriva categoria y tipo de ella.
          subcategoria_id: subSeleccionada ? subId : null,
          categoria,
          tipo: subSeleccionada ? null : necesitaTipo ? tipo : null,
          monto: n,
          // Se guarda en la moneda preferida; el switch del menu convierte al ver.
          moneda: usuario.moneda_preferida,
          fecha,
          descripcion,
        }),
      });
      onGuardado();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'No se pudo guardar');
    } finally {
      setGuardando(false);
    }
  }

  return (
    <div className="space-y-8">
      <header className="space-y-1">
        <h1 className="text-2xl font-bold text-ink">Agregar</h1>
        <p className="text-sm text-muted">Registra un nuevo movimiento</p>
      </header>

      <Card className="p-6">
        <form onSubmit={onSubmit} className="space-y-6">
          {/* Categoria base (siempre 4) */}
          <div>
            <p className="mb-2 text-sm font-medium text-muted">Categoría</p>
            <div className="grid grid-cols-2 gap-3">
              {CATEGORIAS.map((c) => (
                <Chip
                  key={c.clave}
                  activo={categoria === c.clave}
                  onClick={() => elegirCategoria(c.clave)}
                >
                  {c.etiqueta}
                </Chip>
              ))}
            </div>
          </div>

          {/* Subcategoria: desplegable + crear nueva */}
          {categoria && (
            <div>
              <p className="mb-2 text-sm font-medium text-muted">Subcategoría</p>
              <select
                value={creando ? '__crear__' : subId}
                onChange={(e) => onCambioSelect(e.target.value)}
                className={claseInput}
              >
                <option value="">Sin subcategoría</option>
                {subsDeCategoria.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.nombre}
                    {s.tipo ? ` (${s.tipo})` : ''}
                  </option>
                ))}
                <option value="__crear__">+ Crear nueva…</option>
              </select>

              {/* Formulario inline para crear subcategoria */}
              {creando && (
                <div className="mt-3 space-y-3 rounded-control border border-line p-4">
                  <input
                    type="text"
                    value={nuevoNombre}
                    onChange={(e) => setNuevoNombre(e.target.value)}
                    placeholder="Nombre (ej. Gasolina)"
                    className={claseInput}
                  />
                  {CON_TIPO.includes(categoria) && (
                    <div className="grid grid-cols-2 gap-3">
                      <Chip
                        activo={nuevoTipo === 'fijo'}
                        onClick={() => setNuevoTipo('fijo')}
                      >
                        Fijo
                      </Chip>
                      <Chip
                        activo={nuevoTipo === 'variable'}
                        onClick={() => setNuevoTipo('variable')}
                      >
                        Variable
                      </Chip>
                    </div>
                  )}
                  {errorSub && <p className="text-sm text-expense">{errorSub}</p>}
                  <div className="flex gap-3">
                    <Button type="button" onClick={crearSubcategoria}>
                      Crear
                    </Button>
                    <Button
                      type="button"
                      variant="secondary"
                      onClick={() => setCreando(false)}
                    >
                      Cancelar
                    </Button>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Tipo fijo/variable: solo si NO hay subcategoria (esta lo define) */}
          {necesitaTipo && !subSeleccionada && !creando && (
            <div>
              <p className="mb-2 text-sm font-medium text-muted">Tipo</p>
              <div className="grid grid-cols-2 gap-3">
                <Chip activo={tipo === 'fijo'} onClick={() => setTipo('fijo')}>
                  Fijo
                </Chip>
                <Chip
                  activo={tipo === 'variable'}
                  onClick={() => setTipo('variable')}
                >
                  Variable
                </Chip>
              </div>
            </div>
          )}

          {/* Monto (en tu moneda preferida; el menu convierte al ver) */}
          <label htmlFor="monto" className="block">
            <span className="mb-2 block text-sm font-medium text-muted">
              Monto ({usuario.moneda_preferida})
            </span>
            <input
              id="monto"
              type="number"
              inputMode="decimal"
              min="0"
              step="0.01"
              value={monto}
              onChange={(e) => setMonto(e.target.value)}
              placeholder="0.00"
              className="nums w-full rounded-control border border-line bg-card px-4 py-3 text-right text-ink focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/30"
            />
          </label>

          {/* Fecha */}
          <label htmlFor="fecha" className="block">
            <span className="mb-2 block text-sm font-medium text-muted">
              Fecha
            </span>
            <input
              id="fecha"
              type="date"
              value={fecha}
              onChange={(e) => setFecha(e.target.value)}
              className={claseInput}
            />
          </label>

          {/* Descripcion (opcional) */}
          <label htmlFor="descripcion" className="block">
            <span className="mb-2 block text-sm font-medium text-muted">
              Descripción (opcional)
            </span>
            <input
              id="descripcion"
              type="text"
              value={descripcion}
              onChange={(e) => setDescripcion(e.target.value)}
              placeholder="Ej. Supermercado"
              className={claseInput}
            />
          </label>

          {error && <p className="text-sm text-expense">{error}</p>}

          <Button type="submit" disabled={guardando}>
            {guardando ? 'Guardando...' : 'Guardar movimiento'}
          </Button>
        </form>
      </Card>
    </div>
  );
}
