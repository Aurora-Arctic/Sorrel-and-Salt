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

## 2026-09-08 — M0.32 · Stories for every component in the tree

Full reasoning:
[`../design-decisions/m0.32-component-stories.md`](../design-decisions/m0.32-component-stories.md).

- The tree held one component — `ThemeToggle` (M0.29) — so this task is
  `src/components/ThemeToggle/index.stories.tsx`, grown from M0.30's single `Default`
  render to four: `Default`, `Light`, `Dark`, `ReducedMotion`.
- **Per-story theme pin.** `Light` / `Dark` set `.meta = { theme: 'light' | 'dark' }`.
  Ladle passes a story's `.meta` to the `Provider` as `storyMeta`; the M0.31 decorator
  now reads `storyMeta?.theme` and, when it's `light`/`dark`, uses it over
  `globalState.theme` for both the `applyTheme()` call and the remount `key`. ~3 lines in
  `.ladle/components.tsx` — the "opt-in per-story parameter" M0.31's decision doc had
  already named as the extension point. `Default` / `ReducedMotion` set no `.meta` and
  follow the toolbar.
- **`ReducedMotion` renders like `Default`** — `prefers-reduced-motion: reduce` is a media
  feature a story can't force (OS or DevTools only). Its reason for being a separate,
  linkable story is in the source comment (Ladle's source addon shows it). It renders
  **no** `<p>` — that would reopen M0.31's "keep `_typography.scss` out" call, so M0.32
  keeps prose out of the DOM and the decision settled.
- **No test ids, no snapshots, no assertions.** The stories only render; `ThemeToggle`'s
  behaviour is already covered by `index.test.tsx` with role/label queries.
- `claude-docs/components/theme-toggle.md` gets a **Stories** section linking the file.

Then, on the same task and at the user's direction (they disagreed with M0.31's
"keep `_typography.scss` out" call and wanted a design-language reference in the repo):

- **`_typography.scss` into the workshop, scoped.** Its rules became a `typography-base`
  mixin — the file emits nothing on `@use` now. `src/app/globals.scss` `@include`s it in
  `body` (same rules, one `body` ancestor deeper: `h1` → `body h1`, 0,0,1 → 0,0,2;
  component classes still win). `.ladle/typography.scss` (new) `@include`s it in
  `.ladle-story-frame`, so every story renders prose like a page and Ladle's own chrome —
  the `<ul>`/`<li>`/`<a>` the bare rules used to bleed onto — is outside the frame and
  untouched.
- **`.ladle/head.html`** (new) — Ladle injects it into `<head>`; loads Cormorant Unicase +
  Lexend by name from Google Fonts (weights matched to `src/app/fonts.ts`) so the
  workshop's type looks like the app's. The app self-hosts via `next/font`; the workshop
  had no equivalent and was rendering in Arial. Dev-workshop only — the app never contacts
  `fonts.googleapis.com` and `build/` is gitignored/CI-only.
- **Design-language reference page** — `.ladle/design-language.{tsx,scss,stories.tsx}`,
  titled `Design language`. Renders the type scale, `--surface-*`/`--text-*`/`--accent-*`
  swatches, the eight `--group-*` colours as `chip()`'s two states, both `badge()`
  palettes, `modal-surface()`, `focus-ring()`, and an "everything at once" ingredient-card
  specimen — every value read from the real partials, none re-typed. The in-repo successor
  to the throwaway M0.6/M0.7 exploration artifacts.
  - **In `.ladle/`, not `src/components/`** — the app never imports it, so it isn't a
    component. `config.mjs`'s `stories` became an array (`+ '.ladle/*.stories.tsx'`), which
    **reverses M0.30's AC** "stories are discovered only at
    `src/components/**/index.stories.tsx`". M0.33's gate stays "a component dir needs a
    story"; the `.ladle/` path is the known exception. `.oxlintrc.json`'s browser-env
    override widened `.ladle/components.tsx` → `.ladle/*.tsx`.
  - **`design-language.scss` holds nothing the app needs** — reference chrome plus a
    hand-rolled `.dl-btn` (buttons are a deliberate future redesign). Everything shared is
    `@include`d from `src/scss/`. No test file: static page, no behaviour; `workshop:build`
    in CI is the smoke test.
  - Three stories: `Default` (follows the toolbar), `Light` / `Dark` (pin a theme via
    `.meta`, reusing M0.32's per-story pin).
- Verified: `workshop:build` exits 0; `build/meta.json` lists `themetoggle--default`,
  `--light`, `--dark`, `--reduced-motion` **and** `design-language--default`, `--light`,
  `--dark`; the story bundles carry `theme:"light"` / `"dark"`. Built CSS shows
  `.ladle-story-frame h1 { … }` and the `◆` list marker scoped to the frame (no leak to
  Ladle chrome), and `.dl-chip--protection` / `.dl-badge--safety` resolved through the M0.8
  mixins. `globals.scss` recompiles; app prose rules unchanged apart from the `body`
  prefix. lint, format:check, typecheck pass (`tsc` doesn't reach `.ladle/`; oxlint lints
  it, clean).
- Fonts: `$font-heading`/`$font-body` open with a bare `var(--font-*)` that `next/font`
  fills on `<html>` in the app; the workshop had no equivalent, so the whole `font-family`
  went invalid-at-computed-value (no fallback in the `var()` → doesn't fall through to the
  quoted name). `.ladle/typography.scss` now defines `:root { --font-body; --font-display }`
  to the plain family names `.ladle/head.html` loads.
- Weight tuning (in this PR, at the user's request — the mixin/partial changes are shared,
  so app-wide): all four heading levels go to `font-weight: 700` — Cormorant Unicase's
  heaviest (no variable axis). A size-ramp (h1/h2 600, h3/h4 700) was tried first and wasn't
  enough on the dark theme at h3/h4; flattened to 700. Nothing above 700 exists for this
  face. `badge()` **and** `chip()` gain `font-weight: 500` (Lexend 300 is too thin at their
  label sizes; M0.7's exploration had badges at 500). On the design-language page the
  token-name labels (`.dl-swatch__name`, `.dl-group-slug`) and `.dl-btn` also go to 500.
- Colour coverage: the page now opens with a **raw palette** section — the eight hand-picked
  hues from `_variables.scss` with fixed hex and a purpose line — ahead of the **runtime
  tokens** section (retitled, now carrying a purpose per `var(--token)` and `--text-on-color`
  added). Between them they name every colour and what it's for.
- `design-language.scss` is now wholly nested under `.dl`. `.ladle/typography.scss` scopes
  `_typography.scss` to `.ladle-story-frame`, making a bare `p` on the page
  `.ladle-story-frame p` (0,1,1) — which beats a plain `.eyebrow` (0,1,0), so the
  eyebrows, swatch captions and the binomial were silently rendering at body size/weight.
  Nesting lifts every rule to (0,2,x).
- Pulling styling back into the app partials (user: "styling should come from the app .scss,
  not be hard-coded in ladle"): `$font-mono` added to `_variables.scss`, a `code`/`kbd`/`samp`
  rule to `typography-base`. The page's token-name / hex / slug spans are now `<code>` styled
  by the app, not hand-rolled monospace in `design-language.scss`. What's left local there is
  layout lengths (no spacing/radius token) and `.dl-btn` / `.dl-binomial` — treatments the
  app has no primitive for and M0.6–M0.8 didn't build.
- Same direction, later: `section`/`.header`/`.footer` (was `.dl-masthead` / `.dl-sec-head` /
  `.dl-foot`) moved into a new `layout-base` mixin (`src/scss/_layout.scss`), `@include`d by
  `globals.scss` on `body` alongside `typography-base`, and by a new `.ladle/layout.scss` —
  mirroring `.ladle/typography.scss` — scoped to `.ladle-story-frame` and imported globally
  in `.ladle/components.tsx`, rather than `@include`d ad hoc from `design-language.scss`
  itself. The eyebrow overline (`.dl-eyebrow` → `.eyebrow`) moved into `typography-base` the
  same way. `design-language.scss` no longer needs `@use '../src/scss/layout'` at all.
- Further, at the user's explicit direction (these primitives "will be used throughout the
  site", ahead of the milestones that would otherwise define them): the panel, badge, chip,
  modal (+ its action row), button and specimen-card shapes moved out of
  `design-language.scss` into a new `primitives-base` mixin (`src/scss/_primitives.scss`),
  wired up the same way as typography/layout — `body { @include primitives-base; }` in
  `globals.scss`, `.ladle-story-frame { @include primitives-base; }` in a new
  `.ladle/primitives.scss`. Renamed `dl-` → bare on the way over: `.dl-panel` → `.panel`,
  `.dl-badges`/`.dl-badge--*` → `.badges`/`.badge--*`, `.dl-chip--*` → `.chip--*` (now
  generated from `map.keys($category-groups)` instead of the page's own `$dl-groups` list),
  `.dl-modal`/`.dl-modal__actions` → `.modal`/`.modal__actions`, `.dl-btn`/`.dl-btn--secondary`
  → `.btn`/`.btn--secondary`, `.dl-specimen*` → `.specimen*`. `.dl-type`'s heading-margin trim
  became `.tight-headings` in `typography-base` instead (it's a type-scale pattern, not a
  primitive shape). `badge()`/`chip()` are still the only source of colour/edge/geometry for
  the badge and chip classes — `_primitives.scss` is the class layer that wraps them, plus the
  shapes M0.8 never covered (panel, button, modal padding/actions, specimen layout).
  `modal-surface()`'s and the mixin file's own "no width, no layout — the component that owns
  it decides" reasoning still holds for `.modal`: its 24rem width stays a page-local override
  in `design-language.scss` (`.modal { max-width: 24rem; }`), same as the demo backdrop
  (`.dl-modal-demo`) and `.dl-binomial`, which are still local — the binomial is explicitly
  IngredientCard's (M8.x) to define, not this page's.
- Cross-checked `_typography.scss` / `_layout.scss` / `_primitives.scss` against their own
  boundaries (type · document structure · component shapes) and found one leftover split:
  `_typography.scss` still had bare `header { margin-bottom: 1rem; }` / `section { margin:
1rem 0; }` even though `_layout.scss` already owns `section`'s flex treatment and `.header`.
  Moved both into `layout-base`, merging the `section` margin into its existing flex rule;
  `header`'s stays a separate bare-element rule next to `.header` (same asymmetry as
  typography's bare `p`/`ul` vs a component's own classes — an unclassed `<header>` still
  gets the spacing, `.header` opts into the flex column on top of it). No compiled-output
  change, just one owner per selector instead of two files defining the same element.
- Ingredient-card specimen: `.dl-specimen__top` is `align-items: flex-start` so the badge
  cluster hugs its content instead of stretching to the name+binomial height; the binomial
  matches the M0.7 artifact — italic, `0.84rem`, `opacity: 0.7` on the inherited
  `--text-primary` (not the `--text-muted` token); the stock line splits into "on hand" /
  "threshold" at `opacity: 0.85`.

## 2026-09-08 — M0.33 · Gate: no standalone component without a story

- **A script, not an Oxlint rule.** Oxlint v1 has no custom-rule API, and the check is a
  cross-file filesystem assertion ("a dir with `index.tsx` must have `index.stories.tsx`
  beside it") — the wrong unit of work for a single-file linter. The task named the script
  as the fallback and this is it: `scripts/check-component-stories.ts`, Node native TS
  (`node --disable-warning=MODULE_TYPELESS_PACKAGE_JSON …`, matching `resume-2026/scripts/`),
  with `scripts/package.json` = `{ "type": "module" }`.
- **What it does.** Recursively walks `src/components/` (recursion so a nested
  `Forms/Input/` component is covered, matching M0.32's anticipated `forms--input--default`
  ids); every directory with an `index.tsx` must have `index.stories.tsx`. Clean → one-line
  count, exit 0. Missing → each path printed, exit 1. No `src/components/` → exit 0. Green on
  landing — `ThemeToggle` got its story in M0.32.
- **Scope is `src/components/` only.** `.ladle/*.stories.tsx` (design-language reference, any
  future workshop-only page) is the known non-component location from M0.32 and is not
  walked.
- **Where it runs.** Added to the `pre-commit` array in `package.json` (and the chained
  `pre-commit` script); `make check-stories` / `make pre-commit` wrap it. CI: `.github/` is
  not in the tree yet (M0.14–M0.21 unstarted), so `check:stories` and `workshop:build` stay
  plain npm scripts for the M0.17 build job and M0.20 PR gate to call when they land —
  `check:stories` for the missing-file gate, `workshop:build` so a _throwing_ story fails
  the run. No workflow file to edit in this PR.
- **M0.10 checklist criterion is N/A** — M0.10 ported only the six Gitflow skills; there is
  no component-documentation skill. `claude-docs/components/README.md` already lists the
  story file as part of a complete component; CLAUDE.md's Conventions bullet updated to name
  `check:stories`, where it runs, and the `.ladle/` exception.
- Verified: clean tree exit 0; seeded `src/components/_GateFixture/index.tsx` with no story →
  exit 1 naming the missing path, removed → exit 0; `npm run pre-commit` runs it last and
  passes; lint / format:check / typecheck pass; `workshop:build` still exits 0.
  Reasoning: [`../design-decisions/m0.33-component-story-gate.md`](../design-decisions/m0.33-component-story-gate.md).

## 2026-09-09 — M0.36 · Wire check:stories and workshop:build into CI

- **Both scripts added to `.github/workflows/build.yml`**, right after
  `npm run build`, gated by the same `should-run` input the build step
  already uses — no new reusable workflow, since `build.yml` already runs on
  every push that could touch a component.
- **Real finding: `ladle build` never fails, for any reason.** A runtime
  throw (render-time or module-eval-time) is never even executed — Ladle
  code-splits stories into browser-only chunks — but even the one thing the
  static build genuinely can catch, an unresolvable import, prints Vite's own
  `✗ Build failed` and still exits 0. Traced to `@ladle/react` 5.1.1's
  `lib/cli/vite-prod.js` catching the Vite build exception and returning
  `false`, which `lib/cli/build.js` never checks. No CLI flag fixes it, no
  newer version exists (5.1.1 is latest), and the build function isn't
  reachable via a supported import (`lib/cli/build.js` isn't in the
  package's `exports` map).
- **Fix: `scripts/build-workshop.ts`**, a wrapper — not a change to
  `scripts/check-component-stories.ts`, which the task's acceptance criteria
  left untouched. Spawns `ladle build`, relays its output unchanged, and
  turns Vite's own `Build failed` marker into a real `process.exit(1)`.
  `package.json`'s `workshop:build` script now points here instead of
  `ladle build` directly.
- Verified: seeded `src/components/_GateFixture/` with a story importing a
  nonexistent module → bare `ladle build` exits 0, the wrapper exits 1;
  fixture removed → wrapper exits 0, real `./build` output unchanged.
  `check:stories` regression re-run (missing-story fixture → exit 1, removed
  → exit 0) to confirm this task didn't touch the gate itself. lint /
  format:check / typecheck pass. `npx js-yaml build.yml` parses.
  Reasoning:
  [`../design-decisions/m0.36-ci-story-gate.md`](../design-decisions/m0.36-ci-story-gate.md).
