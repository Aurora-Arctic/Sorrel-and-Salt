# Component workshop — summary

Full history: [`transcripts/workshop.md`](transcripts/workshop.md) ·
Decisions: [`design-decisions/`](design-decisions/)

Where every standalone component renders in isolation, against the real tokens, without a
page routed to it. Stood up in M0.30; the theme + token decorator landed in M0.31; every
component in the tree got its stories in M0.32; M0.33 added the gate that keeps it that way.

- **Ladle**, not Storybook or Histoire — Vite + React only, so it never couples the
  workshop to a Next.js major; one dependency; one config file. Reasoning:
  [`design-decisions/m0.30-ladle-component-workshop.md`](design-decisions/m0.30-ladle-component-workshop.md).
- `.ladle/config.mjs` — `stories` glob, `port` 61000, `outDir` `build`, pinned `hmrPort` 61002.
  `addons.theme.defaultState` is **meant to be `'auto'`** — the theme control's unset position,
  so the workshop opens letting `prefers-color-scheme` decide (the app's dark-first default
  lives in `globals.scss`, not here). M0.31 set it to `'auto'` deliberately and wrote the
  comment above it explaining why. **The file currently reads `'dark'`**: M0.32 flipped it back
  with no mention in any decision record or transcript, so code and comment now contradict each
  other and the workshop opens dark. Treat the code as the defect — do not "correct" this doc
  or that comment to match it.
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
  (`ThemeToggle`) follows the switch. A story pins its own theme with
  `MyStory.meta = { theme: 'light' | 'dark' }` (M0.32) — the `Provider` reads that over
  the toolbar.
- `.ladle/story-frame.scss` — the app-surface frame (M0.31): `$surface-page` /
  `$text-primary` (the M0.6 `<body>` tokens, no per-story setup); `transform` to make the
  frame the containing block for a `position: fixed` child so it pins to the story, not
  Ladle's chrome; `overflow: hidden` so it clips like a viewport (no page scrollbar from a
  corner-pinned component); `.ladle-main` gutter zeroed and re-added on the frame.
- `.ladle/typography.scss` — `_typography.scss` in the workshop (M0.32), reversing M0.30/M0.31's
  "keep it out". Its rules are a `typography-base` mixin now (`src/scss/_typography.scss` emits
  nothing on `@use`); the app `@include`s it in `body`, this file `@include`s it in
  `.ladle-story-frame`. Every story renders prose exactly as a page does; Ladle's own
  `<ul>`/`<li>`/`<a>` chrome, outside the frame, is untouched — which is what blocked it before.
- `.ladle/head.html` — injected into `<head>`; loads Cormorant Unicase + Lexend by name from
  Google Fonts so the workshop's type matches the app's (the app self-hosts them via `next/font`,
  which the workshop has no equivalent of). Dev-workshop only.
- **Hot reload is on** — `ladle serve` = Vite HMR + React Fast Refresh; only edits to the
  `.ladle/` files themselves need a dev-server restart.
- **Component stories live at exactly `src/components/<Name>/index.stories.tsx`** — beside
  `index.tsx` and `index.test.tsx`, imported the same way. The M0.33 gate is written against
  that shape. The `stories` glob is an array as of M0.32: it also picks up `.ladle/*.stories.tsx`
  for workshop-only pages that aren't components — currently just the design-language reference.
- **The M0.33 gate — `npm run check:stories`** (`scripts/check-component-stories.ts`) — walks
  `src/components/` and exits non-zero if any directory with an `index.tsx` has no sibling
  `index.stories.tsx`, printing each missing path. It runs in pre-commit (the `pre-commit`
  array in `package.json`) and nowhere else: M0.33 left it a plain npm script for the M0.17
  build job and the M0.20 PR gate to call, but both workflows landed without picking it up, so
  neither `check:stories` nor `npm run workshop:build` runs in CI today — a missing story, or
  one that throws, will not fail a PR. Not an Oxlint rule: Oxlint has no custom-rule API and the check
  is a cross-file filesystem assertion. `.ladle/*.stories.tsx` is out of scope by design — the
  gate only polices `src/components/`. Reasoning:
  [`design-decisions/m0.33-component-story-gate.md`](design-decisions/m0.33-component-story-gate.md).
- `npm run workshop` / `make workshop` — dev server on **61000**.
- `npm run workshop:build` / `make workshop-build` — static build to gitignored `./build`.
- `*.stories.tsx` is excluded from `tsc` (mirroring `*.test.tsx`) while `@ladle/react`'s
  bundled types don't pass `strict`; `ladle build` still compiles stories through esbuild.
- `ThemeToggle` (M0.32) has four stories: `Default` (follows the toolbar), `Light` /
  `Dark` (pinned via `.meta`), `ReducedMotion` (renders like `Default`; a linkable home
  for checking the component with `prefers-reduced-motion: reduce` on, which a story can't
  force). No test ids, no snapshots, no assertions — behaviour is `index.test.tsx`'s job.
- **Design-language reference** (M0.32) — `.ladle/design-language.{tsx,scss,stories.tsx}`,
  under `Design language` in the workshop. One page rendering the type scale, `--surface-*` /
  `--text-*` / `--accent-*` swatches, the eight `--group-*` colours as `chip()`'s two states,
  both `badge()` palettes, `modal-surface()`, `focus-ring()` and an ingredient-card specimen —
  all from the real `_variables.scss` / `_mixins.scss` / `_typography.scss`, no value re-typed.
  It's in `.ladle/` because the app never imports it (not a component); `design-language.scss`
  holds only reference-page chrome. `Default` follows the toolbar; `Light` / `Dark` pin a theme.
  The in-repo successor to the M0.6 / M0.7 exploration artifacts. Reasoning:
  [`design-decisions/m0.32-component-stories.md`](design-decisions/m0.32-component-stories.md).

## Stopgaps to unwind

The workshop's font plumbing is a Vite-side substitute for what `next/font` +
`src/app/layout.tsx` do at runtime — the app never defines `--font-body` /
`--font-display` in a stylesheet, so there is nothing to import. Until the app
grows a shared source for the font families:

- **`--font-body` / `--font-display` are redefined in `.ladle/typography.scss`'s
  `:root` block.** When the app exposes these values in a shared partial (a Sass
  map, or a dedicated sheet the app `@use`s rather than next/font-generated
  classes), delete the `.ladle/` copy and `@use` that. The family names
  (`'Lexend'`, `'Cormorant Unicase'`) are currently written in three places that
  must agree: the `$font-*` fallback stacks in `src/scss/_variables.scss`, the
  Google Fonts URL in `.ladle/head.html`, and this `:root` override.
- **`.ladle/head.html` pulls the faces from `fonts.googleapis.com`** — the one
  place in the project that does, against the app's self-hosting rule. Switch to
  self-hosted `@fontsource` so `workshop:build` needs no network access to Google.
- **The `:root` override lives in `.ladle/typography.scss`** (prose rules).
  Move it to its own `.ladle/fonts.scss` alongside the `head.html` concern.

Introduced in M0.32.
