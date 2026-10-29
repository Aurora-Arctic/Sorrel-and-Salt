import { globSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { defineConfig } from 'vite';

// Library build of src/components/ for the Claude Design sync: compiled
// JavaScript per component plus one compiled stylesheet, written to dist/. Vite's
// library mode is used rather than a `tsc` emit because the components import
// their Sass from TypeScript, which only a bundler compiles. React, Next.js and
// the form libraries stay external: the consumer supplies them. See
// claude-docs/workshop.md, "The library build".

const here = (path: string) => fileURLToPath(new URL(path, import.meta.url));

const entries: Record<string, string> = {
  tokens: here('scripts/library-tokens.ts'),
  ...Object.fromEntries(
    globSync('src/components/*/index.tsx', { cwd: here('.') }).map((file) => [
      file.split('/')[2],
      here(file),
    ]),
  ),
};

export default defineConfig({
  // No public/ copy: dist/ is the library, not a site.
  publicDir: false,
  resolve: { alias: { '@': here('src') } },
  css: { preprocessorOptions: { scss: { api: 'modern-compiler' } } },
  build: {
    outDir: 'dist',
    emptyOutDir: true,
    cssCodeSplit: false,
    minify: false,
    lib: { entry: entries, formats: ['es'], cssFileName: 'sorrel-and-salt' },
    rollupOptions: {
      external: (id) =>
        /^(react|react-dom|react-hook-form|downshift|zod|server-only)(\/|$)/.test(id) ||
        /^next(\/|$)/.test(id),
    },
  },
});
