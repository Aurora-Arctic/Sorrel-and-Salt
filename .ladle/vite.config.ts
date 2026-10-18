import { fileURLToPath } from 'node:url';
import { defineConfig } from 'vite';

// Sass must resolve `@use` here the way `next dev` does: relative paths, empty load
// paths. This file is the seam if Next ever gains a `sassOptions`.
//
// `api` is read by Ladle's own Vite, 6.4 (node_modules/@ladle/react/node_modules/vite),
// not the app's Vite 8, whose types no longer list the option. Vite 6.4's default
// is `modern-compiler` only when `sass-embedded` is installed, and the app has plain
// `sass`, so without the option Vite 6.4 would use `modern`; the option asks for `modern-compiler` instead.
//
// `next/link` is aliased to a plain anchor, as Ladle's Next.js guide prescribes:
// Next's client modules expect the router and `process.env` that `next dev`
// provides and Vite does not, and a story only needs the link to render.
// `next/navigation` is stubbed for the same reason: its `useRouter` throws
// with no App Router mounted.
export default defineConfig({
  resolve: {
    alias: {
      // The components import `@/modules/...` at runtime, as `tsconfig.json`'s paths say.
      '@': fileURLToPath(new URL('../src', import.meta.url)),
      'next/link': fileURLToPath(new URL('./UnoptimizedLink.tsx', import.meta.url)),
      'next/navigation': fileURLToPath(new URL('./navigation.ts', import.meta.url)),
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
