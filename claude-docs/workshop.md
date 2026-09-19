# Component workshop — summary

This summary is self-contained — M0's transcripts and decision records are
archived and are not required reading.

Where every standalone component renders in isolation, against the real tokens,
without a page routed to it.

- **Ladle**, not Storybook or Histoire — Vite + React only, so it never couples
  the workshop to a Next.js major; one dependency, one config file.
- **Component stories live at exactly `src/components/<Name>/index.stories.tsx`**,
  beside `index.tsx`. The `stories` glob also picks up
  `.ladle/*.stories.tsx`, for workshop-only pages the app never imports.
- Stories carry no test ids, no snapshots and no assertions — behaviour is the
  test's job, and since MB.41 the test is not beside the story: it lives at
  `tests/components/<Name>/index.test.tsx`. The story stays in the component
  directory because Ladle discovers components by that file, which is the one
  thing the move could not relocate.
- `*.stories.tsx` is excluded from `tsc` while `@ladle/react`'s bundled types
  don't pass `strict`; `ladle build` still compiles stories through esbuild.
  Test files are not excluded — `tests/` is in tsconfig's `include` and `tsc`
  is the only thing that typechecks it.

## `.ladle/`

- **`config.mjs`** — `stories` glob, `port` 61000, `previewPort` 61001
  (`ladle preview`), `outDir` `build`, pinned `hmrPort` 61002. `storyOrder`
  forces each component's `Default` story first and leaves the rest in Ladle's
  own order; it is a global-config hook only (no per-story-file equivalent) and
  must stay a self-contained function, since Ladle serializes it with
  `.toString()`. `hmrPort` is pinned only so the HMR socket lands on a known
  port rather than a random free one — it stays reachable when the workshop is
  opened over the LAN instead of at `localhost`, and it does not move between
  restarts.
  - **`addons.theme.defaultState: 'dark'`** matches the app's dark-first default
    in `globals.scss` (`:root { @include theme-dark }`), so the workshop opens
    the same way a viewer who has never touched the toggle sees the app.
    M0.31 briefly set it to `'auto'` (the control's unset position, letting
    `prefers-color-scheme` decide) and M0.32 moved it back; `'dark'` is the
    confirmed intent, and `tests/guards/workshop-guards.test.ts` pins it.
- **`config.d.mts`** — a hand-written declaration of the slice of `config.mjs`
  that guard reads, for `tsc` alone: `allowJs` is off, so the
  `@type {import('@ladle/react').UserConfig}` JSDoc in `config.mjs` reaches
  editors and nothing else, and the test could not import the config without
  it. Deliberately not `UserConfig` itself — see the `tsconfig` note under
  Commands and gates. Ladle never reads it.
- **`vite.config.ts`** — Sass API pinned to `modern-compiler`. Resolution is
  left at Vite/Sass defaults **because** that is what `next dev` does: relative
  `@use`, empty load paths. This file is the seam for keeping the two aligned
  if Next ever gains `sassOptions`.
- **`theme.scss`** — a trimmed copy of `globals.scss`: the three theme blocks
  and the `body` surface, minus its `@use './typography'`. Importing
  `globals.scss` whole drags `_typography.scss`'s document-wide element rules
  (`li::before { content: '◆' }`, …) onto Ladle's own sidebar and list controls.
  **The three theme blocks are a verbatim copy and must be kept in step with
  `globals.scss`; they must not grow layout rules of their own.**
- **`components.tsx`** — Ladle's load-once entry, and the **decorator**. Imports
  `theme.scss` and the three `*-base` sheets below. Its `Provider` reads the
  toolbar theme control (`globalState.theme`) and re-applies it through
  `applyTheme()` — the one shared implementation of the `data-theme` +
  `localStorage` write, also used by the app's `ThemeToggle`; `auto` clears the
  attribute so `prefers-color-scheme` decides. Wraps the story in
  `<div className="ladle-story-frame" key={theme}>`, where the `key` forces a
  remount on theme change so a component that reads `data-theme` only on mount
  follows the switch. A story pins its own theme with
  `MyStory.meta = { theme: 'light' | 'dark' }`, which the `Provider` reads over
  the toolbar.
  - **`reducedMotion` pin (MB.1).** `prefers-reduced-motion: reduce` is a real
    OS/browser setting Ladle can't expose a toolbar control for — there's
    nothing to dispatch the way the theme control dispatches `data-theme`. A
    story pins `.meta = { reducedMotion: true }` (ThemeToggle's `ReducedMotion`
    is the first) to get it simulated instead of merely documented: the
    `Provider` patches `window.matchMedia` so the reduced-motion query reports
    a match — the same check ThemeToggle's click handler makes to park a
    facet immediately when no `transitionend` is coming — and
    adds `ladle-story-frame--reduced-motion` to the frame, whose rule in
    `story-frame.scss` zeroes every transition inside it. Both halves are
    needed: the CSS alone doesn't touch the click-time check the fix added,
    and the `matchMedia` patch alone doesn't stop a real transition from
    running and firing its own `transitionend`. The patch is undone on
    cleanup so it can't leak into the next story.
- **`story-frame.scss`** — the app-surface frame: `$surface-page` /
  `$text-primary` so a story needs no per-story setup; `transform`, making the
  frame the containing block so a `position: fixed` child pins to the story
  rather than Ladle's chrome; `overflow: hidden` so it clips like a viewport;
  `.ladle-main` gutter zeroed and re-added on the frame. Also carries the
  `.ladle-story-frame--reduced-motion` rule the `reducedMotion` pin above
  toggles — a `!important` blanket over every transition in the frame, not
  just the ones the app's own `reduced-motion` mixin reaches, since the real
  media feature zeroes transitions app-wide too.
- **`typography.scss`, `layout.scss`, `primitives.scss`** — each `@include`s
  its `src/scss/` `*-base` mixin into `.ladle-story-frame`, so a story gets the
  identical prose, document structure and class layer a page does while Ladle's
  own `<ul>` / `<li>` / `<a>` chrome, outside the frame, stays untouched.
- **`head.html`** — injected into `<head>`; loads Cormorant Unicase + Lexend by
  name from Google Fonts so the workshop's type matches the app's (the app
  self-hosts them via `next/font`, which the workshop has no equivalent of).
- **`design-language.{tsx,scss,stories.tsx}`** — one reference page under
  `Design language`, rendering the type scale, `--surface-*` / `--text-*` /
  `--accent-*` swatches, the eight `--group-*` colours as `chip()`'s two states,
  both `badge()` palettes, `modal-surface()`, `focus-ring()` and an
  ingredient-card specimen — all from the real partials, no value re-typed. It
  lives in `.ladle/` because the app never imports it; `design-language.scss`
  holds only reference-page chrome, and **must stay nested under `.dl`** —
  `.ladle-story-frame p` (0,1,1) outranks `.eyebrow` (0,1,0) otherwise.

## Commands and gates

- `npm run workshop` / `make workshop` — dev server on **61000**, with Vite HMR
  and React Fast Refresh. Only edits to the `.ladle/` files themselves need the
  dev server restarted.
- `npm run workshop:build` / `make workshop-build` — static build to the
  gitignored `./build`, via `scripts/build-workshop.ts`. See **The build gate**
  below for why the wrapper exists.
- `tests/guards/workshop-guards.test.ts` (MB.38) — the two mechanical guards, as
  ordinary Vitest tests in the `unit` project. One fails if a directory under
  `src/components/` has an `index.tsx` but no sibling `index.stories.tsx` —
  not an Oxlint rule, because Oxlint has no custom-rule API and this is a
  cross-file filesystem assertion; scoped to `src/components/`, with
  `.ladle/*.stories.tsx` deliberately out of scope; and proven on a throwaway
  tree before it is trusted on the real one. The other fails if
  `config.mjs`'s `addons.theme.defaultState` is not `'dark'`. Both were
  standalone scripts under `scripts/` until MB.38, written that way only
  because Vitest had not landed yet.
- ⚠️ **`workshop:build` is not a render smoke test.** It cannot catch a story
  that throws, at render time or module-eval time — Ladle code-splits stories
  into browser-only chunks that the static build never executes. The one thing
  it genuinely catches is an unresolvable import.
- **`tsconfig` does not reach `.ladle/` or `scripts/`.** Oxlint and the build
  are the only checks covering those files; `tsc --noEmit` will not flag them.
- **Both gates run in CI, and neither in pre-commit.** The guards run with the
  rest of the suite on the `vitest` job — whose path filter names
  `.ladle/config.mjs` explicitly, since it is not under `src/**` — and
  `workshop:build` on `checks.yml`'s `build` leg. Pre-commit is lint,
  `format:check` and typecheck, test-free by decision (MB.38): a hook that
  runs tests is a hook people start skipping, and a PR cannot skip CI.

## The build gate

`scripts/build-workshop.ts` runs `ladle build`, mirrors its output verbatim, and
exits non-zero if Vite's own `Build failed` marker appears in it. That is a
workaround for an upstream gap, not a reimplementation of the build.

**`@ladle/react` 5.1.1's CLI always exits 0.** Its `lib/cli/vite-prod.js` wraps
Vite's `build()` in a try/catch, logs the error and returns `false`; its
`lib/cli/build.js` awaits that call and discards the return value, so nothing
ever becomes a non-zero exit code. Verified directly: a story importing a module
that does not exist prints Vite's `✗ Build failed` / `Could not resolve …` and
`ladle build` still exits 0.

**Neither of the two tidier fixes is available.** There is no CLI flag for it,
and the CLI's build function cannot be imported directly — `lib/cli/build.js` is
not in the package's `exports` map, so a deep import throws
`ERR_PACKAGE_PATH_NOT_EXPORTED`.

The marker never appears on a clean run, so the wrapper passes through unchanged
if a future `@ladle/react` fixes the exit code, and can be deleted whenever this
repo bumps past the fixed version.

## Stopgaps to unwind

The workshop's font plumbing substitutes, Vite-side, for what `next/font` +
`src/app/layout.tsx` do at runtime — the app never defines `--font-body` /
`--font-display` in a stylesheet, so there is nothing to import.

- **`--font-body` / `--font-display` are redefined in `.ladle/typography.scss`'s
  `:root` block.** When the app exposes these in a shared partial, delete the
  `.ladle/` copy and `@use` that instead. The family names (`'Lexend'`,
  `'Cormorant Unicase'`) are currently written in three places that must agree:
  the `$font-*` stacks in `src/scss/_variables.scss`, the Google Fonts URL in
  `.ladle/head.html`, and this `:root` override.
- **`.ladle/head.html` pulls the faces from `fonts.googleapis.com`** — the one
  place in the project that does, against the app's self-hosting rule. Switch to
  self-hosted `@fontsource` so `workshop:build` needs no network access.
- **That `:root` override sits in `.ladle/typography.scss`** (prose rules).
  Move it to its own `.ladle/fonts.scss`, alongside the `head.html` concern.
