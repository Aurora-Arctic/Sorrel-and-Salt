import { defineConfig } from 'vite';

// Sass must resolve `@use` here the way `next dev` does; both land on the modern
// compiler with empty load paths, so `api` is pinned only against a future Vite
// default flip. The seam if Next ever gains a `sassOptions`.
export default defineConfig({
  css: {
    preprocessorOptions: {
      scss: {
        api: 'modern-compiler',
      },
    },
  },
});
