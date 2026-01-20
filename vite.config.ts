import { defineConfig } from 'vite';
import { svelte } from '@sveltejs/vite-plugin-svelte';
import { resolve } from 'path';
import sveltePreprocess from 'svelte-preprocess';

export default defineConfig({
  plugins: [
    svelte({
      preprocess: sveltePreprocess({
        typescript: true,
      }),
    }),
  ],
  resolve: {
    alias: {
      $app: resolve(__dirname, './src/app'),
      $worker: resolve(__dirname, './src/worker'),
      $shared: resolve(__dirname, './src/shared'),
      $lib: resolve(__dirname, './src/app/lib'),
      $components: resolve(__dirname, './src/app/components'),
      $stores: resolve(__dirname, './src/app/stores'),
      $routes: resolve(__dirname, './src/app/routes'),
    },
  },
  optimizeDeps: {
    include: ['ace-builds'],
  },
  server: {
    port: 5173,
    proxy: {
      '/api': {
        target: 'http://localhost:8787',
        changeOrigin: true,
      },
      '/auth': {
        target: 'http://localhost:8787',
        changeOrigin: true,
      },
    },
  },
  build: {
    outDir: 'dist',
    emptyOutDir: true,
    rollupOptions: {
      output: {
        manualChunks: {
          'ace-editor': ['ace-builds'],
        },
      },
    },
  },
});
