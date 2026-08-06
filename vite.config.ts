import { defineConfig } from 'vite';

export default defineConfig({
  base: '/forest-trader/',
  build: {
    target: 'es2022',
    // Sourcemap üretim derlemesinden çıkarıldı: Pages'e giden pakete 2.8 MB
    // ekliyor ve yayınlanan sitede bir faydası yok.
    sourcemap: false,
  },
});
