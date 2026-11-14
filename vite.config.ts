import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// base './' is required so the bundle loads from the Android WebView (file-like origin).
export default defineConfig({
  base: './',
  plugins: [react()],
  build: { outDir: 'dist', target: 'es2020', chunkSizeWarningLimit: 900 },
});
