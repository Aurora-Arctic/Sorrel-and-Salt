import { fileURLToPath } from 'node:url';
import { mergeConfig } from 'vite';
import base from '../vite.components.config';

// The design sync's library build: the repo's own components build plus one entry for
// src/app/providers.tsx. The storybook preview wraps every story in Providers, and a
// copy compiled apart from the components would hold a different React Query and
// navigation context from the one the components read. Built in the same pass, the
// two share chunks, and make-barrel.mjs exports it as `__providers`.
export default mergeConfig(base, {
  build: {
    lib: {
      entry: {
        _context: fileURLToPath(new URL('./context-modules.ts', import.meta.url)),
        _providers: fileURLToPath(new URL('../src/app/providers.tsx', import.meta.url)),
      },
    },
  },
});
