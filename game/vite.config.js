import { defineConfig } from 'vite';
// Permite importar los JSON de ../data (fuente única de datos del modelo)
export default defineConfig({ server: { fs: { allow: ['..'] } } });
