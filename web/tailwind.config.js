/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        // Paleta del sistema de diseno. Usar por nombre semantico.
        bg: '#F8FAFC', // fondo de la app
        card: '#FFFFFF', // superficie de tarjetas
        ink: '#111827', // texto principal
        muted: '#6B7280', // texto secundario
        primary: '#2563EB', // accion principal (solo botones/enlaces de accion)
        income: '#16A34A', // montos de ingreso (solo numeros)
        expense: '#DC2626', // montos de gasto (solo numeros)
        warning: '#EA580C', // alerta: balance cerca del limite (naranja)
        line: '#E5E7EB', // bordes
      },
      fontFamily: {
        // Manrope autohospedada; el resto son respaldos del sistema.
        sans: ['Manrope', 'system-ui', 'sans-serif'],
      },
      borderRadius: {
        card: '16px', // contenedores / tarjetas
        control: '12px', // botones / inputs
      },
      boxShadow: {
        // Una unica sombra muy sutil para todas las tarjetas.
        card: '0 1px 2px 0 rgb(17 24 39 / 0.04), 0 1px 3px 0 rgb(17 24 39 / 0.03)',
      },
    },
  },
  plugins: [],
};
