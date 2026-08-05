import { defineConfig } from 'vite';

export default defineConfig({
  base: '/forest-trader/',
  build: {
    target: 'es2022',
    sourcemap: true,
  },
});
