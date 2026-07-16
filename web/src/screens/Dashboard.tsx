// Esqueleto de la app tras iniciar sesion: muestra la seccion activa y la barra
// de navegacion inferior.
import { useState } from 'react';
import { useAuth } from '../auth/context';
import BottomNav, { type Tab } from '../components/BottomNav';
import Resumen from './Resumen';
import Agregar from './Agregar';
import Perfil from './Perfil';

export default function Dashboard() {
  const { usuario } = useAuth();
  const [tab, setTab] = useState<Tab>('resumen');
  if (!usuario) return null;

  return (
    <>
      {/* pb-28 deja espacio para que la barra inferior no tape el contenido. */}
      <main className="mx-auto min-h-screen w-full max-w-md px-6 pb-28 pt-12">
        {tab === 'resumen' && <Resumen usuario={usuario} />}
        {tab === 'agregar' && (
          <Agregar usuario={usuario} onGuardado={() => setTab('resumen')} />
        )}
        {tab === 'perfil' && <Perfil />}
      </main>

      <BottomNav activo={tab} onChange={setTab} />
    </>
  );
}
