// Fork of lib/story-imports.mjs as a thin wrapper (reason in config.json libOverrides): everything
// is the bundled module's, except that previews compile `msw/browser` to a fetch-wrapping fake
// (.design-sync/mock-fetch/msw-browser.ts) and `msw` and `@mswjs/*` to the real packages, so
// .storybook/mock-api.ts works in a preview page. Only stories that import mock-api reach msw at
// all. The decorator bundle (source-storybook fork) still uses the bundled inert stub.
import { resolve } from 'node:path';
import { storyImportPlugins as base } from '../../.ds-sync/lib/story-imports.mjs';

export * from '../../.ds-sync/lib/story-imports.mjs';

export function storyImportPlugins(opts) {
  const out = base(opts);
  const active = new Set(); // import specifiers being re-resolved for real, so sb-stub and this plugin step aside
  const keyOf = (a) => `${a.importer}\0${a.path}`;
  // The bundled sb-stub claims msw and @mswjs/*; let it step aside for our own re-resolve.
  const plugins = out.plugins.map((p) =>
    p.name !== 'sb-stub'
      ? p
      : {
          name: p.name,
          setup(b) {
            p.setup({
              ...b,
              onResolve: (o, fn) => b.onResolve(o, (a) => (active.has(keyOf(a)) ? null : fn(a))),
              onLoad: (o, fn) => b.onLoad(o, fn),
            });
          },
        },
  );
  const realMsw = {
    name: 'preview-msw',
    setup(b) {
      b.onResolve({ filter: /^msw\/browser$/ }, () => ({
        path: resolve('.design-sync', 'mock-fetch', 'msw-browser.ts'),
      }));
      b.onResolve({ filter: /^(msw|@mswjs\/.*)$/ }, async (a) => {
        const k = keyOf(a);
        if (active.has(k)) return null;
        active.add(k);
        try {
          return await b.resolve(a.path, {
            kind: a.kind,
            resolveDir: a.resolveDir,
            importer: a.importer,
            pluginData: 'ds-resolving',
          });
        } finally {
          active.delete(k);
        }
      });
    },
  };
  return { ...out, plugins: [realMsw, ...plugins] };
}
