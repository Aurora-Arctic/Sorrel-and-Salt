# Component workshop — transcript

Append-only. Newest entry at the bottom. Summary:
[`../workshop.md`](../workshop.md).

## 2026-09-08 — M0.30 · Ladle stood up

- **Tooling chosen: Ladle**, over Storybook and Histoire. Vite + React only, so a Next.js
  major can't break it; one dependency against Storybook's builder chain; one config file.
  Storybook's story-runner-as-test-surface advantage doesn't land here — component tests
  are role/label queries and a11y is Playwright + `@axe-core/playwright`. Histoire's React
  plugin isn't a safe React 19 bet. Full reasoning:
  [`../design-decisions/m0.30-ladle-component-workshop.md`](../design-decisions/m0.30-ladle-component-workshop.md).
- **`@ladle/react` + `vite`** added as devDependencies.
- **`.ladle/config.mjs`** — `stories: 'src/components/**/index.stories.tsx'`, `port` 61000,
  `outDir` `build`; `addons.theme.defaultState: 'dark'` (the app is dark-first);
  `hmrPort: 61002` pinned so the HMR socket isn't on a random port a non-localhost client
  can't reach.
- **`.ladle/vite.config.ts`** — `css.preprocessorOptions.scss.api = 'modern-compiler'` and
  nothing else. Verified against `node_modules/next/dist/compiled/sass-loader` that Next 16
  resolves `@use` relatively with empty load paths; Vite 6's default matches, so parity
  needs no `loadPaths`/`includePaths`. The file exists as the alignment seam.
- **`.ladle/theme.scss` + `.ladle/components.tsx`** — `_variables.scss` maps tokens to
  `var(--…)`; the `--…: value` assignments live only in `globals.scss`, which no component
  imports, so without them the workshop renders every component with undefined tokens.
  First tried `import '../src/app/globals.scss'` in `components.tsx` — but that file also
  `@use`s `_typography.scss`, whose document-wide rules (`li::before { content: '◆' }`, the
  `ul` reset, the `a` recolour) then bled onto Ladle's own sidebar and list controls.
  Settled on `.ladle/theme.scss`: the three theme blocks + `body` surface copied from
  `globals.scss` verbatim, minus the typography `@use`. `components.tsx` imports it and
  exports a passthrough `Provider`. M0.31 turns `components.tsx` into the real decorator
  (app surface, containing block for `position: fixed` components, remount-on-theme so
  `ThemeToggle`'s facet actually switches).
- **`workshop` / `workshop:build`** npm scripts pointed at `ladle serve` / `ladle build` —
  the failing placeholders left by the backlog PR are gone. `makefile` targets and their
  `make help` lines updated to match; the header note no longer calls them placeholders.
- **`src/components/ThemeToggle/index.stories.tsx`** — a single `Default` render. M0.30
  needs a story to prove `@use '../../scss/...'` compiles with `next dev`'s resolution;
  state coverage (light/dark/reduced-motion) is M0.32's.
- **`tsconfig.json`** — `src/**/*.stories.tsx` added to `exclude`, mirroring the
  `*.test.tsx` line. `@ladle/react` ships its app sources as `.tsx` under
  `typings-for-build/`, which `skipLibCheck` doesn't reach and `strict` rejects; the
  workshop bundler strips types anyway, so `ladle build` still covers stories.
- **`.oxlintrc.json`** — `.ladle/*.{ts,mjs}` added to the node-env override (config +
  vite config), `.ladle/components.tsx` to the browser-env override.
- **Hot reload** — already provided by `ladle serve` (Vite HMR + React Fast Refresh);
  noted that only `.ladle/` file edits need a restart. `hmrPort` pinned (above).
- Verified: `workshop:build` exits 0 and writes gitignored `build/`; built CSS shows
  `ThemeToggle`'s `@use`'d tokens resolved **and** the theme-block `--token` definitions
  present and per-theme (`--accent` = `$sorrel-bright` dark / `$sorrel` light), with **no**
  `_typography.scss` output in the bundle; `make help` lists both targets; lint,
  format:check and typecheck pass.
