import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';

export default defineConfig({
  plugins: [react(), tailwindcss()],
  server: { port: 5180, strictPort: true, open: true },
  // Internal dashboard behind a login: one ~700 kB bundle (≈220 kB gzipped) is fine.
  build: { chunkSizeWarningLimit: 1100 },
});
