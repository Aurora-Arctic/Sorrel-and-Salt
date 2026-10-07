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
- **A story that opens a modal sets `meta = { iframed: true }`** (M5.6, the
  owner's call). `Modal` opens with `showModal()`, which puts the dialog in the
  document's top layer: in the workshop's own document that covers Ladle's
  sidebar too. In its own iframe, carrying the global provider and styles, the
  dialog covers the story's frame and nothing else. `Modal` and `CategoryForm`
  are the first.
- `*.stories.tsx` is excluded from `tsc` while `@ladle/react`'s bundled types
  don't pass `strict`; `ladle build` still compiles stories through esbuild.
  Test files are not excluded — `tests/` is in tsconfig's `include` and `tsc`
  is the only thing that typechecks it.

## `.ladle/`

- **`config.mjs`** — `stories` glob, `port` 61000, `previewPort` 61001
  (`ladle preview`), `outDir` `.reports/workshop`, pinned `hmrPort` 61002. `storyOrder`
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
  the toolbar. It also wraps the frame in the app's `Providers`
  (`src/app/providers.tsx`), so a component that uses TanStack Query
  (`EmailForm`'s `useMutation`) finds the one client the root layout mounts —
  a story never mounts a `QueryClientProvider` of its own, which
  `tests/guards/graphql-client.test.ts` would refuse.
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
  `.ladle-main` gutter zeroed and re-added on the frame, 3rem a side, and
  `space(4)` below 30rem, where 3rem would leave a 375px story 279px, and 6rem
  at the bottom from 48rem, where Ladle pins its toolbar over the window's
  bottom edge and a long story's last line sat beneath it (MB.131). It also
  holds `.story-guide` and `.story-note`, a story's own "what to try" panel
  and the line saying what it stands in for, such as where a page would
  navigate. Also carries the
  `.ladle-story-frame--reduced-motion` rule the `reducedMotion` pin above
  toggles — a `!important` blanket over every transition in the frame, not
  just the ones the app's own `reduced-motion` mixin reaches, since the real
  media feature zeroes transitions app-wide too.
- **`typography.scss`, `layout.scss`, `primitives.scss`** — each `@include`s
  its `src/scss/` `*-base` mixin into `:where(.ladle-story-frame)`, so a story
  gets the identical prose, document structure and class layer a page does
  while Ladle's own `<ul>` / `<li>` / `<a>` chrome, outside the frame, stays
  untouched. **The `:where()` is load-bearing**: it gives the scope no
  specificity, as `body` has next to nothing in the app. Scoped by a bare class,
  `.ladle-story-frame p` (0,1,1) outranked every component's own `p` class
  (0,1,0), so the workshop drew `EmailForm`'s notice at body size with the
  paragraph margin, and `AdminNav`'s rows with the ◆ bullet the page never
  shows (MB.114).
- **`UnoptimizedLink.tsx`** — what `next/link` resolves to here, via the alias in
  `vite.config.ts`: a plain anchor, the substitution Ladle's Next.js guide
  prescribes. Vite has no Next router and no `process.env`, and the first
  story to import `next/link` (Welcome) rendered blank without it. That was
  also when `vite.config.ts` turned out never to have been loaded: Ladle passes
  `viteConfig` to Vite's loader as given and Vite otherwise looks in the
  project root, so `config.mjs` now names the file explicitly.
- **`head.html`** — injected into `<head>`; loads Cormorant Unicase + Lexend by
  name from Google Fonts so the workshop's type matches the app's (the app
  self-hosts them via `next/font`, which the workshop has no equivalent of).
- **`foundations.{tsx,scss,stories.tsx}`** — one reference page under
  `Foundations`: the raw palette and the runtime tokens, the type scale and
  `type-size()`'s four roles, `space()`'s steps, `radius()`'s roles, every
  button, notices, a form built from the field primitives, the eight
  seeded group colour pairs as `chip()`'s two states — read from
  `src/db/seed/category-groups.ts` and set inline by `chipColors()`, as a page
  does — the badge palettes, a modal
  and an ingredient-card specimen. All of it comes from the real partials, and
  every printed value — a hex, a step's length — is generated by
  `foundations.scss` from the partial's own map rather than typed. Its
  `PhoneDark` and `PhoneLight` stories pin a 375px width. It lives in
  `.ladle/` because the app never imports it; `foundations.scss` holds only
  reference-page chrome, nested under `.fd`.

## Mail templates (MB.66)

- **`src/emails/*.stories.tsx`** is the second story glob in `config.mjs`: one
  story file beside each mail template, titled `Emails / …`. The shared frame
  in `src/emails/parts/` has none; every template previews it.
- **`EmailPreview.tsx`** renders a template's `Message` and shows the HTML part
  in an iframe, so the workshop's styles and document never reach the mail,
  with the plain-text part in a `<details>` beneath. Images and fonts load
  from the workshop's own origin: Vite serves `public/` in `ladle serve` and
  copies it into the build, and on staging `/email/*` is the app's own public
  prefix.
- **The toolbar's theme reaches the mail by rewriting it.** A framed
  document's `prefers-color-scheme` follows the browser, not the frame's
  `color-scheme` — checked in the Playwright Chromium, where a light page left
  the mail dark. So the preview reads the page's computed `color-scheme` and
  turns the mail's one `LIGHT_MEDIA` block into `@media all` or `@media not
all`: the same rules a client in that scheme applies, nothing re-styled. A
  story's `meta.theme` pin wins, as for components.

## Commands and gates

- `npm run workshop` / `make workshop` — dev server on **61000**, with Vite HMR
  and React Fast Refresh. Only edits to the `.ladle/` files themselves need the
  dev server restarted.
- `npm run workshop:build` / `make workshop-build` — static build to the
  gitignored `.reports/workshop/`, via `scripts/build-workshop.ts`. See **The build gate**
  below for why the wrapper exists.
- `tests/guards/workshop-guards.test.ts` (MB.38, MB.66) — the mechanical guards, as
  ordinary Vitest tests in the `unit` project. One fails if a directory under
  `src/components/` has an `index.tsx` but no sibling `index.stories.tsx` —
  not an Oxlint rule, because Oxlint has no custom-rule API and this is a
  cross-file filesystem assertion; scoped to `src/components/`, with
  `.ladle/*.stories.tsx` deliberately out of scope; and proven on a throwaway
  tree before it is trusted on the real one. Its twin (MB.66) fails if a
  top-level `src/emails/<name>.tsx` has no sibling `<name>.stories.tsx`, or
  if `config.mjs` stops globbing them. The last fails if
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

## On staging (M2.10)

Staging serves the workshop at `https://staging.sorrelandsalt.com/workshop`,
to admins only. Local `npm run workshop` / `make workshop` on 61000 is
untouched and unauthenticated — local development is the one relaxed
environment. Production and hotfix previews never carry it.

- **How it ships.** `deploy.yml` runs, on a staging deploy alone (the step's
  `if:` reads `git_branch == 'staging'`), `npm run workshop:build -- --base
/workshop/ --outDir public/workshop` before `vercel build`. The build
  wrapper forwards its arguments to `ladle build`. Next then serves the files
  from `public/` as it would any static asset; `public/workshop` is
  gitignored. `--base` is what makes Ladle's asset URLs absolute under
  `/workshop/`; drift it from the proxy's prefix and the page ships with every
  asset 404ing. `tests/guards/workshop-deploy.test.ts` reads the step as data
  and pins the flags, the staging-only `if:`, and its place before
  `vercel build`.
- **How it is gated: in `src/proxy.ts`, and nowhere else can do it.** Next
  runs the proxy before it serves `public/`, and a static file has no page to
  call `requireSession()`, so the proxy's usual cookie-only check would admit
  any signed-in account — and signing in with any provider earns one. For
  `/workshop` and everything beneath it (`/workshopping` is not beneath it),
  and only there, the proxy asks Better Auth for the live session through
  `sessionFromHeaders()` and hands it to `assertWorkshopAccess()`
  (`src/modules/identity/services/workshop-access.ts` — the rule is a service's, per rule 1).

  | Request                      | Answer                                                       |
  | ---------------------------- | ------------------------------------------------------------ |
  | No session cookie            | 307 to `/sign-in?next=<path>`, as any protected route        |
  | A cookie Better Auth rejects | The same redirect                                            |
  | A live session, role `user`  | 403, plain text                                              |
  | A live session, role `admin` | The file, with `Content-Security-Policy: connect-src 'none'` |

  The 403 is plain rather than the styled page `/admin` will have: it answers
  asset requests as well as the page, and nothing styled exists to rewrite to
  yet. The lookup module is imported dynamically inside the workshop branch,
  so no other request loads the database client in the proxy.

- **Bare `/workshop` is rewritten to `/workshop/index.html`, query kept.**
  Ladle is a single page routed by `?story=`, and Next serves no directory
  index.
- **No application data is reachable through it.** The build is static — no
  story reaches GraphQL, and `meta.json` is the story index. A story whose
  component asks `/api/graphql` answers it in the page: `IngredientForm`'s
  stands in for `window.fetch` while mounted and answers its lookups from
  invented rows ([`components/ingredient-form.md`](components/ingredient-form.md), "Stories"),
  so the request never leaves the page and the policy below has nothing to
  refuse. The workshop's own
  scripts nonetheless run on the app's origin carrying an admin's cookie, so
  every workshop response carries `connect-src 'none'`: `fetch`, XHR and
  WebSockets from the page are refused by the browser, `/api/graphql`
  included. Ladle's static build makes no request of its own that this breaks;
  the one `fetch` in its bundle is Vite's modulepreload polyfill, which a
  browser with native `modulepreload` never runs.
- **Admin only for now.** A role that can open the workshop without admin's
  other powers is v2 (DESIGN.md §13, "A workshop-viewer role"); when it
  lands, `assertWorkshopAccess()` is the one line that changes.

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
