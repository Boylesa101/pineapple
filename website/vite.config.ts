import path from 'node:path';
import { defineConfig } from 'vite';

export default defineConfig({
  resolve: {
    alias: {
      '@': path.resolve(__dirname, 'src'),
      '@shared': path.resolve(__dirname, '../shared'),
    },
  },
  server: {
    fs: {
      allow: [path.resolve(__dirname, '..')],
    },
  },
  build: {
    outDir: 'dist',
    rollupOptions: {
      input: {
        home: path.resolve(__dirname, 'index.html'),
        privacy: path.resolve(__dirname, 'privacy/index.html'),
        terms: path.resolve(__dirname, 'terms/index.html'),
        support: path.resolve(__dirname, 'support/index.html'),
        deleteAccount: path.resolve(__dirname, 'delete-account/index.html'),
      },
    },
  },
});
