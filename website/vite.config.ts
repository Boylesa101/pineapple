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
        screensIndex: 'screens/index.html',
        screensHome: 'screens/home/index.html',
        screensVault: 'screens/vault/index.html',
        screensSos: 'screens/sos/index.html',
        screensTrip: 'screens/trip/index.html',
      },
    },
  },
});
