// Barra de navegacion inferior con tres secciones. La del centro (agregar) es
// un boton azul elevado, por ser la accion principal.
import { IconInicio, IconMas, IconPerfil } from './icons';

export type Tab = 'resumen' | 'agregar' | 'perfil';

type Props = {
  activo: Tab;
  onChange: (tab: Tab) => void;
};

export default function BottomNav({ activo, onChange }: Props) {
  return (
    <nav
      className="fixed inset-x-0 bottom-0 border-t border-line bg-card"
      // Respeta el area segura (gesto/notch de iOS) al instalar como PWA.
      style={{ paddingBottom: 'env(safe-area-inset-bottom)' }}
    >
      <div className="mx-auto flex h-16 max-w-md items-center justify-around px-6">
        {/* Inicio / Resumen */}
        <button
          type="button"
          onClick={() => onChange('resumen')}
          className={`flex flex-col items-center gap-1 text-xs font-medium ${
            activo === 'resumen' ? 'text-ink' : 'text-muted'
          }`}
        >
          <IconInicio />
          Resumen
        </button>

        {/* Agregar (accion principal, boton azul elevado) */}
        <button
          type="button"
          onClick={() => onChange('agregar')}
          aria-label="Agregar movimiento"
          className="-mt-8 flex h-14 w-14 items-center justify-center rounded-full bg-primary text-white shadow-card transition-colors hover:bg-primary/90"
        >
          <IconMas className="h-7 w-7" />
        </button>

        {/* Perfil */}
        <button
          type="button"
          onClick={() => onChange('perfil')}
          className={`flex flex-col items-center gap-1 text-xs font-medium ${
            activo === 'perfil' ? 'text-ink' : 'text-muted'
          }`}
        >
          <IconPerfil />
          Perfil
        </button>
      </div>
    </nav>
  );
}
