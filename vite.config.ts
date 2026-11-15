import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// base './' is required so the bundle loads from the Android WebView (file-like origin).
export default defineConfig({
  base: './',
  plugins: [react()],
  // Build number injected by CI (GitHub run number); 0 for local/dev builds.
  define: { __BUILD__: JSON.stringify(Number(process.env.GOVERN_BUILD ?? 0)) },
  build: { outDir: 'dist', target: 'es2020', chunkSizeWarningLimit: 900 },
});
