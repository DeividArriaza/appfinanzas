// Componentes base del sistema de diseno. Todas las pantallas los reutilizan
// para mantener un mismo lenguaje visual (minimalista, tipo Apple/Linear/Stripe).
import type { ButtonHTMLAttributes, InputHTMLAttributes, ReactNode } from 'react';
import { formatMoney, type Moneda } from '../lib/format';

// --- Tarjeta: superficie blanca, borde suave, sombra muy sutil, radio 16 px ---
export function Card({
  children,
  className = '',
}: {
  children: ReactNode;
  className?: string;
}) {
  return (
    <div
      className={`rounded-card border border-line bg-card shadow-card ${className}`}
    >
      {children}
    </div>
  );
}

// --- Ventana modal: fondo oscuro + tarjeta centrada. Cerrar toca el fondo. ---
export function Modal({
  abierto,
  onCerrar,
  titulo,
  children,
}: {
  abierto: boolean;
  onCerrar: () => void;
  titulo?: string;
  children: ReactNode;
}) {
  if (!abierto) return null;
  return (
    <div
      className="fixed inset-0 z-50 flex items-end justify-center bg-ink/40 p-4 sm:items-center"
      onClick={onCerrar}
    >
      <div
        className="w-full max-w-sm rounded-card bg-card p-6 shadow-card"
        onClick={(e) => e.stopPropagation()}
      >
        {titulo && (
          <h3 className="mb-4 text-base font-bold text-ink">{titulo}</h3>
        )}
        {children}
      </div>
    </div>
  );
}

// --- Boton: azul para la accion principal; blanco con borde para lo secundario ---
type ButtonProps = ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: 'primary' | 'secondary';
};

export function Button({
  variant = 'primary',
  className = '',
  ...props
}: ButtonProps) {
  const base =
    'w-full rounded-control px-4 py-3 font-semibold transition-colors ' +
    'focus:outline-none focus:ring-2 focus:ring-primary/30 disabled:opacity-50';
  const estilos =
    variant === 'primary'
      ? 'bg-primary text-white hover:bg-primary/90'
      : 'bg-card text-ink border border-line hover:bg-bg';
  return <button className={`${base} ${estilos} ${className}`} {...props} />;
}

// --- Campo de formulario: etiqueta + input con foco azul ---
type FieldProps = InputHTMLAttributes<HTMLInputElement> & {
  label: string;
};

export function Field({ label, id, className = '', ...props }: FieldProps) {
  return (
    <label htmlFor={id} className="block">
      <span className="mb-2 block text-sm font-medium text-muted">{label}</span>
      <input
        id={id}
        className={
          'w-full rounded-control border border-line bg-card px-4 py-3 text-ink ' +
          'placeholder:text-muted/60 focus:border-primary focus:outline-none ' +
          `focus:ring-2 focus:ring-primary/30 ${className}`
        }
        {...props}
      />
    </label>
  );
}

// --- Monto: el elemento visual mas importante. Cifras tabulares, grande y firme.
//     El color solo comunica ingreso (verde) o gasto (rojo); neutral es negro. ---
type Tono = 'income' | 'expense' | 'neutral' | 'warning';
type Tamano = 'sm' | 'md' | 'lg' | 'xl';

const tonoClase: Record<Tono, string> = {
  income: 'text-income',
  expense: 'text-expense',
  warning: 'text-warning',
  neutral: 'text-ink',
};

// Tamanos responsivos: mas compactos en movil, mas grandes en pantallas amplias.
const tamanoClase: Record<Tamano, string> = {
  sm: 'text-base',
  md: 'text-xl sm:text-2xl',
  lg: 'text-3xl sm:text-4xl',
  xl: 'text-4xl sm:text-5xl',
};

export function Amount({
  value,
  moneda,
  tono = 'neutral',
  size = 'lg',
}: {
  value: number;
  moneda: Moneda;
  tono?: Tono;
  size?: Tamano;
}) {
  return (
    <span
      className={`nums whitespace-nowrap font-extrabold ${tonoClase[tono]} ${tamanoClase[size]}`}
    >
      {formatMoney(value, moneda)}
    </span>
  );
}
