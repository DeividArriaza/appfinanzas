// Categorias del presupuesto. Fijas por ahora; a futuro se podran ocultar
// algunas desde el menu (ver pendientes en CLAUDE.md).
export type Categoria = 'ingreso' | 'gasto' | 'ahorro' | 'inversion';
export type Tono = 'income' | 'expense' | 'neutral';

export const CATEGORIAS: {
  clave: Categoria;
  etiqueta: string;
  tono: Tono;
}[] = [
  { clave: 'ingreso', etiqueta: 'Ingreso', tono: 'income' },
  { clave: 'gasto', etiqueta: 'Gasto', tono: 'expense' },
  { clave: 'ahorro', etiqueta: 'Ahorro', tono: 'neutral' },
  { clave: 'inversion', etiqueta: 'Inversión', tono: 'neutral' },
];
