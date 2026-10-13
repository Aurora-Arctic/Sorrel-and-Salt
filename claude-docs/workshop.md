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
  dialog covers the story's frame and nothing else. `Modal` and the category
  form, now `GroupedValueForm`, are the first.
- **A page component's story renders inside the page's real frame**
  (MB.116): the `main` its route draws, with the same classes, such as
  `<main className="page-frame">` for `NotAuthorized` or
  `page-frame page-frame--narrow` for a form page. A story that drew the
  component bare would show a column the app never draws, since the frame
  sets the width and the spacing. Each also has `PhoneDark` and
  `PhoneLight` stories, `meta = { theme, width: 375 }` as the
  Foundations page has, so a review sees the page at phone width in both
  themes without touching the toolbar.
- **A story's title is a group, then the piece, both in title case** (M10.33,
  reorganised under MB.119). One rule picks the group, and the sidebar lists the
  groups in this order (`storyOrder` in `.ladle/config.mjs`):
  1. **Foundations** stands alone at the top: the tokens and primitives every
     piece is drawn from.
  2. **A piece the app draws in one area goes under that area's group**, in the
     order a person meets them: **Pages** (a whole page with no area of its own:
     Welcome, Not Authorized, the invitation page), **Sign In**, **Shell** (the
     chrome around a page: the bar, the account menu, the context row, the
     impersonation banner and the theme switch, even where the root layout
     draws one on a page without the bar), **Account**, **Coven**, **Admin**
     and **Emails**. `Coven / Member List`, `Admin / Group List`,
     `Account / Name Form`.
  3. **A piece the app draws in more than one area goes under its kind**:
     **Forms** (fields and the controls inside them), **Layout** (frames,
     lists, tables, pagers and what every page carries), **Navigation** and
     **Surfaces** (what says or holds something on the page: a notice, a
     modal, a provider's mark). `Forms / Field`, `Layout / Pager`.
  4. **Titles name the piece as the screens do**, so `Coven`, never
     `Workspace` (`Coven / Leave Coven Button`); the file and component names
     stay as they are.

  "Draws" is read from the imports under `src/app` and `src/components`
  today, not from a plan: a piece moves to its kind in the PR that makes a
  second area draw it (the ingredient form, the category picker and the filter
  form, drawn only by the admin pages so far, will move when the coven's
  ingredients page does). Nothing sits loose at the top level. Ladle builds a
  story's id from its title, so a title change moves the id, and with it any
  `?story=` link to it.

- `*.stories.tsx` is excluded from `tsc` while `@ladle/react`'s bundled types
  don't pass `strict`; `ladle build` still compiles stories through esbuild.
  Test files are not excluded — `tests/` is in tsconfig's `include` and `tsc`
  is the only thing that typechecks it.

## `.ladle/`

- **`config.mjs`** — `stories` glob, `port` 61000, `previewPort` 61001
  (`ladle preview`), `outDir` `.reports/workshop`, pinned `hmrPort` 61002,
  empty `hmrHost`. `storyOrder`
  lists the top-level groups in the order above, forces each component's
  `Default` story first and leaves the rest in Ladle's own order; it is a global-config hook only (no per-story-file equivalent) and
  must stay a self-contained function, since Ladle serializes it with
  `.toString()`. `hmrPort` is pinned so the HMR socket lands on a known port
  that compose can publish, rather than a random free one, and it does not
  move between restarts.
  - **`hmrHost: ''`** is what makes that socket reachable. Ladle runs Vite in
    middleware mode, so the HMR socket is a standalone server bound to
    `hmrHost ?? 'localhost'`; left unset, it listens on loopback only (`::1`),
    and in the `workshop` container the published 61002 never reaches it, so
    the page loads and never hot-reloads. The empty string survives the `??`,
    Vite binds every interface, and the browser connects back to the page's own
    hostname. `'0.0.0.0'` would bind the same but is also sent to the browser
    as the address to connect to.
  - **`addons.theme.defaultState: 'dark'`** matches the app's dark-first default
    in `globals.scss` (`:root { @include theme-dark }`), so the workshop opens
    the same way a viewer who has never touched the toggle sees the app.
    M0.31 briefly set it to `'auto'` (the control's unset position, letting
    `prefers-color-scheme` decide) and M0.32 moved it back; `'dark'` is the
    confirmed intent.
- **`vite.config.ts`** — Sass API pinned to `modern-compiler`, read by Ladle's own
  Vite 6.4 rather than the app's Vite 8 (which no longer types the option): 6.4
  defaults to `modern-compiler` only with `sass-embedded`, and the app has plain
  `sass`. Resolution is
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
  a story never mounts a `QueryClientProvider` of its own, which would split
  the cache.
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
  `$text-primary` so a story needs no per-story setup; `min-height: 100vh`, so the
  ground fills the window under a short story (Ladle paints its own darker
  background over the page's `body`, and a frame that stops short shows it);
  `transform`, making the
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
- **`navigation.ts`** — what `next/navigation` resolves to here, by the same
  alias: a `useRouter` whose every method goes nowhere. Next's own throws with
  no App Router mounted, and the first component to navigate on its own,
  the category list's filter (MB.178), now `GroupedValueList`'s, would
  render no story without it. Its `usePathname` answers `/admin/users`
  unless a story wraps itself in `WorkshopPathname` with another address, so
  AdminNav's stories show the current-page marker on People, and a tabbed
  page's story can open any tab (MB.115).
  Its `useRouter` reports a `push` or `replace` to a story that wraps itself in
  `WorkshopNavigation` and goes nowhere otherwise: a `RouteModal` closes by
  navigating, so without it a story's modal stays mounted as a native modal
  dialog, invisible once faded and holding the whole page inert (M10.33).
- **`reopenable.tsx`** — `Reopenable`, what stands in for a modal's owner in a
  story. The app's owners close a modal by unmounting it, and a story has no
  owner. It renders its children while open, hands them a `close`, answers a
  `RouteModal`'s navigation through `WorkshopNavigation` by closing too, and
  leaves an Open Again button in place of the modal, so a review can look
  again without a reload (M10.33). A story that draws a `Modal` whose
  `onClose` would do nothing wraps it in this.
- **`admin-frame.tsx`** — the shared story wrapper for the admin area.
  `AdminFrame` is the admin layout as it is: the context row holding
  "Admin" and `AdminNav`, then the `.admin-layout` column around the story,
  all inside the shell's `.app-shell__main`, which keeps the last row clear
  of the phone's bottom nav. Its optional `open` is the address the workshop
  pretends to be on, which decides the nav's current page.
  `AdminTabbedFrame` is a tabbed admin page inside it, as its route draws
  it: heading and tabs from `ADMIN_PAGES`, and an `action`. Nine stories
  drew this by hand before MB.115. It is the layout's markup only; the app's
  own layout reads the session.
- **`shell-frame.tsx`** — the application shell around a story, as
  `src/app/(shell)/layout.tsx` and the area layouts draw it: the bar, the
  context row, then the page, with fixture props (`FIXTURE_VIEWER`,
  `FIXTURE_WORKSPACES`). `ShellFrame`'s `area` picks the context row: a
  coven's (switcher and nav), the admin area's, the create page's (the
  switcher alone, and no row when there is no coven to switch to), or
  none, as on the account pages. Its `FIXTURE_WORKSPACES` carry each coven's
  `canReadMembers` as the layout works it out from the role (a member of the
  first two, a viewer of the third), so the coven nav offers Members as it
  would in the app. Like `admin-frame.tsx`, it is markup only;
  the layouts it copies are server components that read the session.
- **`fixtures.ts`** — invented rows the admin stories share, so a form's story
  and its list's story offer the same data: `GROUP_NAMES` (four names per kind
  of group), fixed ids with `asOptions()` and `asSlugs()` to shape them for a
  picker or a filter, and two pending `INVITATIONS`.
- **`press.ts`** — `press(name)` and `usePressOnMount(name)`, for a story that
  opens on a state a button press reaches, such as a Delete question over its
  form.
- **`types.ts`** — the types the workshop's helpers share, kept apart from
  their components as the repo keeps types: `AdminTabbedFrameProps` and
  `ShellFrameProps`.
- **`head.html`** — injected into `<head>`; loads Cormorant Unicase + Lexend by
  name from Google Fonts so the workshop's type matches the app's (the app
  self-hosts them via `next/font`, which the workshop has no equivalent of).
- **`foundations.{tsx,scss,stories.tsx}`** — one reference page under
  `Foundations`: the raw palette and the runtime tokens, the type scale and
  `type-size()`'s five roles, `space()`'s steps, `radius()`'s roles, every
  button, notices, a form built from the field primitives (a label row with
  its required mark and `InfoTip` among them), the switch off, on and
  disabled either way, through `SwitchField`, the page frame
  and its narrow form (with the account page's heading and `PageNav`), the data
  table, the pager (in a list navigation that goes nowhere, since `Pager`
  reads its `ListFrame`'s), the filter row with a switch, the page header, the four providers' sign-in buttons in
  each state with their brand parts printed from `$brand-palettes`, the
  provider marks, the eight
  seeded group colour pairs as `chip()`'s two states — read from
  `src/db/seed/category-groups.ts` and set inline by `chipColors()`, as a page
  does — the badge palettes, a modal
  and an ingredient-card specimen. All of it comes from the real partials, and
  every printed value — a hex, a step's length — is generated by
  `foundations.scss` from the partial's own map rather than typed. Its
  `PhoneDark` and `PhoneLight` stories pin a 375px width. The data table,
  the filter row and the page header are each drawn twice: at the page's
  width, and inside a 375px box (`.fd-phone`), so their container queries,
  which measure the element's own frame rather than the window, show the
  phone layout at any window size; the boxed table is the stacking one, and
  the page header's box also carries `.admin-layout`, so its action spans the
  line as on an admin page. It lives in
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

## Review screenshots

`scripts/review-screenshots.mjs` is a design review's camera (MB.116): it
shoots each page a review lists at 375×812 and 412×915, in the dark and the
light theme, full page, into the directory it is given —
`.reports/<task>-screenshots/` by convention, gitignored with the rest of
`.reports/`. Every later review reuses it rather than shooting by hand.

```sh
node scripts/review-screenshots.mjs --out .reports/mb.116-screenshots \
  --pages '[{ "path": "/sign-in", "name": "sign-in" }, { "path": "/", "name": "welcome" }]'
```

- **It drives the remote browser**, `chromium.connect(PLAYWRIGHT_WS_ENDPOINT)`,
  the same `playwright-server` the e2e runner uses, since no browser is
  installed in the devcontainer. That browser reaches this container as
  `devcontainer`, so `--base` defaults to `http://devcontainer:8000`, the dev
  server. A workshop page is reached the same way once a copy is served on
  every interface:
  `__VITE_ADDITIONAL_SERVER_ALLOWED_HOSTS=devcontainer npx ladle serve --host 0.0.0.0 --port 61001`.
- **`--pages`** is a JSON list of `{ path, name }`, inline or a file's path;
  each page is saved as `<name>-<width>-<theme>.png`.
- **The theme is `emulateMedia({ colorScheme })`**: a fresh context has no
  stored theme, so the app follows `prefers-color-scheme` as a first visit
  does. A workshop story does not: Ladle sets its configured default, dark,
  on the document unless the URL carries `theme=`, so the script adds
  `theme=light` or `theme=dark` to any path with a `story=` parameter. A
  story whose `meta.theme` is fixed keeps it either way.
- **`--storage-state <file>`** is a Playwright storage-state file carrying a
  signed-in session's cookies, for a page behind sign-in.
- **Both widths are touch screens** (MB.115): every browser context is
  opened with `hasTouch` and `isMobile`, so the page's `(hover: none)`
  query holds as it does on a phone. A desktop browser at phone width would
  otherwise show what no phone does, such as the impersonation banner tucked
  away until a pointer nears the top, where a touch screen keeps it in the
  page's flow. A review's phone sign-off is a touch sign-off.
- **Untested on purpose**: it is a tool the agents running a review use, not
  a requirement of the app.

## Commands and gates

- `npm run workshop` / `make workshop` — dev server on **61000**, with Vite HMR
  and React Fast Refresh. Only edits to the `.ladle/` files themselves need the
  dev server restarted.
- `npm run workshop:build` / `make workshop-build` — static build to the
  gitignored `.reports/workshop/`, via `scripts/build-workshop.ts`. See **The build gate**
  below for why the wrapper exists.
- **Every component and every email template has its story**, by review:
  MB.224 retired the guards that held a directory under `src/components/` and
  a top-level `src/emails/<name>.tsx` to a sibling story, and `config.mjs` to
  globbing them and opening dark, since a test of the workshop proves no
  behaviour a user depends on.
- ⚠️ **`workshop:build` is not a render smoke test.** It cannot catch a story
  that throws, at render time or module-eval time — Ladle code-splits stories
  into browser-only chunks that the static build never executes. The one thing
  it genuinely catches is an unresolvable import.
- **`tsconfig` does not reach `.ladle/` or `scripts/`.** Oxlint and the build
  are the only checks covering those files; `tsc --noEmit` will not flag them.
- **The gate runs in CI, and not in pre-commit.** `workshop:build` runs on
  `checks.yml`'s `build` leg. Pre-commit is lint,
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
  asset 404ing.
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
