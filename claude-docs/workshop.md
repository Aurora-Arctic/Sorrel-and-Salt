# Component workshop — summary

This summary is self-contained — M0's transcripts and decision records are
archived and are not required reading.

Where every standalone component renders in isolation, against the real tokens,
without a page routed to it.

- **Storybook** (`@storybook/nextjs-vite`, M12.53), moved from Ladle, which
  is gone. Why: the Claude Design sync reads a Storybook. What maps to what is in
  [`design-decisions/m12.53-storybook.md`](design-decisions/m12.53-storybook.md).
- **Component stories live at exactly `src/components/<Name>/index.stories.tsx`**,
  beside `index.tsx`, and mail stories at `src/emails/<name>.stories.tsx`. The
  `stories` globs in `.storybook/main.ts` also pick up `.storybook/*.stories.tsx`,
  for workshop-only pages the app never imports.
- Stories are CSF3 (Storybook's story file format): a default-exported `meta`
  with the title, and one named export per story. They carry no test ids, no
  snapshots and no assertions — behaviour is the test's job, and since MB.41 the
  test lives at `tests/components/<Name>/index.test.tsx`. The story stays in the
  component directory because Storybook discovers components by that file.
- **A story pins a theme only when the theme is what it shows** (such as the
  contrast of a chip colour). Every other story is drawn in whichever theme the
  toolbar holds, so there is no Dark/Light pair of the same story. A story that
  needs a theme sets `globals: { theme: 'light' }`.
- **A story pins a width only when the width is the state it shows**, and
  there are no `Phone` stories. Narrow any story with the toolbar's viewport
  menu (375, 382, 600 and 700px), or from a link:
  [`/?path=/story/shell-account-menu--states&args=state:Open&globals=theme:light;viewport:w375`](#opening-a-story-at-phone-width).
  The one pinned width is `SectionNav`'s `AdminOnAHiddenPage`, whose More-menu
  state exists only at tablet width (700px). A pin is
  `globals: { viewport: { value: 'w700', isRotated: false } }`.
- **A story that needs `prefers-reduced-motion`** sets
  `parameters: { reducedMotion: true }` (see ".storybook/" below).
- **A story that opens a modal needs nothing special.** Storybook already draws
  each story in an iframe of its own, so `Modal`'s top layer (`showModal()`)
  covers the story and not the sidebar. This replaces the `iframed`
  setting Ladle needed (M5.6).
- **A page component's story renders inside the page's real frame**
  (MB.116): the `main` its route draws, with the same classes, such as
  `<main className="page-frame">` for `NotAuthorized` or
  `page-frame page-frame--narrow` for a form page. A story that drew the
  component bare would show a column the app never draws, since the frame
  sets the width and the spacing. The workshop's own frame is a `<div>`
  that takes `role="main"` only when the story has no `<main>` inside it
  (`.storybook/preview.tsx`), so a page holds one main either way. The
  accessibility checks in `tests/e2e/workshop/` skip
  `page-has-heading-one` because a component story has no page heading.
- **A story's title is a group, then the piece, both in title case** (M10.33,
  reorganised under MB.119 and again under M12.53). Foundations is the one
  top-level exception: it has no group above it. Every other title has a group,
  and the sidebar lists the groups in this order (`storySort` in
  `.storybook/preview.tsx`):
  1. **Foundations** stands alone at the top: the tokens and primitives every
     piece is drawn from.
  2. **A piece the app draws in one area goes under that area's group**, in the
     order a person meets them: **Pages** (a whole page with no area of its own:
     Welcome, the invitation page; Not Authorized is a state of Error Page), **Sign In** (the panel, the
     sign-in methods and the provider mark), **Shell** (the bar and what sits
     in it: the account menu, the context row), **Account** (including
     `Account / Invitations Received`), **Coven** (including
     `Coven / Invitations Sent`), **Ingredients** (everything about the
     compendium and a coven's ingredients, in one flat group: cards, the list,
     the form, the entry, the facets, the search) and **Admin**
     (`Admin / Invitations`, `Admin / Nav`, `Admin / User List`) and
     **Emails**. `Coven / Member List`, `Admin / Group List`,
     `Account / Name Form`.
  3. **A piece the app draws in more than one area goes under its kind**:
     **Forms** (fields and the controls inside them, and the Icon Tip),
     **Feedback** (a notice, a skeleton and its fade, a spinner, and the loading
     and pending states: Main Body, Navigation Bar, Pending Link), **Layout**
     (frames, lists, tables, pagers and what every page carries, inside the
     shell or not: the theme switch and the impersonation banner, which the root
     layout draws on pages without the bar too), **Navigation** and
     **Surfaces** (what says or holds something on the page: a modal, an add
     icon, click feedback). `Forms / Field`, `Layout / Pager`.
  4. **Titles name the piece as the screens do**, so `Coven`, never
     `Workspace` (`Coven / Leave Coven Button`); the file and component names
     stay as they are.
  5. **A story is named for its state.** A piece with several states has one
     story, `States`: a grid of every state for a small piece, or, for a page,
     a list or a large piece, one story with a `state` dropdown in the Controls
     panel. A state is reached by address with `&args=state:Open`, spaces as
     `+`. A piece with nothing to merge keeps `Default` for its one story. A
     state stays a story of its own only when a test needs it isolated. The
     same state has the same name everywhere: `Empty` (nothing to list),
     `NoMatches` (a filter found nothing), `Loading` (data on its way),
     `Pending` (an action on its way), `FirstPage`, `MiddlePage` and
     `LastPage`, and `Failed`.

  "Draws" is read from the imports under `src/app` and `src/components`
  today, not from a plan: a piece moves to its kind in the PR that makes a
  second area draw it. Nothing sits loose at the top level. Within a group
  the sidebar lists a piece's `States` story first, then `Default`, and the rest by name.
  Storybook builds a story's id from its title and export name in kebab case
  (`Shell / Account Menu` and `States` give `shell-account-menu--states`), so a
  title change moves the id, and with it any link to the story.

- `*.stories.tsx` and `.storybook/**/*.ts(x)` are type-checked by `tsc` like any
  other source: `src/**` already reaches the component stories, and
  `tsconfig.json` names the dot-directory because a `**` glob skips it. Storybook
  compiles stories through Vite, which strips types, so `tsc` is what catches a
  fixture that has drifted from its prop or GraphQL type. A fixture is typed or
  `satisfies` its real type, never cast. Typed routes make `Route` a union of the
  static addresses, so a story's dynamic `href` goes through `route()` in
  `.storybook/route.ts`, the same helper the invitation page uses.

Foundations has one story and follows the toolbar's theme control. The eight
group colours were tuned hardest against light, so check that theme first
(`globals=theme:light`).

## Opening a story at phone width

The viewport is a Storybook global, like the theme, so a link can set both:

```
/?path=/story/<story-id>&globals=theme:light;viewport:w375
```

- `<story-id>` is the kebab-case title and export name above. A real one,
  checked against this config: `/?path=/story/shell-account-menu--states&args=state:Open&globals=theme:light;viewport:w375`
  opens the account menu with its links, light, in a 375px preview.
- Globals are separated by `;`, each as `name:value`. `theme` is `dark`, `light`
  or `auto`. `viewport` is `w375`, `w382`, `w600` or `w700` (`.storybook/preview.tsx`,
  `VIEWPORT_WIDTHS`). Add `;viewport.isRotated:true` to turn it sideways.
- **It works on the manager link (`/?path=…`) only.** The viewport resizes the
  preview frame the manager draws. A bare `/iframe.html?id=<story-id>&viewMode=story&globals=theme:light`
  takes the theme but fills the browser window, so a test that needs a width sets
  the browser's own viewport (`page.setViewportSize`) and opens that URL.
- A story's own `globals` are its starting setting, and a link's override them.

## `.storybook/`

- **`main.ts`** — the `stories` globs, the framework, and `viteFinal`:
  - `@` aliased to `src/`. Components import `@/modules/...` at runtime, as
    `tsconfig.json`'s `paths` say, and the framework does not read those paths
    for stories.
  - Sass pinned to `modern-compiler`, so `@use` resolves as under `next dev`:
    relative paths, empty load paths.
  - `server.allowedHosts: ['devcontainer']`, for the Playwright browser, which
    reaches the workshop under the compose service's name.
  - `staticDirs` serves `mockServiceWorker.js` (the fake API's worker file) from the root, and `define` sets `WORKSHOP_API_PREFIX` to `/workshop` (see **The fake API** below).
  - `next/link` and `next/navigation` need no alias: the framework supplies them.
    Its decorator wraps each story in the App Router's contexts (a router whose
    calls go nowhere), and `preview.tsx` sets the page it pretends to be on
    (`/admin/users`, `parameters.nextjs.navigation.pathname`).
  - No HMR settings: Vite's reload socket shares the HTTP port, so `--base` and a
    second published port are not needed.
- **`preview.tsx`** — the load-once entry and the **decorator**. Imports
  `theme.scss` and the three `*-base` sheets below. The decorator reads the
  toolbar's `theme` global and re-applies it through `applyTheme()` — the one
  shared implementation of the `data-theme` + `localStorage` write, also used by
  the app's `ThemeToggle`; `auto` clears the attribute so `prefers-color-scheme`
  decides. The default is `dark`, matching the app's dark-first default in
  `globals.scss` (`:root { @include theme-dark }`). It wraps the story in
  `<main className="workshop-story-frame" key={theme}>`, where the `key` forces a
  remount on theme change so a component that reads `data-theme` only on mount
  follows the switch, inside the app's `Providers` (`src/app/providers.tsx`) —
  so a component that uses TanStack Query (`EmailForm`'s `useMutation`) finds
  the one client the root layout mounts; a story never mounts a
  `QueryClientProvider` of its own, which would split the cache — and the click
  feedback's status region. It also holds the viewport presets and `storySort`.
  - **`storySort` must be self-contained**: Storybook reads it from the source
    text without running the file, so it can use no type annotation and no name
    from outside it. The parameters are typed by a `satisfies` on `parameters`,
    which Storybook strips, not by annotations, which it evaluates and chokes on.
  - **`core.allowedHosts`** in `.storybook/main.ts` is `['localhost', 'devcontainer']`. The container listens on every interface
    (`--host 0.0.0.0`) so the host can reach it, and Storybook 10 then stops at an
    interactive "host validation disabled" prompt unless it is told which hosts
    to accept. `localhost` is the owner's browser, `devcontainer` the e2e remote
    browser; any other Host header gets 403. Vite's `server.allowedHosts` stays.
  - **`reducedMotion` parameter (MB.1).** `prefers-reduced-motion: reduce` is a
    real OS/browser setting with no toolbar control to dispatch, so a story sets
    `parameters: { reducedMotion: true }` (ThemeToggle's `ReducedMotion` is the
    first) to get it simulated instead of merely documented: the decorator patches
    `window.matchMedia` so the reduced-motion query reports a match — the same
    check ThemeToggle's click handler makes to park a facet immediately when no
    `transitionend` is coming — and adds `workshop-story-frame--reduced-motion`
    to the frame, whose rule in `story-frame.scss` zeroes every transition inside
    it. Both halves are needed: the CSS alone doesn't touch the click-time check,
    and the `matchMedia` patch alone doesn't stop a real transition from running
    and firing its own `transitionend`. The patch is undone on cleanup so it can't
    leak into the next story.
- **`preview-head.html`** — injected into `<head>`; loads Cormorant Unicase +
  Lexend by name from Google Fonts so the workshop's type matches the app's (the
  app self-hosts them via `next/font`, which the workshop has no equivalent of).
- **`theme.scss`** — a trimmed copy of `globals.scss`: the three theme blocks
  and the `body` surface, minus its `@use './typography'`. Importing
  `globals.scss` whole drags `_typography.scss`'s document-wide element rules
  (`li::before { content: '◆' }`, …) onto Storybook's own sidebar and list
  controls. **The three theme blocks are a verbatim copy and must be kept in step
  with `globals.scss`; they must not grow layout rules of their own.**
- **`story-frame.scss`** — the app-surface frame: `$surface-page` /
  `$text-primary` so a story needs no per-story setup; `min-height: 100vh`, so the
  ground fills the window under a short story; `transform`, making the frame the
  containing block so a `position: fixed` child pins to the story rather than
  Storybook's chrome; `overflow: hidden` so it clips like a viewport; a 3rem
  gutter a side, and `space(4)` below 30rem, where 3rem would leave a 375px story
  279px. It also holds `.story-guide` and `.story-note`, a story's own "what to
  try" panel and the line saying what it stands in for, such as where a page would
  navigate, and the `workshop-story-frame--reduced-motion` rule the
  `reducedMotion` parameter toggles — a `!important` blanket over every transition
  in the frame, not just the ones the app's own `reduced-motion` mixin reaches,
  since the real media feature zeroes transitions app-wide too. The
  `.workshop-story-frame:has(.app-shell, .public-frame)` rule is for a state that draws the whole app shell or the signed-out frame: it drops the
  frame's padding, `transform`, clip and background (so the Backdrop, at `z-index: -1`, shows above the body colour as on the site), because a transformed ancestor would otherwise pin the
  phone's `position: fixed` bottom bar to the end of the page and not the screen. It applies per state, not per story, so a story whose dropdown holds both shell and non-shell states keeps the frame's padding for the latter; no parameter is involved. `:has()` is Baseline Widely Available, the floor in `package.json`.
  `ShellFrame` takes `signedOut` to draw `PublicFrame` (site name, nav, Sign In) in place of the shell, as the public layout does for a visitor with no session.
- **`typography.scss`, `layout.scss`, `primitives.scss`** — each `@include`s
  its `src/scss/` `*-base` mixin into `:where(.workshop-story-frame)`, so a story
  gets the identical prose, document structure and class layer a page does
  while Storybook's own `<ul>` / `<li>` / `<a>` chrome, outside the frame, stays
  untouched. **The `:where()` is load-bearing**: it gives the scope no
  specificity, as `body` has next to nothing in the app. Scoped by a bare class,
  `.workshop-story-frame p` (0,1,1) outranked every component's own `p` class
  (0,1,0), so the workshop drew `EmailForm`'s notice at body size with the
  paragraph margin, and `AdminNav`'s rows with the ◆ bullet the page never
  shows (MB.114).
- **`navigation.tsx`** — two wrappers for the two stories that need more than the
  framework's fixed answer, which put a different value in the same contexts
  Next's real hooks read. `WorkshopPathname` sets another address for
  `usePathname`, so AdminNav's stories show the current-page marker on People, and
  a tabbed page's story can open any tab (MB.115). `WorkshopNavigation` is told
  where `push` and `replace` were asked to go: a `RouteModal` closes by navigating,
  so without it a story's modal stays mounted as a native modal dialog, invisible
  once faded and holding the whole page inert (M10.33). The framework's
  `useSearchParams` answers an empty query, so the shell's Add Ingredient button,
  which opens its dialog on `?new` (M8.16), draws closed in a story.
- **`reopenable.tsx`** — `Reopenable`, what stands in for a modal's owner in a
  story. The app's owners close a modal by unmounting it, and a story has no
  owner. It renders its children while open, hands them a `close`, answers a
  `RouteModal`'s navigation through `WorkshopNavigation` by closing too, and
  leaves an Open Again button in place of the modal, so a review can look
  again without a reload (M10.33). A story that draws a `Modal` whose
  `onClose` would do nothing wraps it in this.
- **`mock-api.ts`** — the workshop's fake API (see **The fake API** below). It replaces `hanging-fetch.ts`, the `/api/auth` plugin and the `fetch` stand-ins that `IngredientForm`, `StockDialog` and `IngredientSearch` kept.
- **`admin-frame.tsx`** — the shared story wrapper for the admin area.
  `AdminFrame` is the admin layout as it is: the context row holding
  "Admin" and `AdminNav`, then the `.page-column` column around the story,
  all inside the shell's `.app-shell__main`, which keeps the last row clear
  of the phone's bottom nav. Its optional `open` is the address the workshop
  pretends to be on, which decides the nav's current page.
  Its `shell` flag draws the whole thing inside `ShellFrame` (the app bar above the admin row,
  the phone's bottom bar pinned), as the site shows it; the frame goes bare by itself.
  `AdminTabbedFrame` is a tabbed admin page inside it, as its route draws
  it: heading and tabs from `ADMIN_PAGES`, and an `action`. It is the layout's
  markup only; the app's own layout reads the session.
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
- **The four workshop-only stories** — `foundations.stories.tsx`,
  `main-body.stories.tsx` (the loading and body-swap pieces),
  `navigation-bar.stories.tsx` and `pending-link.stories.tsx`.
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
  `foundations.scss` from the partial's own map rather than typed. The data table,
  the filter row and the page header are each drawn twice: at the page's
  width, and inside a 375px box (`.fd-phone`), so their container queries,
  which measure the element's own frame rather than the window, show the
  phone layout at any window size; the boxed table is the stacking one, and
  the page header's box also carries `.page-column`, so its action spans the
  line as on an admin page. It lives in
  `.storybook/` because the app never imports it; `foundations.scss` holds only
  reference-page chrome, nested under `.fd`.

## Mail templates (MB.66)

- **`src/emails/*.stories.tsx`** is the second story glob in `main.ts`: one
  story file beside each mail template, titled `Emails / …`. The shared frame
  in `src/emails/parts/` has none; every template previews it.
- **`EmailPreview.tsx`** renders a template's `Message` and shows the HTML part
  in an iframe, so the workshop's styles and document never reach the mail,
  with the plain-text part in a `<details>` beneath. Images and fonts load
  from the workshop's own origin: Vite serves `public/` in `storybook dev` and
  Storybook copies it into the build, and on staging `/email/*` is the app's own
  public prefix.
- **The toolbar's theme reaches the mail by rewriting it.** A framed
  document's `prefers-color-scheme` follows the browser, not the frame's
  `color-scheme` — checked in the Playwright Chromium, where a light page left
  the mail dark. So the preview reads the page's computed `color-scheme` and
  turns the mail's one `LIGHT_MEDIA` block into `@media all` or `@media not
all`: the same rules a client in that scheme applies, nothing re-styled. A
  story's own theme `globals` win, as for components.

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
  server.
- **`--pages`** is a JSON list of `{ path, name }`, inline or a file's path;
  each page is saved as `<name>-<width>-<theme>.png`.
- **The theme is `emulateMedia({ colorScheme })`**: a fresh context has no
  stored theme, so the app follows `prefers-color-scheme` as a first visit
  does. A workshop story does not: it opens dark unless the URL carries a
  theme, so the script adds `globals=theme:light` or `globals=theme:dark` to any
  `/iframe.html?id=...` path that has no `globals`.
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

## The fake API

A story whose component asks the server gets an answer from Mock Service Worker (MSW), a library that answers a request in the browser. `.storybook/mock-api.ts` holds the helpers; `preview.tsx` starts the worker with `mswLoader(startMockWorker)`, which also resets the handlers before each story.

- **A story states its answers in `beforeEach: ({ msw }) => msw.use(...)`.** The helpers are `answerQuery` and `answerMutation` (typed by the generated document, matched by operation name), `answerOperations` (one function for a story with many lookups), `hangOperation` and `hangAllOperations` (a request that never answers, for a loading state), `hangAuth` and `refuseAuth` (the same for `/api/auth`), and `refusal({ message, code, fieldErrors })` (a refusal as the server sends it: HTTP 200, no data, one error with its code). Anything unanswered gets a 501.
- **`beforeEach` runs once per load.** A story that picks its answer from an arg or a `state` control calls `useMockHandlers(handlers)` in its render instead; it swaps the handlers whenever they change.
- **The prefix.** Staging serves the workshop under `/workshop/` with a CSP of `connect-src <host>/workshop/`, so a request to `/api/graphql` would be refused. `apiPath()` in `src/lib/graphql-client.ts` and `src/lib/auth-client.ts` puts `WORKSHOP_API_PREFIX` in front of the path; it is empty in the app and `/workshop` in the workshop. The worker file is served at `/workshop/mockServiceWorker.js`.
- **A refused auth request is a failed request.** A GraphQL refusal logs nothing in the browser; an `/api/auth` refusal is a non-OK response and logs "Failed to load resource". A story that does this carries the tag `expects-failed-request`, which the every-story check reads from `index.json`.
- **A request that navigates away is not mocked.** A success that ends in `window.location.assign` (Stop Impersonating) would leave the story, so its story shows the waiting and the refusal only.

### Handlers a story passes

- **Every handler a story passes is `fn()`** (from `storybook/test`), as an arg, so the Actions panel records the call. A bare `() => {}` records nothing and leaves a button that looks dead.
- **Where a click should change what is shown, `useArgs`** (from `storybook/preview-api`) updates an arg the story draws (see `Field` `ActionsInUse`, `IngredientCard` `States`, `Notice` `States`).
- **Where a control cannot work in the workshop, the story says why** in its comment. `TabbedPage` cards loading is one: a tab can only wait with the default table skeleton, because `PageTab` carries no skeleton shape and no tab in the app uses a cards skeleton.

## The every-story check

`npm run workshop:check` loads every story in `index.json` in both themes in a real browser and fails on a page error, a console error, a failed or 4xx/5xx request, Storybook's own error display and an axe violation (the page-level rules a lone story cannot satisfy are off: heading one, region and the landmark rules).

- **It is manual.** It is not in CI, pre-commit or any other test script: its file is `tests/e2e/workshop/every-story.check.ts` (the `.check.ts` name matches no default `testMatch`), and it has its own config, `playwright.workshop-check.config.ts`. `playwright.config.ts` also ignores every `/workshop/` path, and no workflow calls it.
- **Run it against a running workshop at `localhost`**, since a service worker needs a secure origin: `npm run workshop` in one shell, then the check with `WORKSHOP_CHECK_URL` (default `http://localhost:61104`; set it to the port the workshop runs on). The remote browser reaches the container's `localhost` through `PLAYWRIGHT_WS_ENDPOINT` with `exposeNetwork`.
- **Narrowing:** `WORKSHOP_CHECK_ONLY` (a story id substring), `WORKSHOP_CHECK_THEMES` (`light`, `dark` or both) and `WORKSHOP_CHECK_WORKERS` (default 4).
- **A story tagged `expects-failed-request`** is exempt from the failed-request and console-error checks only, never from page errors or axe.
- **A story tagged `shows-low-contrast`** is exempt from the `color-contrast` axe rule only. Use it for a story whose point is a colour pair that fails, such as a colour field showing its too-low ratio; every other rule still runs.

## Commands and gates

- `npm run workshop` / `make workshop` — dev server on **61000**, with Vite HMR
  and React Fast Refresh, bound to every interface and asking for no sign-in.
  Only edits to the `.storybook/` config files themselves (`main.ts`,
  `preview.tsx`) need the dev server restarted.
- `npm run workshop:build` / `make workshop-build` — static build to the
  gitignored `.reports/workshop/`, or to the directory `--outDir <dir>` names
  (`deploy.yml` passes `public/workshop`), via `scripts/build-workshop.ts`. It
  exits non-zero when the build fails. See **The build gate** below.
- **Every component and every email template has its story**, by review:
  MB.224 retired the guards that held a directory under `src/components/` and
  a top-level `src/emails/<name>.tsx` to a sibling story, since a test of the
  workshop proves no behaviour a user depends on.
- ⚠️ **`workshop:build` is not a render smoke test.** It cannot catch a story
  that throws at render time: the static build bundles stories without
  running them. What it catches is an unresolvable import or a syntax error.
- **`tsconfig` does not reach `scripts/`.** Oxlint is the only check covering
  those files; `tsc --noEmit` will not flag them. Stories and `.storybook/` are
  type-checked.
- **The gate runs in CI, and not in pre-commit.** `workshop:build` runs on
  `checks.yml`'s `build` leg. Pre-commit is lint,
  `format:check` and typecheck on the files a commit changes, test-free by decision (MB.38): a hook that
  runs tests is a hook people start skipping, and a PR cannot skip CI.

### Rebuilding the workshop container (after M12.53)

`make docker-workshop` runs the `workshop` compose service, on 61000 with hot
reload. The service keeps its own `node_modules` volume, filled from the image only the
first time it is mounted, so it still holds the packages from before Storybook.
`Docker/ensure-deps.sh`, the service's entrypoint, sees that `package-lock.json`
no longer matches the hash saved in the volume and runs `npm ci` on start, so
recreating the container is enough. From the host, in the repository:

```sh
docker compose -f Docker/docker-compose.yaml --profile workshop rm -sf workshop
docker compose -f Docker/docker-compose.yaml --profile workshop build workshop
make docker-workshop
```

The first start takes as long as an `npm ci`. `make docker-rebuild` also works but
deletes the database volume (`down -v`), so do not use it for this. The `app`
service keeps its own volume and reinstalls the same way on its next start. Then open `http://localhost:61000`. If edits on the host do not reach
the page, set `CHOKIDAR_USEPOLLING=1` on the service (`Docker/docker-compose.yaml`).
Nothing in the container setup has been run by the author of this change, which had
no Docker: the compose edits are reasoned from Storybook's and Vite's behaviour.

## On staging (M2.10)

Staging serves the workshop at `https://staging.sorrelandsalt.com/workshop`,
to admins only. The local `npm run workshop` (see "Commands and gates") is
unchanged and asks for no sign-in — local development is the one relaxed
environment. Production and hotfix previews never carry the workshop.

- **How it ships.** On a staging deploy alone (the step's `if:` reads
  `git_branch == 'staging'`), `deploy.yml` runs `npm run workshop:build --
--outDir public/workshop` before `vercel build`. The build wrapper passes its
  arguments on to `storybook build`. Next then serves the files from
  `public/` as it serves any static file; `public/workshop` is gitignored.
  Storybook's static build links its own files relative to the page
  (`./iframe.html`, `./sb-manager/…`), so it needs no base path; what it
  needs instead is that every page is served from a URL under `/workshop/`,
  which the redirect below sees to.
- **How it is gated: in `src/proxy.ts`, and nowhere else can do it.** Next
  runs the proxy before it serves `public/`, and a static file has no page to
  call `requireSession()`, so the proxy's usual cookie-only check would admit
  any signed-in account — and signing in with any provider earns one. For
  `/workshop` and everything beneath it (`/workshopping` is not beneath it),
  and only there, the proxy asks Better Auth for the live session through
  `sessionFromHeaders()` and hands it to `assertWorkshopAccess()`
  (`src/modules/identity/services/workshop-access.ts` — the rule is a service's, per rule 1).

  | Request                                  | Answer                                                                 |
  | ---------------------------------------- | ---------------------------------------------------------------------- |
  | No session cookie                        | 307 to `/sign-in?next=<path>`, as any protected route                  |
  | A cookie Better Auth rejects             | The same redirect                                                      |
  | A live session, role `user` or `curator` | 403, plain text                                                        |
  | A live session, role `admin`             | The file, with the workshop's Content Security Policy (below)          |
  | The same admin, at bare `/workshop`      | 307 to `/workshop/index.html`, query kept, with the same policy header |

  The 403 is plain rather than the styled page `/admin` shows: it answers
  requests for scripts and JSON as well as for the page. The lookup module is
  imported inside the workshop branch only, so no other request loads the
  database client in the proxy.

- **Bare `/workshop` redirects to `/workshop/index.html`, query kept.**
  `index.html` is Storybook's manager, the page with the sidebar, and it
  loads each story from `./iframe.html` in a frame. A relative link resolves
  against the page's directory, so a manager served at `/workshop` itself
  would ask for `/iframe.html` and get nothing. A rewrite would keep that URL
  in the browser, so it does not work. `/workshop/` does not work either:
  Next's trailing-slash redirect, which runs before the proxy, sends
  `/workshop/` back to `/workshop`.
- **No application data is reachable through it.** The build is static: no
  story reaches GraphQL, and `index.json` is the story index. A story whose
  component asks `/api/graphql` answers it in the page: `IngredientForm`'s
  stands in for `window.fetch` while mounted and answers its lookups from
  invented rows ([`components/ingredient-form.md`](components/ingredient-form.md), "Stories"),
  so the request never leaves the page and the policy below has nothing to
  refuse. The workshop's own scripts nonetheless run on the app's origin
  carrying an admin's cookie, so every workshop response the gate lets
  through carries a Content Security Policy (a header telling the browser
  what the page may load) of `connect-src <host>/workshop/`, for example
  `connect-src staging.sorrelandsalt.com/workshop/`. It covers
  `fetch`, XHR (`XMLHttpRequest`) and WebSockets:
  - The host is the one in the browser's address bar: `x-forwarded-host`,
    then `Host`, accepted only when it is a plain host and port. It is not
    the address the server was reached on (`request.nextUrl`), which behind a
    proxy or a container is something like `0.0.0.0:8000`; a policy naming
    that refuses every one of Storybook's own fetches, and the workshop shows
    "Failed to fetch". With no scheme written, the source takes the page's
    own, so `https` behind a proxy that ends TLS (Transport Layer Security,
    the encryption in `https`) still matches.
  - Storybook's manager and preview fetch their own files, `index.json` and
    `project.json` among them, so `'none'` would break it.
  - A source whose path ends in `/` matches every path beneath it and no
    other, so `/api/graphql`, `/api/auth/*` and every page outside
    `/workshop/` are refused by the browser. `'self'` cannot take a path,
    which is why the host is written out.
  - Nothing else is restricted. The manager frames its own `iframe.html`, and
    no header in the proxy, `next.config.ts` or `vercel.json` forbids framing.
  - One limit, from the CSP specification itself: after a redirect the path
    is no longer checked, only the origin. Nothing under `/workshop/`
    redirects off it for an admin; the only redirect is to `/sign-in` once a
    session has died, which returns the sign-in page and no data.

  `tests/proxy.test.ts` checks the header against the specification's
  path-matching rule.

- **Admin only for now.** A role that can open the workshop without admin's
  other powers is v2 (DESIGN.md §13, "A workshop-viewer role"); when it
  lands, `assertWorkshopAccess()` is the one line that changes.

## The build gate

`scripts/build-workshop.ts` runs `storybook build` and relays its exit code. It
exists so `npm run workshop:build` has one place to change: it renames
`--outDir` to Storybook's `--output-dir`, builds to `.reports/workshop` when no
directory is given, and turns telemetry off. Storybook's CLI exits non-zero on a failed build, so the wrapper adds nothing
to it. Storybook's static build links its own files relative to the page, so it
needs no `--base` to be served under `/workshop/`.

## The library build

`npm run build:components` turns `src/components/` into a library in `dist/`, which is
gitignored. It writes one JavaScript module per component folder (named after the
folder, such as `dist/Modal.mjs`), a `tokens.mjs` entry, shared chunks, and one
stylesheet, `dist/sorrel-and-salt.css`. That stylesheet holds the global theme
tokens from `src/app/globals.scss` and every component's own Sass module. The
Claude Design sync reads this build together with the Storybook workshop.

It runs Vite's library mode through `vite.components.config.ts`, not a `tsc` emit,
because the components import their Sass from TypeScript and only a bundler
compiles that. Vite is already a dependency (Storybook uses it), so nothing was
added. React, `react-dom`, `next/*`, `react-hook-form`, `downshift` and `zod` stay
external: the consumer supplies them. Everything else, including the `@/` paths,
is bundled in. The stylesheet needs `scripts/library-tokens.ts` as its entry,
because Vite will not take a stylesheet as an entry on its own.

## Stopgaps to unwind

The workshop's font plumbing substitutes, Vite-side, for what `next/font` +
`src/app/layout.tsx` do at runtime — the app never defines `--font-body` /
`--font-display` in a stylesheet, so there is nothing to import.

- **`--font-body` / `--font-display` are redefined in `.storybook/typography.scss`'s
  `:root` block.** When the app exposes these in a shared partial, delete the
  `.storybook/` copy and `@use` that instead. The family names (`'Lexend'`,
  `'Cormorant Unicase'`) are currently written in three places that must agree:
  the `$font-*` stacks in `src/scss/_variables.scss`, the Google Fonts URL in
  `.storybook/preview-head.html`, and this `:root` override.
- **`.storybook/preview-head.html` pulls the faces from `fonts.googleapis.com`** — the
  one place in the project that does, against the app's self-hosting rule. Switch to
  self-hosted `@fontsource` so `workshop:build` needs no network access.
- **That `:root` override sits in `.storybook/typography.scss`** (prose rules).
  Move it to its own `.storybook/fonts.scss`, alongside the `preview-head.html` concern.

## The `state` dropdown story

A story with a `state` control (rule 5 above) draws a whole page or list, too big to sit beside the others. Its `state` arg is the node it draws: the `argTypes` mapping turns the chosen name into that node, so the story's type is `StoryObj<{ state?: ReactNode }>`. Story files do not repeat either fact.

## Notes the `.storybook/` files cite

- **The fake API answers under `/workshop/api/`.** The app's clients ask for `/workshop/api/...`, not `/api/...` (`WORKSHOP_API_PREFIX`, set in `main.ts`; `src/lib/api-path.ts`), because staging's Content Security Policy lets a workshop page reach only addresses under `/workshop/` and refuses the real ones before a service worker can answer. A story says what its requests get with `beforeEach: ({ msw }) => msw.use(answerMutation(SaveIngredientDocument, () => ({ ... })))`. The handlers in `mock-api.ts` are the defaults every story starts from, and the addon puts the worker back to them after each story.
- **`useMockHandlers` and `beforeEach` are not mixed in one story.** `useMockHandlers` follows an arg or a `state` control, which `beforeEach` (it runs once, when the story loads) cannot. Removing its handlers puts the worker back to its defaults and re-adds only its own, so a story using both loses the `beforeEach` ones. Pass it a list that keeps its identity (a module constant or `useMemo`).
- **The worker file is found beside the page** (`./mockServiceWorker.js`), so it works under `/workshop/` on staging as well as at the root of the dev server; the addon's own default is the root alone. Requests nothing handles go to the network.
- **A navigation that never arrives** (`navigating.tsx`). The workshop's router goes nowhere, so a press would end its wait at once. `Navigating` suspends the router call inside the same transition, under an already-shown boundary. That keeps the transition pending, as the App Router does until a page renders, so the page bar's state, the link's `aria-busy` and the body's skeleton stay on screen. `tests/support/navigating.tsx` does the same with a mocked router. "Start Over" remounts the whole thing and is the only way the wait ends.
- **The page bar needs a transformed box.** It is `position: fixed` against the window, but the shell frame pads the shell in from the window's edge. A transformed box (`translateZ(0)`) becomes the bar's containing block, so the bar lands on the global bar's bottom edge as in the app. The box also becomes the skip link's containing block, whose hiding (lifted above the page's top edge) would leave it in view; the clip hides it again, and it still shows on focus.
- **Reduced motion on the page bar.** The sweep becomes a slow `loading-pulse`. The story pin (`meta.reducedMotion`) does not reach a CSS media query, so to see it, turn on the OS "reduce motion" setting or emulate `prefers-reduced-motion: reduce` in devtools (Rendering tab).
