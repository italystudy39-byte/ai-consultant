import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';

// В dev-режиме API и виджет проксируются на backend (порт 3000)
export default defineConfig({
  plugins: [react(), tailwindcss()],
  server: {
    port: 5173,
    proxy: {
      '/api': 'http://localhost:3000',
      '/widget': 'http://localhost:3000',
      '/widget.js': 'http://localhost:3000',
    },
  },
});
