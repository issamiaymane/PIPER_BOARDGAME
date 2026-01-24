import { defineConfig } from 'vite';

export default defineConfig({
  root: '.',

  server: {
    port: 5174,
    open: true,
    proxy: {
      '/api': {
        target: 'http://localhost:3001',
        changeOrigin: true,
      }
    }
  },

  build: {
    outDir: 'dist',
    emptyOutDir: true,
  }
});
