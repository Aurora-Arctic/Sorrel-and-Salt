import { defineConfig } from 'vite';

// Vite overrides Ladle merges into its own config. Only Sass matters here: a
// component's `@use '../../scss/variables'` must resolve in the workshop the
// way it resolves under `next dev`, or the two disagree about what a token is.
// Both already land on the modern compiler with empty load paths, so parity
// needs no option set — `api` is pinned only so a future Vite default flip
// cannot move the workshop off that shared pipeline, and this block is where to
// keep the two aligned if Next ever gains a `sassOptions`.
export default defineConfig({
  css: {
    preprocessorOptions: {
      scss: {
        api: 'modern-compiler',
      },
    },
  },
});
