# Component workshop — summary

Full history: [`transcripts/workshop.md`](transcripts/workshop.md) ·
Decisions: [`design-decisions/`](design-decisions/)

Where every standalone component renders in isolation, against the real tokens, without a
page routed to it. Stood up in M0.30; the theme decorator (M0.31), the first stories
(M0.32) and the CI gate (M0.33) build on it.

- **Ladle**, not Storybook or Histoire — Vite + React only, so it never couples the
  workshop to a Next.js major; one dependency; one config file. Reasoning:
  [`design-decisions/m0.30-ladle-component-workshop.md`](design-decisions/m0.30-ladle-component-workshop.md).
- `.ladle/config.mjs` — `stories` glob, `port` 61000, `outDir` `build`, dark default theme
  (`addons.theme.defaultState`), pinned `hmrPort` 61002.
- `.ladle/vite.config.ts` — Sass API pinned to `modern-compiler`. Resolution is left at
  Vite/Sass defaults **because** that is what `next dev` does: relative `@use`, empty load
  paths. This file is the seam for keeping the two aligned if Next ever gains `sassOptions`.
- `.ladle/theme.scss` — a trimmed copy of `globals.scss`: the three theme blocks and the
  `body` surface, minus its `@use './typography'`. Importing `globals.scss` whole drags
  `_typography.scss`'s document-wide element rules (`li::before { content: '◆' }`, …) onto
  Ladle's own sidebar and list controls.
- `.ladle/components.tsx` — Ladle's load-once entry. M0.30 uses it only to
  `import './theme.scss'`, so the theme token custom properties (`--accent`, …) exist in
  the workshop. Passthrough `Provider` for now; M0.31 grows it into the app-surface
  decorator + light/dark toolbar control (containing block for `position: fixed`
  components, remount on theme change).
- **Hot reload is on** — `ladle serve` = Vite HMR + React Fast Refresh; only edits to the
  `.ladle/` files themselves need a dev-server restart.
- **Stories live at exactly `src/components/<Name>/index.stories.tsx`** — beside
  `index.tsx` and `index.test.tsx`, imported the same way. Nothing else is a story; the
  M0.33 gate is written against this shape.
- `npm run workshop` / `make workshop` — dev server on **61000**.
- `npm run workshop:build` / `make workshop-build` — static build to gitignored `./build`.
- `*.stories.tsx` is excluded from `tsc` (mirroring `*.test.tsx`) while `@ladle/react`'s
  bundled types don't pass `strict`; `ladle build` still compiles stories through esbuild.
- `ThemeToggle` ships a single `Default` story as the pipeline smoke test — real state
  coverage is M0.32.
