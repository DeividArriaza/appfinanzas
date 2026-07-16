// Formato de moneda para Guatemala. GTQ muestra "Q", USD muestra "$".
export type Moneda = 'GTQ' | 'USD';

export function formatMoney(value: number, moneda: Moneda): string {
  return new Intl.NumberFormat('es-GT', {
    style: 'currency',
    currency: moneda,
    currencyDisplay: 'narrowSymbol',
  }).format(value);
}

// Fecha de hoy en formato 'YYYY-MM-DD' (hora local).
export function hoyISO(): string {
  const d = new Date();
  const mes = String(d.getMonth() + 1).padStart(2, '0');
  const dia = String(d.getDate()).padStart(2, '0');
  return `${d.getFullYear()}-${mes}-${dia}`;
}

// Nombre del mes con anio, ej. "Julio 2026".
export function etiquetaMes(anio: number, mes: number): string {
  const fecha = new Date(anio, mes - 1, 1);
  const texto = new Intl.DateTimeFormat('es-GT', {
    month: 'long',
    year: 'numeric',
  }).format(fecha);
  return texto.charAt(0).toUpperCase() + texto.slice(1);
}

// Muestra una fecha 'YYYY-MM-DD' como "5 jul", sin depender de zona horaria.
export function formatFechaCorta(iso: string): string {
  const [anio, mes, dia] = iso.split('-').map(Number);
  const fecha = new Date(anio, mes - 1, dia);
  return new Intl.DateTimeFormat('es-GT', {
    day: 'numeric',
    month: 'short',
  }).format(fecha);
}
