import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { VitePWA } from 'vite-plugin-pwa';

// El servidor de Vite escucha en 0.0.0.0 (host: true) para poder abrir la app
// desde el telefono usando la IP de la red local.
export default defineConfig({
  plugins: [
    react(),
    // Convierte la app en una PWA instalable en el telefono.
    VitePWA({
      registerType: 'autoUpdate',
      manifest: {
        name: 'Cuencla',
        short_name: 'Cuencla',
        description: 'Cuentas claras: finanzas para una pareja',
        theme_color: '#F8FAFC',
        background_color: '#F8FAFC',
        display: 'standalone',
        start_url: '/',
        icons: [],
      },
    }),
  ],
  server: {
    // Escuchar en todas las interfaces para ser accesible desde el contenedor.
    host: true,
    port: 5173,
  },
});
