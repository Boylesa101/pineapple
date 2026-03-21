import { defineConfig } from 'vite';

export default defineConfig({
  server: {
    fs: {
      allow: ['..'],
    },
  },
  build: {
    outDir: 'dist',
    rollupOptions: {
      input: {
        home: 'index.html',
        privacy: 'privacy/index.html',
        terms: 'terms/index.html',
        support: 'support/index.html',
        deleteAccount: 'delete-account/index.html',
      },
    },
  },
});
