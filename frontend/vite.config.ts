import { defineConfig } from 'vite';
import { resolve } from 'path';
import { fileURLToPath } from 'url';

const __dirname = fileURLToPath(new URL('.', import.meta.url));

export default defineConfig({
  root: '.',
  publicDir: 'public',

  build: {
    outDir: 'dist',
    emptyOutDir: true,
    rollupOptions: {
      input: {
        boardgame: resolve(__dirname, 'boardgame.html'),
        therapist: resolve(__dirname, 'therapist.html'),
        'card-browser': resolve(__dirname, 'card-browser.html'),
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
    open: '/boardgame.html',
    proxy: {
      '/api': {
        target: 'http://localhost:3000',
        changeOrigin: true,
      }
    }
  },

  resolve: {
    alias: {
      '@': resolve(__dirname, 'src'),
      '@features': resolve(__dirname, 'src/features'),
      '@constants': resolve(__dirname, 'src/constants'),
      '@services': resolve(__dirname, 'src/services'),
      '@common': resolve(__dirname, 'src/common'),
      '@styles': resolve(__dirname, 'src/styles'),
      '@shared': resolve(__dirname, '../shared'),
    }
  }
});
