import { fileURLToPath } from 'node:url';
import { defineConfig } from 'vite';

// Sass must resolve `@use` here the way `next dev` does; both land on the modern
// compiler with empty load paths, so `api` is pinned only against a future Vite
// default flip. The seam if Next ever gains a `sassOptions`.
//
// `next/link` is aliased to a plain anchor, as Ladle's Next.js guide prescribes:
// Next's client modules expect the router and `process.env` that `next dev`
// provides and Vite does not, and a story only needs the link to render.
export default defineConfig({
  resolve: {
    alias: {
      'next/link': fileURLToPath(new URL('./UnoptimizedLink.tsx', import.meta.url)),
    },
  },
  css: {
    preprocessorOptions: {
      scss: {
        api: 'modern-compiler',
      },
    },
  },
});
