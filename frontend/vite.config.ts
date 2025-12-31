import { defineConfig } from 'vite';
import { resolve } from 'path';
import { fileURLToPath } from 'url';

const __dirname = fileURLToPath(new URL('.', import.meta.url));

export default defineConfig({
  root: '.',
  publicDir: 'assets',

  build: {
    outDir: 'dist',
    emptyOutDir: true,
    rollupOptions: {
      input: {
        main: resolve(__dirname, 'index.html'),
        boardgame: resolve(__dirname, 'pages/boardgame.html'),
        therapist: resolve(__dirname, 'pages/therapist.html'),
        'card-browser': resolve(__dirname, 'pages/card-browser.html'),
      },
      output: {
        assetFileNames: 'assets/[name]-[hash][extname]',
        chunkFileNames: 'js/[name]-[hash].js',
        entryFileNames: 'js/[name]-[hash].js',
      }
    }
  },

  server: {
    port: 5173,
    open: '/pages/boardgame.html',
    proxy: {
      '/api': {
        target: 'http://localhost:3000',
        changeOrigin: true,
      }
    }
  },

  resolve: {
    alias: {
      '@': resolve(__dirname, 'scripts'),
      '@core': resolve(__dirname, 'scripts/core'),
      '@handlers': resolve(__dirname, 'scripts/handlers'),
      '@child': resolve(__dirname, 'scripts/child'),
      '@therapist': resolve(__dirname, 'scripts/therapist'),
    }
  }
});
