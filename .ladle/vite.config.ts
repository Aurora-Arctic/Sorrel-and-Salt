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
//
// `leave-auth-requests-pending` answers nothing to a request under /api/auth made
// from one of the two stories that show a button waiting on Better Auth
// (M12.33). The window's own `fetch` cannot be replaced for them: Better Auth's
// client takes hold of `fetch` once, when it is created, so a story's stand-in
// is never called. Every other story still gets the workshop's plain 404.
const WAITING_ON_AUTH = /[?&]story=[a-z-]+--(adding|signing-in)(&|$)/;

export default defineConfig({
  plugins: [
    {
      name: 'leave-auth-requests-pending',
      configureServer(server) {
        server.middlewares.use((request, _response, next) => {
          if (
            request.url?.startsWith('/api/auth') &&
            WAITING_ON_AUTH.test(request.headers.referer ?? '')
          ) {
            return;
          }
          next();
        });
      },
    },
  ],
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
