// Seccion "Resumen": balance del mes, presupuesto vs gastado y lista de
// movimientos. Un switch global GTQ/USD convierte todos los montos del menu.
import { useCallback, useEffect, useMemo, useState } from 'react';
import { Card, Amount, Button, Modal } from '../components/ui';
import GraficoDesglose from '../components/GraficoDesglose';
import { useAuth } from '../auth/context';
import { apiFetch } from '../lib/api';
import { CATEGORIAS, type Categoria } from '../lib/categorias';
import {
  etiquetaMes,
  formatFechaCorta,
  formatMoney,
  type Moneda,
} from '../lib/format';
import {
  convertir,
  getMonedaVista,
  setMonedaVista,
  TIPO_CAMBIO_RESPALDO,
} from '../lib/moneda';
import type { EstadoVinculo, Movimiento, Usuario } from '../types';

type Vista = 'mio' | 'pareja' | 'comun';

const MONEDAS: Moneda[] = ['GTQ', 'USD'];

export default function Resumen({ usuario }: { usuario: Usuario }) {
  const hoy = new Date();
  const [anio, setAnio] = useState(hoy.getFullYear());
  const [mes, setMes] = useState(hoy.getMonth() + 1);

  // Moneda con la que se ve el menu (persistida).
  const [monedaVista, setMoneda] = useState<Moneda>(
    getMonedaVista(usuario.moneda_preferida),
  );

  const { actualizarUsuario } = useAuth();
  const [movs, setMovs] = useState<Movimiento[]>([]);
  const [cargando, setCargando] = useState(true);
  // Tipo de cambio (GTQ por USD). Arranca con el respaldo y se actualiza al
  // consultar la API una vez al montar.
  const [tasa, setTasa] = useState(TIPO_CAMBIO_RESPALDO);

  // Vista: mios, de la pareja, o combinados. Solo hay opciones si hay pareja.
  const [vista, setVista] = useState<Vista>('mio');
  const [vinc, setVinc] = useState<EstadoVinculo | null>(null);

  const cargarVinculo = useCallback(() => {
    apiFetch<EstadoVinculo>('/vinculo')
      .then(setVinc)
      .catch(() => setVinc(null));
  }, []);

  useEffect(() => {
    apiFetch<{ gtq_por_usd: number }>('/tipo-cambio')
      .then((r) => setTasa(r.gtq_por_usd))
      .catch(() => {}); // si falla, se queda con el respaldo
    cargarVinculo();
  }, [cargarVinculo]);

  const parejaNombre = vinc?.estado === 'activo' ? vinc.pareja.nombre : null;

  const cargar = useCallback(() => {
    setCargando(true);
    apiFetch<Movimiento[]>(`/movimientos?anio=${anio}&mes=${mes}&vista=${vista}`)
      .then(setMovs)
      .catch(() => setMovs([]))
      .finally(() => setCargando(false));
  }, [anio, mes, vista]);

  useEffect(() => cargar(), [cargar]);

  function cambiarMes(delta: number) {
    let m = mes + delta;
    let a = anio;
    if (m < 1) {
      m = 12;
      a -= 1;
    } else if (m > 12) {
      m = 1;
      a += 1;
    }
    setMes(m);
    setAnio(a);
  }

  function cambiarMoneda(m: Moneda) {
    setMoneda(m);
    setMonedaVista(m);
  }

  // Suma de una categoria, convirtiendo cada monto a la moneda de vista.
  function sumaPorCategoria(cat: Categoria): number {
    return movs
      .filter((m) => m.categoria === cat)
      .reduce(
        (s, m) => s + convertir(Number(m.monto), m.moneda, monedaVista, tasa),
        0,
      );
  }

  const ingresos = useMemo(() => sumaPorCategoria('ingreso'), [movs, monedaVista, tasa]);
  const gastos = useMemo(() => sumaPorCategoria('gasto'), [movs, monedaVista, tasa]);
  const ahorro = useMemo(() => sumaPorCategoria('ahorro'), [movs, monedaVista, tasa]);
  const inversion = useMemo(
    () => sumaPorCategoria('inversion'),
    [movs, monedaVista, tasa],
  );
  // Lo que queda libre: se restan gastos, ahorro e inversion de los ingresos.
  const balance = ingresos - gastos - ahorro - inversion;

  // Limite segun la vista (todos guardados en GTQ). Cada vista tiene el suyo:
  // - mio: mi limite personal (usuario)
  // - comun: limite de la cuenta comun (vinculo, compartido)
  // - pareja: limite personal de la pareja (SOLO LECTURA)
  const limiteNum: number | null = (() => {
    if (vista === 'comun') {
      return vinc?.estado === 'activo' && vinc.limite_comun != null
        ? Number(vinc.limite_comun)
        : null;
    }
    if (vista === 'pareja') {
      return vinc?.estado === 'activo' && vinc.limite_pareja != null
        ? Number(vinc.limite_pareja)
        : null;
    }
    return usuario.limite_balance != null ? Number(usuario.limite_balance) : null;
  })();
  const limiteVista =
    limiteNum != null ? convertir(limiteNum, 'GTQ', monedaVista, tasa) : null;
  // En la vista de pareja no se puede editar nada (solo espectador).
  const puedeEditarLimite = vista !== 'pareja';

  // Rojo si es negativo; naranja si cae hasta el limite; normal si esta holgado.
  const balanceTono =
    balance < 0
      ? 'expense'
      : limiteVista != null && balance <= limiteVista
        ? 'warning'
        : 'neutral';

  // Editor del limite en una ventana modal (input en GTQ).
  const [modalAlerta, setModalAlerta] = useState(false);
  const [limiteInput, setLimiteInput] = useState('');
  const [guardandoLimite, setGuardandoLimite] = useState(false);

  function abrirModalAlerta() {
    setLimiteInput(limiteNum != null ? String(limiteNum) : '');
    setModalAlerta(true);
  }

  async function guardarLimite() {
    setGuardandoLimite(true);
    try {
      const valor = limiteInput === '' ? null : Number(limiteInput);
      if (vista === 'comun') {
        // Limite de la cuenta comun: se guarda en el vinculo (compartido).
        await apiFetch('/vinculo/limite-balance', {
          method: 'PUT',
          body: JSON.stringify({ limite_balance: valor }),
        });
        cargarVinculo();
      } else {
        // Mi limite personal.
        const res = await apiFetch<{ usuario: Usuario }>(
          '/auth/limite-balance',
          { method: 'PUT', body: JSON.stringify({ limite_balance: valor }) },
        );
        actualizarUsuario(res.usuario);
      }
      setModalAlerta(false);
    } finally {
      setGuardandoLimite(false);
    }
  }

  async function eliminar(id: string) {
    await apiFetch(`/movimientos/${id}`, { method: 'DELETE' });
    cargar();
  }

  return (
    <div className="space-y-8">
      <header className="flex items-start justify-between gap-4">
        <div className="min-w-0 space-y-1">
          <p className="text-sm text-muted">Hola,</p>
          <h1 className="truncate text-2xl font-bold text-ink">
            {usuario.nombre}
          </h1>
        </div>
        {/* Switch global de moneda: convierte todo el menu. */}
        <div className="flex shrink-0 divide-x divide-line overflow-hidden rounded-control border border-line">
          {MONEDAS.map((m) => (
            <button
              key={m}
              type="button"
              onClick={() => cambiarMoneda(m)}
              className={`px-3 py-2 text-sm font-medium ${
                monedaVista === m ? 'bg-bg text-ink' : 'bg-card text-muted'
              }`}
            >
              {m}
            </button>
          ))}
        </div>
      </header>

      {/* Selector de vista (solo si hay pareja vinculada). */}
      {parejaNombre && (
        <div className="grid grid-cols-3 divide-x divide-line overflow-hidden rounded-control border border-line text-sm font-medium">
          {([
            ['mio', 'Yo'],
            ['comun', 'Común'],
            ['pareja', parejaNombre],
          ] as [Vista, string][]).map(([v, label]) => (
            <button
              key={v}
              type="button"
              onClick={() => setVista(v)}
              className={`truncate px-3 py-2 ${
                vista === v ? 'bg-bg text-ink' : 'bg-card text-muted'
              }`}
            >
              {label}
            </button>
          ))}
        </div>
      )}

      {/* Navegacion de mes. */}
      <div className="flex items-center justify-between">
        <button
          type="button"
          onClick={() => cambiarMes(-1)}
          aria-label="Mes anterior"
          className="rounded-control px-3 py-1 text-lg text-muted hover:text-ink"
        >
          ‹
        </button>
        <span className="text-sm font-semibold text-ink">
          {etiquetaMes(anio, mes)}
        </span>
        <button
          type="button"
          onClick={() => cambiarMes(1)}
          aria-label="Mes siguiente"
          className="rounded-control px-3 py-1 text-lg text-muted hover:text-ink"
        >
          ›
        </button>
      </div>

      {/* Balance del mes. */}
      <Card className="p-8">
        <p className="text-sm font-medium text-muted">Balance del mes</p>
        <div className="mt-2 overflow-x-auto">
          <Amount
            value={balance}
            moneda={monedaVista}
            size="xl"
            tono={balanceTono}
          />
        </div>
        {balanceTono === 'warning' ? (
          <p className="mt-1 text-xs font-medium text-warning">
            Cerca de tu límite ({formatMoney(limiteVista ?? 0, monedaVista)})
          </p>
        ) : (
          <p className="mt-1 text-xs text-muted">
            Disponible tras gastos, ahorro e inversión
          </p>
        )}

        <div className="mt-8 grid grid-cols-2 gap-4">
          <div className="min-w-0">
            <p className="text-sm font-medium text-muted">Ingresos</p>
            <div className="mt-1 overflow-x-auto">
              <Amount value={ingresos} moneda={monedaVista} size="md" tono="income" />
            </div>
          </div>
          <div className="min-w-0">
            <p className="text-sm font-medium text-muted">Gastos</p>
            <div className="mt-1 overflow-x-auto">
              <Amount value={gastos} moneda={monedaVista} size="md" tono="expense" />
            </div>
          </div>
        </div>
      </Card>

      {/* Totales por categoria del mes. */}
      <Card className="p-6">
        <h2 className="text-sm font-semibold text-ink">Totales por categoría</h2>
        <div className="mt-4 space-y-4">
          {CATEGORIAS.map((c) => (
            <div
              key={c.clave}
              className="flex items-center justify-between gap-3 text-sm"
            >
              <span className="min-w-0 truncate font-medium text-ink">
                {c.etiqueta}
              </span>
              <span className="shrink-0">
                <Amount
                  value={sumaPorCategoria(c.clave)}
                  moneda={monedaVista}
                  size="sm"
                  tono={c.tono}
                />
              </span>
            </div>
          ))}
        </div>
      </Card>

      {/* Graficas: desglose de gastos e ingresos por subcategoria. */}
      <GraficoDesglose
        movs={movs}
        categoria="gasto"
        titulo="Gastos desglosados"
        tono="expense"
        monedaVista={monedaVista}
        tasa={tasa}
      />
      <GraficoDesglose
        movs={movs}
        categoria="ingreso"
        titulo="Ingresos desglosados"
        tono="income"
        monedaVista={monedaVista}
        tasa={tasa}
      />

      {/* Alerta de balance: boton compacto que abre una ventana.
          En la vista de pareja es solo lectura (no hay boton de editar). */}
      <Card className="p-6">
        <div className="flex items-center justify-between gap-3">
          <div className="min-w-0">
            <h2 className="text-sm font-semibold text-ink">
              {vista === 'comun'
                ? 'Alerta (cuenta común)'
                : vista === 'pareja'
                  ? `Alerta de ${parejaNombre ?? 'tu pareja'}`
                  : 'Alerta de balance'}
            </h2>
            <p className="mt-1 text-sm text-muted">
              {limiteNum != null
                ? `Avisa si baja hasta ${formatMoney(limiteVista ?? 0, monedaVista)}`
                : 'Sin alerta configurada'}
            </p>
          </div>
          {puedeEditarLimite ? (
            <button
              type="button"
              onClick={abrirModalAlerta}
              className="shrink-0 text-sm font-semibold text-primary hover:underline"
            >
              {limiteNum != null ? 'Editar' : 'Colocar alerta'}
            </button>
          ) : (
            <span className="shrink-0 text-xs text-muted">Solo lectura</span>
          )}
        </div>
      </Card>

      {/* Ventana para fijar/quitar el limite (mio o comun). */}
      <Modal
        abierto={modalAlerta}
        onCerrar={() => setModalAlerta(false)}
        titulo={vista === 'comun' ? 'Alerta (cuenta común)' : 'Alerta de balance'}
      >
        <p className="text-sm text-muted">
          {vista === 'comun'
            ? 'Si el balance combinado del mes baja hasta este monto, se mostrará en naranja.'
            : 'Si tu balance del mes baja hasta este monto, se mostrará en naranja.'}
        </p>
        <label htmlFor="limite" className="mt-4 block">
          <span className="mb-2 block text-sm font-medium text-muted">
            Monto límite (GTQ)
          </span>
          <input
            id="limite"
            type="number"
            inputMode="decimal"
            min="0"
            step="0.01"
            value={limiteInput}
            onChange={(e) => setLimiteInput(e.target.value)}
            placeholder="Sin alerta"
            autoFocus
            className="nums w-full rounded-control border border-line bg-card px-4 py-3 text-right text-ink focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/30"
          />
        </label>
        <p className="mt-2 text-xs text-muted">
          Déjalo vacío y guarda para quitar la alerta.
        </p>
        <div className="mt-6 flex gap-3">
          <Button type="button" onClick={guardarLimite} disabled={guardandoLimite}>
            {guardandoLimite ? 'Guardando...' : 'Guardar'}
          </Button>
          <Button
            type="button"
            variant="secondary"
            onClick={() => setModalAlerta(false)}
          >
            Descartar
          </Button>
        </div>
      </Modal>

      {/* Lista de movimientos del mes. */}
      <Card className="p-6">
        <h2 className="text-sm font-semibold text-ink">Movimientos</h2>
        {cargando ? (
          <p className="mt-4 text-sm text-muted">Cargando...</p>
        ) : movs.length === 0 ? (
          <p className="mt-4 text-sm text-muted">
            Aún no hay movimientos este mes. Usa el botón azul para agregar uno.
          </p>
        ) : (
          <ul className="mt-4 divide-y divide-line">
            {movs.map((m) => {
              const cat = CATEGORIAS.find((c) => c.clave === m.categoria);
              const esMio = m.usuario_id === usuario.id;
              return (
                <li key={m.id} className="flex items-center justify-between gap-3 py-3">
                  <div className="min-w-0">
                    <p className="truncate text-sm font-medium text-ink">
                      {m.descripcion || m.subcategoria_nombre || cat?.etiqueta || m.categoria}
                    </p>
                    <p className="text-xs text-muted">
                      {/* En vistas de pareja/comun se muestra de quien es. */}
                      {vista !== 'mio' ? `${m.usuario_nombre} · ` : ''}
                      {cat?.etiqueta}
                      {m.subcategoria_nombre && m.descripcion
                        ? ` · ${m.subcategoria_nombre}`
                        : ''}
                      {m.tipo ? ` · ${m.tipo}` : ''} · {formatFechaCorta(m.fecha)}
                    </p>
                  </div>
                  <div className="flex shrink-0 items-center gap-3">
                    <Amount
                      value={convertir(Number(m.monto), m.moneda, monedaVista, tasa)}
                      moneda={monedaVista}
                      size="sm"
                      tono={cat?.tono ?? 'neutral'}
                    />
                    {/* Solo se puede eliminar lo propio. */}
                    {esMio && (
                      <button
                        type="button"
                        onClick={() => eliminar(m.id)}
                        aria-label="Eliminar movimiento"
                        className="text-muted hover:text-expense"
                      >
                        ×
                      </button>
                    )}
                  </div>
                </li>
              );
            })}
          </ul>
        )}
      </Card>
    </div>
  );
}
