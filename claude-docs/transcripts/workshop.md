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

## 2026-09-08 — M0.31 · Theme + token decorator

Full reasoning:
[`../design-decisions/m0.31-workshop-theme-decorator.md`](../design-decisions/m0.31-workshop-theme-decorator.md).

- **`.ladle/components.tsx`** grew from M0.30's passthrough into the decorator. It reads
  Ladle's own toolbar theme control (`globalState.theme`, one of `light`/`dark`/`auto`) —
  no second control built — and re-applies it: `light`/`dark` through `applyTheme()`
  imported from `src/components/ThemeToggle` (M0.29), so the `data-theme` write and the
  persisted `localStorage['theme']` choice have exactly one implementation; `auto` (the
  unset position) clears the attribute and the key so `.ladle/theme.scss` resolves the
  theme through `prefers-color-scheme`, same as `globals.scss` for a viewer who never
  clicked the toggle.
- **Remount on theme change.** The story is wrapped in
  `<div className="ladle-story-frame" key={theme}>`; changing `key` remounts the subtree so
  `ThemeToggle` — which reads `data-theme` only in mount effects — re-reads and its facet /
  `aria-pressed` follow the control. A parent effect runs after its children's, so the
  decorator's `useLayoutEffect` can't beat the remounted child's mount read; it doesn't
  need to, because Ladle's toolbar handler sets `data-theme` synchronously before it
  dispatches. `useLayoutEffect` keeps the persisted write and the `auto` clear pre-paint.
- **`.ladle/config.mjs`** — `addons.theme.defaultState` `'dark'` → `'auto'`, so the
  workshop opens in the unset state. The app stays dark-first via `globals.scss`, not this
  file.
- **`.ladle/story-frame.scss`** (new, kept out of `theme.scss` whose theme blocks are a
  verbatim `globals.scss` copy) — the app-surface frame: `background-color: $surface-page`
  / `color: $text-primary` (the M0.6 `<body>` tokens, no per-story setup);
  `transform: translateZ(0)` to make the frame the containing block for a `position: fixed`
  child, so `ThemeToggle` pins to the frame's corner not Ladle's chrome;
  `.ladle-main { padding: 0 }` to drop Ladle's 3em gutter and `padding: 3rem` on the frame
  to give it back (the one plain length — no spacing scale in M0.6–M0.8, and a workshop
  gutter is chrome).
- **`overflow: hidden` on the frame** — added after the first pass: with the new
  `transform` containing block, `ThemeToggle`'s rotated parked facet overflowing past the
  top/right edges started adding a horizontal **page scrollbar in Ladle** (the app doesn't
  show it). The frame stands in for the app viewport, so it clips like one; a tall story
  scrolls within the frame, never sideways.
- **`_typography.scss` stays out** (M0.30 left this open). It emits bare element selectors
  a `@use` can't scope to the story frame; folding it in either bleeds onto Ladle's list
  chrome or needs the app's one global prose stylesheet restructured — out of proportion
  here, and no story renders prose yet. M0.32 revisits.
- Verified: `workshop:build` exits 0; built CSS carries `.ladle-story-frame` with the
  surface tokens, the `transform`, `overflow: hidden` and the `.ladle-main` reset; lint,
  format:check, typecheck pass (`tsconfig.json` doesn't include `.ladle/`, so `tsc` skips
  `components.tsx` — the `@ladle/react` value import is bundled by Vite and covered by the
  build). In `npm run workshop`: the toolbar control switches the frame and the toggle's
  facet together, first load leaves `<html>` with no `data-theme`, and the corner toggle
  no longer scrolls the page.
