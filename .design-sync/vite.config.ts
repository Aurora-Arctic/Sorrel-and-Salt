import { fileURLToPath } from 'node:url';
import { mergeConfig } from 'vite';
import base from '../vite.components.config';

// The design sync's library build: the repo's own components build plus one `index` entry,
// index.ts, that lists everything the sync's bundle exposes. The storybook preview wraps
// every story in Providers, and a copy compiled apart from the components would hold a
// different React Query and navigation context from the one the components read. Built in
// the same pass, the two share chunks, and index.ts exports it as `__providers`.
const here = (path: string) => fileURLToPath(new URL(path, import.meta.url));
const stub = here('./next-navigation.ts');

export default mergeConfig(base, {
  // The design sync's alias for `next/navigation` (see next-navigation.ts).
  resolve: { alias: { 'next/navigation': stub } },
  build: {
    // The list builds as core.mjs, and dist-index.mjs is copied over as index.mjs to import the shim first (process-shim.ts).
    lib: { entry: { '_process-shim': here('./process-shim.ts'), core: here('./index.ts') } },
    rollupOptions: {
      // The base config keeps every `next/*` import external, and Rollup asks `external`
      // before the alias runs, so `next/navigation` must be let through here or the alias
      // never applies. Everything else is external exactly as in the base config.
      external: (id: string) =>
        id !== 'next/navigation' &&
        (/^(react|react-dom|react-hook-form|downshift|zod|server-only)(\/|$)/.test(id) ||
          /^next(\/|$)/.test(id)),
    },
  },
});
