# Component workshop — summary

Full history: [`transcripts/workshop.md`](transcripts/workshop.md) ·
Decisions: [`design-decisions/`](design-decisions/)

Where every standalone component renders in isolation, against the real tokens, without a
page routed to it. Stood up in M0.30; the theme + token decorator landed in M0.31; the
first stories (M0.32) and the CI gate (M0.33) build on it.

- **Ladle**, not Storybook or Histoire — Vite + React only, so it never couples the
  workshop to a Next.js major; one dependency; one config file. Reasoning:
  [`design-decisions/m0.30-ladle-component-workshop.md`](design-decisions/m0.30-ladle-component-workshop.md).
- `.ladle/config.mjs` — `stories` glob, `port` 61000, `outDir` `build`, pinned `hmrPort` 61002. `addons.theme.defaultState: 'auto'` — the theme control's unset position, so the
  workshop opens letting `prefers-color-scheme` decide (the app's dark-first default lives
  in `globals.scss`, not here).
- `.ladle/vite.config.ts` — Sass API pinned to `modern-compiler`. Resolution is left at
  Vite/Sass defaults **because** that is what `next dev` does: relative `@use`, empty load
  paths. This file is the seam for keeping the two aligned if Next ever gains `sassOptions`.
- `.ladle/theme.scss` — a trimmed copy of `globals.scss`: the three theme blocks and the
  `body` surface, minus its `@use './typography'`. Importing `globals.scss` whole drags
  `_typography.scss`'s document-wide element rules (`li::before { content: '◆' }`, …) onto
  Ladle's own sidebar and list controls.
- `.ladle/components.tsx` — Ladle's load-once entry, and the **decorator** (M0.31). Imports
  `./theme.scss` (token custom properties) and `./story-frame.scss`. Its `Provider` reads
  the toolbar theme control (`globalState.theme`) and re-applies it through M0.29's
  `applyTheme()` — one implementation of the `data-theme` + `localStorage` write, shared
  with the app's `ThemeToggle`; `auto` clears the attribute so `prefers-color-scheme`
  decides. Wraps the story in `<div className="ladle-story-frame" key={theme}>` — the `key`
  remounts on theme change so a component that reads `data-theme` only on mount
  (`ThemeToggle`) follows the switch.
- `.ladle/story-frame.scss` — the app-surface frame (M0.31): `$surface-page` /
  `$text-primary` (the M0.6 `<body>` tokens, no per-story setup); `transform` to make the
  frame the containing block for a `position: fixed` child so it pins to the story, not
  Ladle's chrome; `overflow: hidden` so it clips like a viewport (no page scrollbar from a
  corner-pinned component); `.ladle-main` gutter zeroed and re-added on the frame.
  `_typography.scss` still stays out — M0.32 revisits if a story renders prose.
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
