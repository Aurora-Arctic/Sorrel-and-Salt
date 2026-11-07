# Loading

The standard for every wait on the site: what a person sees between pressing something and the answer arriving, why it looks that way, and how a developer adds a new wait that follows it. The decision record, with the sources and their quotations, is [`ui.md`, "One Loading Standard for the Site"](design-decisions/ui.md#one-loading-standard-for-the-site). How a skeleton is chosen, by the address being navigated to, and why each skeleton sits beside its page, is [`design-decisions/m11.9-skeletons-beside-pages.md`](design-decisions/m11.9-skeletons-beside-pages.md); the browser measurements behind it are [`loading-audit.md`](loading-audit.md).

## The three parts

Every wait has the same three parts. Each does one job, and none repeats another's.

| Part        | What it looks like                                                                                                                                                                | Says to a screen reader                                                         | When                                                  |
| ----------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------- | ----------------------------------------------------- |
| **Control** | The pressed thing answers at once: the switcher shows the picked coven's name, a tab's pill moves, a button keeps its label and gains a spinner, a link shows the `LinkHint` dot. | `aria-busy` on the control, and a button's busy label ("Saving Name").          | At once. Spinners and the dot appear after **100ms**. |
| **Region**  | The skeleton of what is coming (cards, table, form or page blocks) replaces the area that changes. The new content fades in over it.                                              | The skeleton's one `<output>` status, "Loading". This is the only announcement. | At once. Skeletons are not delayed.                   |
| **Page**    | A thin indeterminate bar along the bottom edge of the global bar, on **every** navigation: coven switch, site and section links, tabs, filters, pager, route modals, refreshes.   | Nothing. It is `aria-hidden` and only adds a visual cue.                        | After **100ms**.                                      |

"Indeterminate" means the bar does not claim a percentage: it sweeps, because the site cannot know how long a server render will take.

### Control

The control is the thing the person pressed, and it answers before anything else does. A press that changes nothing visible feels like a press that did not register.

- A **button** is a [`BusyButton`](components/busy-button.md): it keeps its place, gains a [`Spinner`](components/busy-button.md), swaps its label for a busy one, and carries `aria-busy="true"`.
- A **link** in the page shows the [`LinkHint`](components/link-hint.md) dot after its text. A link that wears the chain icon shows no dot: its icon turns into the `Spinner` ring in the same space (`LinkIconHint`). A link that is a tab moves its pill at once ([`TabbedPage`](components/tabbed-page.md)). The site's menu links (the global bar's links, the admin pages' lead link and the account menu's items) show no dot, because the page bar and the skeleton answer for them. Each still carries `aria-busy` while its navigation is pending.
- The **coven switcher** shows the picked coven's name with a spinner ([`WorkspaceSwitcher`](components/workspace-switcher.md)).
- A **field** that is searching shows a spinner inside the input. In a [`Combobox`](components/combobox.md) it sits in the indicator strip at the right of the control, beside the clear button and the chevron, and the input carries `aria-busy`.

The spinner and the dot wait **100ms** before they show, so an answer that arrives at once never flashes them. The wait is a CSS animation delay (`loading-appear`), not a timer.

### Region

The region is the part of the page that is about to change. While it changes, the old content is hidden and put out of reach (`visibility: hidden`, `inert`, `aria-hidden`) and the [`Skeleton`](components/skeleton.md) of the new content stands over it. For the shell's two bodies, `MainBody` and `SectionBody`, the old page stays mounted at its full height beneath the skeleton rather than being swapped out, so the page does not shrink before the browser saves the scroll position that Back returns to ([`skeleton.md`](components/skeleton.md), "Skeleton fade").

The skeleton of a page is a `skeleton.tsx` beside the page, built from the page's own components (`PageHeader`, `TabbedPage`, `PageNav`, `ListFrame`, `StackTable`, the card frames) with placeholder content in them, so it has the page's own boxes and cannot drift from them. The `Skeleton` component itself has two shapes only: `line` (a line of text still being fetched) and `block` (a control-sized box). Everything bigger is made of the page's own parts (["Adding a page: its skeleton"](#adding-a-page-its-skeleton)).

When the real content arrives, the skeleton does not vanish: the shell's bodies keep the last one over the arrived page, `aria-hidden` and out of layout, and it fades out over 200ms (`$arrive-duration`) while the page shows through ([`skeleton.md`](components/skeleton.md), "Skeleton fade"). A navigation that drew no skeleton (a refresh) fades nothing, a new wait mid-fade takes the skeleton back at once, and under reduced motion the page shows at once.

A skeleton shows **at once**, with no wait, because the press has already hidden the old content: holding the skeleton back would leave an empty panel for 100ms, which is the jump the skeleton is there to avoid. The Skeleton itself fades in over 150ms.

It holds exactly one `<output>`, visually hidden and reading "Loading". A screen reader hears that one status however many placeholder shapes are drawn, and the shapes are `aria-hidden`.

### Page

The [navigation bar](navigation.md) is the page's own signal. It is 3px tall, sits under the global bar, and shows only if a navigation is still going after 100ms. It is `aria-hidden`: the control and the region have already told a screen reader, and a third announcement would repeat them. The bar exists for the navigations that have no better place to show a wait, such as a click on a brand link, and so that every navigation, including a slow `router.refresh()`, gives some sign.

## Reduced motion

Under `prefers-reduced-motion: reduce` the spinner, the shimmer, the bar and the `LinkHint` dot all become **one slow opacity pulse** (`loading-pulse`, `$pulse-duration`, 2s), never a still mark. A wait that stops moving looks finished, so it never goes still. A change of opacity is not the sort of movement that setting is meant to spare people from. This is the design's inference: no source read says that a pulse, rather than a still mark, is the right replacement.

The `loading-motion` mixin does this swap in one place, so no component invents its own fallback.

## The coven switch

Switching covens is the longest wait on the site, because the new coven's layout and page both read from the database.

1. Choosing a coven in the switcher shows the picked name and a spinner at once, with `aria-busy` on the box (`ComboboxSelect`'s `busy` prop).
2. [`SectionBody`](components/section-body.md) takes the old coven's page away at once, with no dimming, so nobody acts on the wrong coven's data. It does this when the site is busy and the destination is a page of any coven.
3. The **destination section's** skeleton takes its place, inside a `<main>` of its own, because the pages draw their own `<main>` and the landmark would otherwise vanish during the wait. That `<main>` holds one visually hidden "Loading" `<output>` and no heading of its own: each skeleton draws its page's own `PageHeader` `h1`, so a wait has exactly one level-one heading (axe's page-has-heading-one rule), and `MainBody` does the same. `tests/guards/skeleton-heading.test.tsx` renders every registered skeleton and fails one without that `h1`.
   The switcher's link goes to the coven's home, or to the same section in the new coven; the registry (["How a skeleton is chosen"](#how-a-skeleton-is-chosen)) gives the skeleton for that address. Choosing Create Coven goes to `/coven/new`, a `main` page, so `MainBody` draws its skeleton.
4. When the new coven renders, the content fades in, and focus returns to the switcher. The `[slug]` layout remounts on a switch, so focus would otherwise drop to `<body>`. The switcher sets a module-level flag when a switch to another coven starts, and the next switcher to mount reads it once and focuses its box. A module variable survives the remount, as component state cannot, and dies with the page, so a reload never refocuses. A switch that ends without a remount (a refusal) clears the flag. Returning focus to the switcher is a judgement, not a sourced rule.

## Why there is no `loading.tsx` and no route-level Suspense

Next's `loading.js` wraps the page in a `<Suspense>` boundary and shows its fallback from the server straight away. The site does not use it, and adds no `<Suspense>` around a route, for two reasons.

1. **The guards' status codes would be lost.** A streaming page response begins with a `200` status, fixed once the body starts to stream, which happens when a Suspense fallback renders. A `notFound()`, `forbidden()` or `unauthorized()` called after that point can no longer change it (Next.js, `loading.js`, "Status codes"). The site depends on its guards answering with the right code: a non-member at `/coven/[slug]` gets a 404, `/admin` shows its not-authorized page with a 403, and a retired ingredient slug answers a 308. A route `loading.tsx` would turn each into a `200`.
2. **Rendering without JavaScript would break.** A direct request, such as a typed address, a bookmark or a crawler, gets the whole page from the server in the first response, with no loading state streamed ahead of it ([`components/tabbed-page.md`](components/tabbed-page.md), "Contracts").

The same two reasons are why the skeleton is drawn by the client from the registry rather than streamed. So every pending state on the site is a **client transition**. A router call made inside a React transition stays pending until the new page has rendered (React, `useTransition`: `isPending` "stays `true` until all Actions complete and the final state is shown to the user").

**The history entry is pushed at the press, not at the arrival.** Next writes its own entry only when the new page commits, so a Back pressed during the wait would pass the page being left. `NavigationProvider.navigate` therefore calls `window.history.pushState` for a push to another path, passing the current entry's `__NA` router state so Next's `pushState` patch leaves its router alone, then calls `router.replace` instead of `router.push`. The arrival overwrites the early entry with the page's final address, so a redirect on the way leaves one entry, not two. The early entry carries the page being left's router tree, so a Forward onto an entry whose page never arrived is intercepted (`holdEarlyEntries`, marked `earlyEntry` in the entry's state) and fetched afresh with `router.replace`; an arrival overwrites the state, marker included. A query-only change, a `replace`, an address on another site and an entry the router did not write (no `__NA`) keep the plain router call. Back during the wait returns to the page that was left, with the router's own traversal; the status codes and the no-JavaScript path are untouched, since the server response is.

The wait itself is held by `useOptimistic`. A value set with it inside a transition lasts as long as that transition and goes back by itself when the transition ends, whether the page arrived, another navigation took over, or the request failed. `NavigationProvider` (`src/lib/navigation/provider.tsx`) is mounted once in `src/app/providers.tsx` and never unmounts. It holds that value and the router, and every navigation and refresh the site starts is a transition it opens. Nothing is ever settled by hand. The transition must live above every region: a transition kept in the pressed component ends when `MainBody` or `SectionBody` unmounts that component, which would end the wait at once and bring the old page back.

`useLinkStatus` from Next reports only the link it sits inside, and says nothing to the rest of the page; that is why the provider's shared state exists. Next recommends it for a subtle inline hint with a 100ms animation delay, and the site's `LinkHint` is that hint.

## How a skeleton is chosen

The **destination address** chooses the skeleton, not the link that was pressed. `src/app/skeletons.ts` is the registry: it maps each route pattern (the folder names under `src/app`, with route groups and `@` slots ignored) to `{ host, Skeleton }`. A link carries only its `href`. `NavigationProvider` stores that `href` as the active navigation, and `useNavigationState()` returns `{ busy, href }`. `skeletonFor(body, href, pathname)` (`src/lib/navigation/skeleton-for.ts`) matches the address against the patterns (`route-match.ts`, which handles `[slug]`, `[id]`, `[number]`, `[token]` and `[key]`, drops the query string, and is the site's own because Next has no client-side matcher) and says which body draws it.

There are three hosts:

| Host    | Body drawn in                                           | Draws when                                                                                      |
| ------- | ------------------------------------------------------- | ----------------------------------------------------------------------------------------------- |
| `main`  | `MainBody` (`.app-shell__main`, shell and public frame) | The registry entry names `main`, or names a section host that is not standing for the address.  |
| `coven` | `SectionBody` in the coven layout                       | The entry names `coven` and both the current page and the destination are in a coven (any two). |
| `admin` | `SectionBody` in the `/curator` or `/keepers` layout    | The entry names `admin` and the destination is in the same area as the current page.            |

The coven host stands for a switch between two covens, so the header and switcher stay up and busy through the wait. A section host that does not stand (a link from the Compendium into a coven page, or from `/curator` into `/keepers`) falls back to `MainBody`, which draws the whole frame.

**Nothing draws** when the destination's path is the one already showing (a pager, filter or tab change keeps its own skeleton in `ListFrame` or the tab panel), when the navigation is a refresh, which has no `href`, or when the address matches no registered pattern. In those cases the page stays up under the bar alone.

## How to adopt it

Navigation goes through one set of pieces in `src/lib/navigation/`, all exported from its `index.ts`.

| Piece                    | What it is, and when to use it                                                                                                                                                                                                                                                                                                                       |
| ------------------------ | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `PendingLink`            | The link the site draws, in place of a bare `next/link` where the press navigates. A plain press navigates through the shared hook; a press meant for a new tab or window, or a link with its own `target`, is left to the browser. It sets `aria-busy` on the anchor while its navigation is pending, and tells a `LinkHint` inside it (see below). |
| `usePendingNavigation()` | Returns `{ pending, navigate(href, options), refresh() }`. Use it for any navigation that is not a link: a button that pushes, a redirect after a save, a refresh. `pending` is true while this caller's navigation is the one showing; the site-wide state carries it for the rest.                                                                 |
| `reportLeaving()`        | For a wait that ends with the browser leaving the page, such as redirecting to a sign-in provider: it keeps the page bar up until the browser unloads. A restored page (`pageshow` with `persisted`) clears it.                                                                                                                                      |
| `NavigationBar`          | The bar. Mounted once in `src/app/providers.tsx`; a developer does not render it again.                                                                                                                                                                                                                                                              |
| `Skeleton`               | A line or a block for a part that loads in place. `shape` is `line` or `block`; see [`skeleton.md`](components/skeleton.md).                                                                                                                                                                                                                         |
| `Spinner`                | The control's ring, inside a button or field; see [`busy-button.md`](components/busy-button.md).                                                                                                                                                                                                                                                     |
| `loading-motion`         | The Sass mixin for any new piece that moves to say something is loading; it brings the reduced-motion pulse and the optional 100ms wait with it.                                                                                                                                                                                                     |

`navigate(href, options)` takes `{ replace, scroll }`:

- `replace` replaces the history entry rather than adding one.
- `scroll: false` keeps the scroll position, as a filter or pager does. The router sees options **only when a caller gives some**, so a plain call is a plain `push(href)`.

There is no option naming a skeleton: the address already says which page is coming, so a link cannot name the wrong one.

A navigation waits first on any mounted page form with unsaved changes (`useLeaveGuard`): that form asks Discard Changes or Keep Editing, and the navigation starts only on Discard Changes. A refresh is never held ([`components/modal.md`](components/modal.md), "Unsaved changes").

`NavigationProvider` holds the site-wide wait (who started it and the destination `href`) in React context, so the bar and the regions can follow a navigation that a button elsewhere in the tree started. `useNavigationState()` joins it with the one thing React cannot see, the `leaving` flag of a small external store, set by `reportLeaving()` and cleared only by a restored page. Outside the provider (a Storybook story, a component test) `usePendingNavigation` makes a plain router call in a transition and shows no wait.

**When navigations overlap.** The later navigation's wait shows, and its caller alone is `pending`; the earlier caller's `pending` goes false at once. React drops the wait only when the last overlapping transition has ended, so the first page to arrive does not clear a wait that a second navigation is still owed. Component tests read this state from committed renders (an effect), because React re-runs a suspended transition's render with the value already put back.

### Adding a page: its skeleton

1. Add `skeleton.tsx` beside the `page.tsx`. Where a layout stays up during the wait (a `TabbedPage` layout, the coven layout, the curator and keepers layouts), it sits beside that layout instead.
2. Build it from the page's own components, with placeholder content in them:
   - `PageHeader` with the real title, or `pendingTitle` where the title is only known from data; `eyebrow`, `lede` and `action` take `Skeleton` blocks.
   - `PageColumn`, `PageFrame` and `PageWithNav`, the layout components the page itself uses.
   - `TabbedPage` with its real `tabs` array, imported from the module the layout uses; each tab carries its own `skeleton` (see below).
   - `PageNav` with static entries.
   - `ListFrame` with `disabled` (its controls drawn disabled and `aria-hidden`) and `ListBodySkeleton`, which draws the page's real column headings over placeholder rows, or the page's card frame (`IngredientCard` and `SpellCard` export their frames, which the card and its skeleton both draw). A `StackTable` takes `pendingRows`.
3. Add the entry to `src/app/skeletons.ts`: the route pattern, the host, the component. Then add the route to `navigations` in `tests/e2e/skeleton-layout.spec.ts` and run the spec for it ([The layout spec](#the-layout-spec)).
4. `tests/guards/skeletons.test.ts` enforces both: it fails when a `page.tsx` has no entry (bar the pages listed in the test by name, each with its reason: auth forms with no data, the root landing, the signed-out request page), and when an entry names no page.

**`PageTab.skeleton` and `ListBody`'s `skeleton`.** A `TabbedPage` tab carries the `skeleton` its panel draws while that tab is on its way. It is optional on `PageTab`: a tab whose page is cheap or already there, and the tab row of a page that is not a tab destination, need none, and a tab without one shows an empty panel while it is on its way, under the page bar ([`design-decisions/m11.9-skeletons-beside-pages.md`](design-decisions/m11.9-skeletons-beside-pages.md), "`PageTab.skeleton` stays optional"). `ListBody` always swaps in a skeleton while a pager or filter is pending, so its `skeleton` prop is required.

### How closely a skeleton matches its page

The skeleton mostly looks like the page it stands for, so switching pages has no layout jump; where content is dynamic it may be a little off. The line is between what is **static** and what is **dynamic**:

- **Static** parts are drawn exactly, in the page's own components and classes, and stand where the real ones will: the heading, the page header, the eyebrow, the lede, the actions, the tabs, the filter row, the page menu, the table headings, the editor's toolbar and the frame around the page.
- **Dynamic** parts may be a little off: the contents of cards, the widths of table cells and the text of a published document. A skeleton draws bars of about the right size for these.

A title that comes from data (an entry's or a spell's name) is dynamic in its text, so its bar is a `pendingTitle` and only its position counts.

### The layout spec

`tests/e2e/skeleton-layout.spec.ts` is the gate for this standard. For every route in its list it signs in, holds the server's answer, clicks the real link, and measures the skeleton. It then lets the page arrive and measures that. It checks two things:

- **Each static part is within 2px of the page's** on x, y, width and height. The parts are the heading, header, eyebrow, lede, actions, tabs, filter row, page menu, table headings and toolbar.
- **The frame does not move** between the skeleton and the arrived page: the site bar and the context row stay where they were.

Every route runs at two widths, 1280 and 375, in the light theme. Dark mode swaps colours only, so it is not run.

Rules the spec follows:

- A table wider than its frame scrolls sideways inside it. Then the frame's box is the static part, not the table's.
- Lists and tables inside `.document-page__body` are published text, so they are not required.
- It waits until nothing on the page has `aria-busy="true"` before measuring. A part that loads after the page arrives (the document editor, which `next/dynamic` loads) must mark its own placeholder `aria-busy="true"` so the spec measures it once it is drawn.
- The origin page's frame is read at the top of that page, before it is scrolled to bring the clicked link on screen. The window goes to the top when the skeleton appears ([Frames, context rows and the scroll](#frames-context-rows-and-the-scroll)), so the skeleton's frame must match the origin's at the top, and the page's must match the skeleton's.
- It waits on conditions, never on the network going quiet or a fixed time: the origin's heading shown and its link hydrated before the click; after the answer, the skeleton and its fade gone, nothing busy, and the heading shown.
- Each user signs in once per worker, and that user's cases share the browser state.

To run it for named routes (the pattern is the route name followed by `at`):

```sh
BETTER_AUTH_SECRET=local-dev-not-a-real-secret \
  npx playwright test tests/e2e/skeleton-layout.spec.ts --grep "(keepers-document|keepers-documents) at "
```

### Frames, context rows and the scroll

Some pages sit in a layout that draws a row of its own above the page: the context row (the coven switcher or the admin area's row). A skeleton for such a page is drawn without that row when the host stands, because the layout keeps it up. When the host does not stand, `framed(host, Page)` in `src/components/SkeletonFrame` wraps the skeleton in a `SkeletonContextRow` and the page's column (`.page-column` or `.coven-layout`), so the frame is the same either way. `skeletonFor` does this for every `main` skeleton that is not standing, so a registered skeleton never draws a frame itself.

The window scrolls to the top, instantly, as a host (`MainBody` or `SectionBody`) starts drawing a destination's skeleton. It runs once per wait, in `useLeavingSkeleton` (`src/components/SkeletonFade`), which both hosts call. A click made far down the page therefore moves the page once, at the tap, and the arrived page has no scroll left to reset. A navigation that draws no host skeleton (a pager, a filter, a sort) and a route modal do not scroll. Next's own scroll on arrival is left on and has nothing to do. The hook saves the left page's position into its history entry before it scrolls and restores it on Back or Forward ([`components/skeleton.md`](components/skeleton.md), "Back after a skeleton"). The skeleton cover is pinned under the site bar (`.skeleton-cover__pin`); with the page at the top, the context row above the cover needs no extra allowance.

### A skeleton runs no query

A skeleton must not render a component that runs a data hook such as a query: it would fetch, or fail without the provider, only to draw a placeholder. Draw the component's markup with the same classes instead, as `DocumentEditorSkeleton` does for the editor's head and toolbar. `tests/guards/skeleton-heading.test.tsx` renders every registered skeleton and fails on a query hook (it reports "No QueryClient set").

### Where the skeletons are used

- `MainBody` (`src/components/AppShell/main-body.tsx`) answers a `main` skeleton by hiding everything inside `.app-shell__main` and laying one `<main>` holding the skeleton over it, so the page frame is covered as well as the page's content. The hidden page stays mounted at its full height, and the skeleton is pinned to the top of the window under the bar. The skeleton draws its own frame, so `MainBody` adds none.
- `SectionBody` does the same for a `coven` or `admin` skeleton, inside the section's layout, so the coven's or admin area's row and navigation stay while the page changes.
- A pager or filter in a `ListFrame`, a tab, and the route modal's provider navigate through the hook directly; they keep their own skeletons. A route modal shows its own `loadingBody`, with the modal skeleton beside the modal (`SupportRequests`).
- **The public pages wait the same way.** A signed-out visitor's Compendium pages sit in `PublicFrame`, not the shell, and its body is the same `MainBody`. In both chromes the page sits in a wrapper `div` (`.app-shell__main`), the skip link's target is an empty span just before it, and the `(public)` layout renders the page's own `<main>` inside the wrapper: during a wait `MainBody` hides that `main` (`aria-hidden`, `inert`) and lays the skeleton's over it, so the page still exposes one `main` and one h1. A `main` on the wrapper would nest the two. There is no `loading.tsx` here either, so a direct request for an unknown entry still answers 404 and a moved one 308.

**The dot inside a `PendingLink`.** `LinkHint` reads Next's `useLinkStatus`, which only sees a navigation that Next's own `<Link>` started. A `PendingLink` navigates through the shared hook, so `useLinkStatus` never reports it pending. `PendingLink` therefore wraps its children in `LinkPendingContext` (`src/lib/navigation/link-pending.ts`), and `LinkHint` shows its dot when either the hook or the enclosing context says pending.

### The guards

Three lint rules in `lint/source-sweeps.js` keep a wait from going unsignalled. Nothing is exempt except the files named in a rule's own list.

- `sorrel/no-bare-router-navigation` fails when a file under `src/` outside `src/lib/navigation/` calls `router.push`, `router.replace` or `router.refresh`, because a bare call moves the page with no signal. The match is by name: a receiver whose name ends in `router` (`router`, `appRouter`), so a router held under another name is not seen. The fix is `usePendingNavigation`.
- `sorrel/in-app-link-through-pending-link` fails when a file under `src/` imports the `Link` component from `next/link` (it reports the import), because a bare `<Link>` navigates with no bar and no skeleton. The fix is `PendingLink`. Three files are named in the rule with their reasons: `pending-link.tsx` itself, `Pager/pager-link.tsx` (it reports pending to the list) and `TabbedPage/tab-links.tsx` (it reports to the tab row). Importing only `useLinkStatus` or a type is fine. A plain `<a>` is not matched, which is how the `target="_blank"` links in `TermsAgreement` stay out of the router their tests do not mount. An allowlisted file that stops importing `Link` is reported too, so the list stays true.
- `sorrel/full-page-load-reports-leaving` fails when a function calls `location.assign`, `location.replace` or `location.reload` (also on `window` or `document`) without a `reportLeaving()` call earlier in the same function. A load inside a callback is not covered by a report in the function around it. Without the report the page bar goes out while the browser is still on its way. Setting `location.href` is not matched.

### Adding a wait: the steps

1. A **link** that navigates: `PendingLink`, with a `LinkHint` inside if it is a text link in the page (not a menu link, which takes none).
2. A **button** whose action is slow: `BusyButton` with a `busyLabel`.
3. A navigation from code: `usePendingNavigation`.
4. A **page** a navigation can reach: `skeleton.tsx` beside it and an entry in `src/app/skeletons.ts` ([Adding a page: its skeleton](#adding-a-page-its-skeleton)).
5. An area that changes in place: a `ListBody` with its `skeleton`, a tab's `skeleton`, or a `Skeleton` of `line` or `block`, swapped in with `SwapPanel`.
6. A new animation for a wait: `@include loading-motion(...)`, never a bare `animation`, so reduced motion is handled.
7. A wait that ends with the browser leaving: `reportLeaving()`.

A save in a route modal navigates nothing, so it shows the `BusyButton` and no bar. On close, the modal replaces the address with its close address and then calls `refresh` from the same navigation hook, so the bar shows if the refresh is slow; a refresh has no destination, so no skeleton replaces the page.

## Research

Why the thresholds and parts are what they are. A statement marked "inference" is the author's reasoning, not a source's.

- **The 100ms delay.** Nielsen puts the instantaneous limit at 0.1 second, with no special feedback needed up to 1 second (Nielsen 1993). So the control answers at once, while a spinner or bar that appears only after 100ms never flashes for a fast answer. Next's `useLinkStatus` page recommends the same shape: a 100ms animation delay, starting at opacity 0.
- **Skeletons against spinners.** A skeleton suits a full screen or more than one element loading; a spinner suits a single module, inline feedback or a background process (Tankala 2023; GitLab, "Skeleton loader"; GitHub Primer, "Loading"). So a region that changes gets a skeleton, a control gets a spinner, and a region never gets both. The skeleton carries one `<output>` status, following Primer's single announcement for a group of skeleton loaders, where Pajamas would announce none.
- **The bar.** The sources disagree on when a progress indicator appears (about 1 second in Sherwin 2014; 1 to 3 seconds in Primer; over 3 seconds in IBM Carbon, "Loading"). The bar is indeterminate because the server cannot say how far along a render is, and it appears after 100ms because it is a cue that something is happening, not a spinner that interrupts. Reading the sources as support for a page-top bar is an inference. Carbon's advice that small indicators sit inside the element they serve matches the control part.
- **React and Next.** React recommends marking page navigations as Transitions, showing the pending state in the control that was pressed (React, `useTransition`). `useLinkStatus` skips the pending state for a prefetched route and shows only the last link pressed.
- **Announcing a wait.** WCAG 2.2 criterion 4.1.3 (Status Messages, AA) wants a status announced without taking focus (W3C WAI, "Understanding 4.1.3"); the skeleton's `<output>` has the status role by its tag, which is an inference from the HTML specification. `aria-busy="true"` marks the control that was pressed (MDN, `aria-busy`). A `role="status"` element must be rendered all the time (Primer); the skeleton is rendered with its content.
- **Motion.** `prefers-reduced-motion` is available in all browsers, inside the browser floor (MDN). MDN's own example replaces a scaling animation with a gentler fade rather than none. Animated skeletons can distract (Tankala 2023), so the shimmer is a gentle band that falls back to a slow pulse, at 1.4s and 2s.
