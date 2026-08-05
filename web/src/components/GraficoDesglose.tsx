// Grafica de desglose por subcategoria para una categoria (gasto o ingreso).
// Trae un selector Totales / Fijos / Variables y muestra barras ordenadas de
// mayor a menor, con monto y porcentaje. Una sola medida por tarjeta, asi que
// las barras van en tono neutro; el color (rojo/verde) se reserva a los montos.
import { useState } from 'react';
import { Card, Amount } from './ui';
import { convertir } from '../lib/moneda';
import type { Moneda } from '../lib/format';
import type { Categoria } from '../lib/categorias';
import type { Movimiento } from '../types';

type Filtro = 'todos' | 'fijo' | 'variable';

const FILTROS: { v: Filtro; label: string }[] = [
  { v: 'todos', label: 'Totales' },
  { v: 'fijo', label: 'Fijos' },
  { v: 'variable', label: 'Variables' },
];

export default function GraficoDesglose({
  movs,
  categoria,
  titulo,
  tono,
  monedaVista,
  tasa,
}: {
  movs: Movimiento[];
  categoria: Categoria;
  titulo: string;
  tono: 'income' | 'expense';
  monedaVista: Moneda;
  tasa: number;
}) {
  const [filtro, setFiltro] = useState<Filtro>('todos');

  // Movimientos de esta categoria que cumplen el filtro de tipo.
  const relevantes = movs.filter(
    (m) => m.categoria === categoria && (filtro === 'todos' || m.tipo === filtro),
  );

  // Sumar por subcategoria (convertido a la moneda de vista).
  const acumulado = new Map<string, number>();
  for (const m of relevantes) {
    const nombre = m.subcategoria_nombre || 'Sin subcategoría';
    const monto = convertir(Number(m.monto), m.moneda, monedaVista, tasa);
    acumulado.set(nombre, (acumulado.get(nombre) ?? 0) + monto);
  }

  const filas = [...acumulado.entries()]
    .map(([nombre, monto]) => ({ nombre, monto }))
    .sort((a, b) => b.monto - a.monto);
  const total = filas.reduce((s, f) => s + f.monto, 0);
  const max = filas.length > 0 ? filas[0].monto : 0;

  const nombreCat = categoria === 'gasto' ? 'gastos' : 'ingresos';

  return (
    <Card className="p-6">
      <h2 className="text-sm font-semibold text-ink">{titulo}</h2>

      {/* Selector Totales / Fijos / Variables */}
      <div className="mt-4 grid grid-cols-3 divide-x divide-line overflow-hidden rounded-control border border-line text-sm font-medium">
        {FILTROS.map((f) => (
          <button
            key={f.v}
            type="button"
            onClick={() => setFiltro(f.v)}
            className={`truncate px-2 py-2 ${
              filtro === f.v ? 'bg-bg text-ink' : 'bg-card text-muted'
            }`}
          >
            {f.label}
          </button>
        ))}
      </div>

      {filas.length === 0 ? (
        <p className="mt-4 text-sm text-muted">
          Sin {nombreCat} en este filtro.
        </p>
      ) : (
        <ul className="mt-5 space-y-4">
          {filas.map((f) => {
            const pct = total > 0 ? Math.round((f.monto / total) * 100) : 0;
            return (
              <li key={f.nombre}>
                <div className="flex items-center justify-between gap-3">
                  <span className="min-w-0 truncate text-sm font-medium text-ink">
                    {f.nombre}
                  </span>
                  <span className="flex shrink-0 items-baseline gap-1 whitespace-nowrap">
                    <Amount value={f.monto} moneda={monedaVista} size="sm" tono={tono} />
                    <span className="text-xs text-muted">· {pct}%</span>
                  </span>
                </div>
                {/* Barra neutra; ancho proporcional al mayor del grupo. */}
                <div className="mt-2 h-2 w-full overflow-hidden rounded-full bg-line">
                  <div
                    className="h-full rounded-full bg-ink/70"
                    style={{ width: `${max > 0 ? (f.monto / max) * 100 : 0}%` }}
                  />
                </div>
              </li>
            );
          })}
        </ul>
      )}
    </Card>
  );
}
