import { defineConfig } from 'vite';

// base relativa: la página funciona igual en la raíz de un dominio o en una subcarpeta (p. ej. /ciencia/).
export default defineConfig({
  base: './',
  server: { port: 5183, host: '127.0.0.1' },
  build: { chunkSizeWarningLimit: 900 },
  // Se declaran de una vez para que Vite no vuelva a optimizarlas a medio cargar en desarrollo.
  optimizeDeps: { include: ['three', 'three/examples/jsm/controls/OrbitControls.js', 'three/examples/jsm/renderers/CSS2DRenderer.js'] },
});
