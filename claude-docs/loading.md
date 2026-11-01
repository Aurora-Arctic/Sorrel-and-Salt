# Loading

The standard for every wait on the site (M12.33): what a person sees between
pressing something and the answer arriving, why it looks that way, and how a
developer adds a new wait that follows it. The decision record, with the
owner's calls, is
[`design-decisions/m12.33-loading-standard.md`](design-decisions/m12.33-loading-standard.md).
The plan the work followed is
[`design-decisions/m12.33-plan.md`](design-decisions/m12.33-plan.md).

## The three parts

Every wait has the same three parts. Each does one job, and none repeats
another's.

| Part        | What it looks like                                                                                                                                                                | Says to a screen reader                                                         | When                                                  |
| ----------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------- | ----------------------------------------------------- |
| **Control** | The pressed thing answers at once: the switcher shows the picked coven's name, a tab's pill moves, a button keeps its label and gains a spinner, a link shows the `LinkHint` dot. | `aria-busy` on the control, and a button's busy label ("Saving Name").          | At once. Spinners and the dot appear after **100ms**. |
| **Region**  | The skeleton of what is coming (cards, table, form or page blocks) replaces the area that changes. The new content fades in over it.                                              | The skeleton's one `<output>` status, "Loading". This is the only announcement. | At once. Skeletons are not delayed.                   |
| **Page**    | A thin indeterminate bar along the bottom edge of the global bar, on **every** navigation: coven switch, site and section links, tabs, filters, pager, route modals, refreshes.   | Nothing. It is `aria-hidden` and only adds a visual cue.                        | After **100ms**.                                      |

"Indeterminate" means the bar does not claim a percentage: it sweeps, because
the site cannot know how long a server render will take.

### Control

The control is the thing the person pressed, and it answers before anything
else does. A press that changes nothing visible feels like a press that did not
register, so the control moves first.

- A **button** is a [`BusyButton`](components/busy-button.md): it keeps its
  place, gains a [`Spinner`](components/spinner.md), swaps its label for a
  busy one, and carries `aria-busy="true"`.
- A **link** in the page shows the [`LinkHint`](components/link-hint.md) dot
  after its text. A link that wears the chain icon shows no dot: its icon turns
  into the [`Spinner`](components/spinner.md) ring in the same space
  (`LinkIconHint`, the owner's call, 2026-10-19). A link that is a tab moves its pill at once
  ([`TabbedPage`](components/tabbed-page.md)). The site's menu links (the
  global bar's links, the admin pages' lead link and the account menu's items)
  show no dot: the page bar and the skeleton answer for them (the owner's call,
  2026-10-19). Each still carries `aria-busy` while its navigation is pending.
- The **coven switcher** shows the picked coven's name with a spinner
  ([`WorkspaceSwitcher`](components/workspace-switcher.md)).
- A **field** that is searching shows a spinner inside the input. In a
  [`Combobox`](components/combobox.md) it sits in the indicator strip at the
  right of the control, beside the clear button and the chevron, and the
  input carries `aria-busy`.

The spinner and the dot wait **100ms** before they show, so an answer that
arrives at once never flashes them. The wait is a CSS animation delay
(`loading-appear`), not a timer.

### Region

The region is the part of the page that is about to change. While it changes,
the old content is hidden and put out of reach (`visibility: hidden`, `inert`,
`aria-hidden`) and the [`Skeleton`](components/skeleton.md) of the new content
stands over it. For the shell's two bodies, `MainBody` and `SectionBody`, the
old page stays mounted at its full height beneath the skeleton rather than
being swapped out, so the page does not shrink before the browser saves the
scroll position that Back returns to (MB.271; [`SkeletonFade`](components/skeleton-fade.md),
"The page is held, not swapped"). The skeleton has seven shapes: `table`,
`cards`, `form`, `page`, `contents` and `recipe` for a whole page, and `line` for one line of text
that is still being fetched. `recipe` is a spell's own page. A `table` or `cards` skeleton can also draw the page's heading row and filter row, so the wait looks like the page that arrives (a compact `cards` filter row also draws the Compact switch where the loaded row has it, and the filter row sits where the loaded page's does at desktop and phone widths). When the real content arrives, the skeleton does not vanish: the shell's bodies keep the last one over the arrived page, `aria-hidden` and out of layout, and it fades out over 200ms (`$arrive-duration`) while the page shows through ([`SkeletonFade`](components/skeleton-fade.md)). A navigation that drew no skeleton (a refresh) fades nothing, a new wait mid-fade takes the skeleton back at once, and under reduced motion the page shows at once, as `arrived` does.

A skeleton shows **at once**, with no wait, because the press has already
hidden the old content: holding the skeleton back would leave an empty panel
for 100ms, which is the jump the skeleton is there to avoid. The Skeleton
itself fades in over 150ms.

It holds exactly one `<output>`, visually hidden and reading "Loading". A
screen reader hears that one status however many placeholder shapes are drawn,
and the shapes are `aria-hidden`.

### Page

The [navigation bar](components/navigation-bar.md) is the page's own signal.
It is 3px tall, sits under the global bar, and shows only if a navigation is
still going after 100ms. It is `aria-hidden`: the control and the region have
already told a screen reader, and a third announcement would repeat them. The
bar exists for the navigations that have no better place to show a wait, such
as a click on a brand link, and so that every navigation, including a slow
`router.refresh()`, gives some sign.

## Reduced motion

Under `prefers-reduced-motion: reduce` the spinner, the shimmer and the bar
all become **one slow opacity pulse** (`loading-pulse`, `$pulse-duration`,
2s), never a still mark. A wait that stops moving looks finished, so it
never goes still. That includes the `LinkHint` dot, which pulses too (the
owner's call, 2026-10-19; see the decision record).

The reason it pulses rather than stops: reduced motion asks to remove or
replace motion that can unsettle a person, and MDN's own example replaces a
scaling animation with a gentler fade rather than none
([MDN, `prefers-reduced-motion`](#references)). That the pulse, as opposed to
a still mark, is the right replacement for a wait is the owner's call and
this doc's inference; none of the sources read for this task say so. A
change of opacity is not the sort of movement that setting is meant to
spare people from, which is also an inference.

The `loading-motion` mixin does this swap in one place, so no component
invents its own fallback.

## The coven switch

Switching covens is the longest wait on the site, because the new coven's
layout and page both read from the database.

1. Choosing a coven in the switcher shows the picked name and a spinner at
   once, with `aria-busy` on the box (`ComboboxSelect`'s `busy` prop).
2. [`SectionBody`](components/section-body.md) takes the old coven's page away at
   once, with no dimming, so nobody acts on the wrong coven's data. It does
   this when the site is busy and the target's region is `coven`.
3. The **destination section's** skeleton takes its place, inside a `<main>`
   of its own, because the pages draw their own `<main>` and the landmark
   would otherwise vanish during the wait. That `<main>` also holds a visually
   hidden `<h1>Loading</h1>`, because the skeleton replaced the page's `h1` and
   axe's page-has-heading-one rule failed during every wait; `MainBody` does
   the same. The owner decided on 2026-10-19 to keep it, so a screen
   reader hears both the heading and the skeleton's "Loading" status. The switcher works out the target
   with `covenTarget` (`src/lib/coven-path.ts`): cards under a title and a
   filter for Ingredients, a table under a title and a tab row for Members and
   Invitations, a page with its contents menu for the coven home, and a plain
   page for anything else. Choosing Create Coven aims at the `main` region
   with a `form` shape instead, since that page is not inside a coven.
4. When the new coven renders, the content fades in, and focus returns to the
   switcher. The `[slug]` layout remounts on a switch, so focus would
   otherwise drop to `<body>`. The switcher sets a module-level flag when a
   switch to another coven starts, and the next switcher to mount reads it
   once and focuses its box. A module variable survives the remount, as
   component state cannot, and dies with the page, so a reload never
   refocuses. A switch that ends without a remount (a refusal) clears the
   flag. Returning focus to the switcher is a judgement, not a sourced rule,
   and is checked in the design review.

## Why there is no `loading.tsx` and no route-level Suspense

Next's own answer to a slow page is a `loading.js` file, which wraps the page
in a `<Suspense>` boundary and shows its fallback from the server straight away
([Next.js, `loading.js`](#references)). The site does not use it, and adds no
`<Suspense>` around a route, for two reasons.

1. **The guards' status codes would be lost.** Next documents that a streaming
   page response begins with a `200` status, and that the status is fixed once
   the body starts to stream, which happens when a Suspense fallback renders.
   A `notFound()`, `forbidden()` or `unauthorized()` called after that point
   can no longer change it ([Next.js, `loading.js`](#references), "Status
   codes"). The site depends on its guards answering with the right code: a
   non-member at `/coven/[slug]` gets a 404, `/admin` shows its not-authorized
   page with a 403, and a retired ingredient slug answers a 308. A route
   `loading.tsx` would turn each into a `200`. (That a 308 specifically is
   lost follows from the same rule for status codes in general; the page names
   404, 403, 401 and redirects.)
2. **Rendering without JavaScript would break.** A direct request, such as a
   typed address, a bookmark or a crawler, gets the whole page from the server
   in the first response, with no loading state streamed ahead of it
   ([`components/tabbed-page.md`](components/tabbed-page.md), "Contracts").

So every pending state on the site is a **client transition**. A router call
made inside a React transition stays pending until the new page has
rendered: React's reference says `isPending` "stays `true` until all Actions
complete and the final state is shown to the user", and recommends marking page
navigations as Transitions ([React, `useTransition`](#references)).

The wait itself is held by `useOptimistic`. A value set with it inside a
transition lasts as long as that transition and goes back by itself when the
transition ends, whether the page arrived, another navigation took over, or the
request failed ([React, `useOptimistic`](#references)). One component,
`NavigationProvider` in `src/lib/navigation/provider.tsx`, is mounted once in
`src/app/providers.tsx` and never unmounts. It holds that value and the
router, and every navigation and refresh the site starts is a transition it
opens. Nothing is ever settled by hand. The first version kept the transition
in the component that pressed the link and cleared the wait when that component
unmounted; `MainBody` and `SectionBody` then swapped their children for a
skeleton (they now hold the page hidden beneath it, MB.271), which unmounted
the pressed link, so the wait ended at once and the old page came
back (the admin navigation, the coven home contents links and Create Coven
were all hit). Owning the wait above every region removes that whole class of
bug.

`useLinkStatus` from Next is the similar hook for a `<Link>`, and Next's
documentation recommends it for a subtle inline hint, with a 100ms animation
delay so that a fast navigation never flashes it ([Next.js,
`useLinkStatus`](#references)). The site's `LinkHint` is that hint. `useLinkStatus`
reports only the link it sits inside, and says nothing to the rest of the page;
that is why the provider's shared state below exists.

## How to adopt it

Navigation goes through one set of pieces in `src/lib/navigation/`, all
exported from its `index.ts`.

| Piece                    | What it is, and when to use it                                                                                                                                                                                                                                                                                                                       |
| ------------------------ | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `PendingLink`            | The link the site draws, in place of a bare `next/link` where the press navigates. A plain press navigates through the shared hook; a press meant for a new tab or window, or a link with its own `target`, is left to the browser. It sets `aria-busy` on the anchor while its navigation is pending, and tells a `LinkHint` inside it (see below). |
| `usePendingNavigation()` | Returns `{ pending, navigate(href, options), refresh() }`. Use it for any navigation that is not a link: a button that pushes, a redirect after a save, a refresh. `pending` is true while this caller's navigation is the one showing; the site-wide state carries it for the rest.                                                                 |
| `reportLeaving()`        | For a wait that ends with the browser leaving the page, such as redirecting to a sign-in provider: it keeps the page bar up until the browser unloads.                                                                                                                                                                                               |
| `NavigationBar`          | The bar. Mounted once in `src/app/providers.tsx`; a developer does not render it again.                                                                                                                                                                                                                                                              |
| `Skeleton`               | The region. `shape` is `table`, `cards`, `form`, `page`, `contents`, `recipe` or `line`; see [`skeleton.md`](components/skeleton.md).                                                                                                                                                                                                                |
| `Spinner`                | The control's ring, inside a button or field; see [`spinner.md`](components/spinner.md).                                                                                                                                                                                                                                                             |
| `loading-motion`         | The Sass mixin for any new piece that moves to say something is loading; it brings the reduced-motion pulse and the optional 100ms wait with it.                                                                                                                                                                                                     |

`navigate(href, options)` takes `{ replace, scroll, target }`:

- `replace` replaces the history entry rather than adding one.
- `scroll: false` keeps the scroll position, as a filter or pager does. The
  router sees options **only when a caller gives some**, so a plain call is a
  plain `push(href)`.
- `target` says where the page is headed:
  `{ region: 'coven' | 'admin' | 'main', shape, title?, action?, filter? }`. Whatever draws the region's skeleton
  reads it from the store. On `PendingLink` the same thing is the prop
  `navigationTarget`, because an anchor's own `target="_blank"` keeps its name.

A navigation waits first on any mounted page form with unsaved changes
(`useLeaveGuard`, M13.14): that form asks Discard Changes or Keep Editing,
and the navigation starts only on Discard Changes. A refresh is never held
([`components/modal.md`](components/modal.md), "Unsaved changes").

Under the hood, `NavigationProvider` holds the site-wide wait (who started it
and its target) in React context, so the bar and the regions can follow a
navigation that a button elsewhere in the tree started.
`useNavigationState()` joins it with the one thing React cannot see, the
`leaving` flag of a small external store, set by `reportLeaving()` and cleared
only by a restored page. Outside the provider (a Storybook story, a component test)
`usePendingNavigation` makes a plain router call in a transition and shows no
wait.

**When navigations overlap.** The later navigation's wait shows, and its
caller alone is `pending`; the earlier caller's `pending` goes false at once.
React drops the wait only when the last overlapping transition has ended, so
the first page to arrive does not clear a wait that a second navigation is
still owed. A navigation that another supersedes ends with its transition,
with no cleanup of ours. Component tests read this state from committed
renders (an effect), because React re-runs a suspended transition's render
with the value already put back.

**Where the pieces are used.** The links that draw a skeleton name a target:

- The site bar's links, and their copies in the account menu, use
  `siteLinkTarget(base, href)` (`src/components/AppShell/site-target.ts`): the
  `main` region, each in the frame its page sits in. `/compendium` is cards
  under a title and a filter in the wide column; `/coven` is a page in the
  narrow column, or, when the link goes straight to a lone coven's home
  (`href` differs from `base`), a page with its contents menu; `/admin` is a
  wide page. The account links are a page with the jump menu.
- The admin navigation, and the `Admin` lead in the admin context row, use
  `adminTarget` (`src/components/AdminNav/target.ts`), the `admin` region, so
  the row and its nav stay while the page changes: `page` for `/admin`, `cards` for `/admin/compendium`, and `table` for the
  rest.
- The coven's section links (each carries a `target` in `SectionNav`'s props)
  and the Contents on the coven home name the `coven` target `covenTarget` gives for the section's address.
- Every link into an ingredient's page names the page it draws through
  `ingredientLinkTarget(href, fromCoven?)` (`site-target.ts`): a Compendium
  entry is a `main` `page` with its jump menu (`entry`); a coven's own
  entry is the `coven` region's `page` with its jump menu (`entry`) (`covenTarget`
  knows an address with an id beneath `ingredients`), or, from outside the
  coven (the admin shell's Add Ingredient), the `main` region's; the
  Compendium list is `siteLinkTarget('/compendium')`. The sources are the
  ingredient card's name ([`IngredientCard`](components/ingredient-card.md),
  so the Compendium and coven cards both), the admin Compendium list's name
  link, the search box's pick, and the ingredient page's own links (substitutes,
  In the Compendium, Similar, See All, the moved-away link), plus the
  navigations that follow a Make It Ours and a Save in Add
  Ingredient. The skeleton always draws the jump menu, though the page draws it
  only for an entry that has forms. A same-page save in the entry dialog, and
  the delete that returns to the list, keep what they had.
- A pager or filter in a `ListFrame`, a tab, and the route modal's
  provider navigate through the hook directly; they keep their own
  skeletons.

**What `MainBody` covers.** `MainBody` (`src/components/AppShell/main-body.tsx`)
answers a `main` target by hiding everything inside `.app-shell__main` and laying
one `<main>` holding the skeleton over it, so the page frame is covered as well
as the page's content. The hidden page stays mounted at its full height, and the
skeleton is pinned to the top of the window under the bar, wherever the page
was scrolled to (MB.271). The `<main>` takes the frame the target names, top-aligned
and never centred in the window: `wide`, `with-nav` and `entry` use `page-column`,
`narrow` uses `page-frame page-frame--narrow`, and no frame the standard
`page-frame`. A narrow `form` sits on a `panel`, as the real form does.
`with-nav` also draws the side menu beside a `page`, in the page's own `.page-with-nav` grid (the narrow column), and `entry` the same menu in `.ingredient-entry--with-nav`, the wide column an ingredient's page fills, from the one `entry-nav-grid` mixin the page shares, and the admin index is the `contents` shape (sections of links), and the target's `head` (`eyebrow` for the coven home and an ingredient's page, `title` for Account) shapes the head the page draws, and `tabsBelow` puts that tab track on its own line beneath the heading, `columns` and `fields` size a `table` skeleton's columns and filter controls to the page's (the admin Support list), a route modal can show its own `detail` skeleton as `loadingBody` rather than the form's, and `tabs` draws
the tab track in the heading row. A navigation with no target, such as a
refresh, leaves the page standing, and a `coven` or `admin` target is `SectionBody`'s.

**The public pages wait the same way** (M12.47). A signed-out visitor's
Compendium pages sit in `PublicFrame`, not the shell, and its body is the same
`MainBody`, so a press of the frame's Compendium link (`siteLinkTarget('/compendium')`),
a card or an entry's own links draws the destination's skeleton under the
frame's bar. In both chromes the page sits in a wrapper `div`
(`.app-shell__main` in both frames), the skip link's target is an
empty span just before it, and the `(public)` layout renders the page's own
`<main>` inside the wrapper:
during a wait `MainBody` hides that `main` (`aria-hidden`, `inert`) and lays
the skeleton's over it, so the page still exposes one `main` and one h1. A `main` on the wrapper would have nested the
two. There is no `loading.tsx` here either, so a direct request for an unknown
entry still answers 404 and a moved one 308.

**The dot inside a `PendingLink`.** `LinkHint` reads Next's `useLinkStatus`,
which only sees a navigation that Next's own `<Link>` started. A
`PendingLink` navigates through the shared hook, so `useLinkStatus` never
reports it pending. `PendingLink` therefore wraps its children in
`LinkPendingContext` (`src/lib/navigation/link-pending.ts`), and `LinkHint`
shows its dot when either the hook or the enclosing context says pending.

### The guard

The lint rule `sorrel/no-bare-router-navigation` (`lint/source-sweeps.js`) fails when a file under `src/` outside
`src/lib/navigation/` calls `router.push`, `router.replace` or
`router.refresh`, because a bare call moves the page with no signal. The match
is by name: a receiver whose name ends in `router` (`router`, `appRouter`),
so a router held under another name is not seen. Next's `<Link>` is not
covered. Nothing is exempt: a file that holds such a call fails in its own diff, and the
fix is `usePendingNavigation`.

### Adding a wait: the steps

1. A **link** that navigates: `PendingLink`, with a `LinkHint` inside if it is
   a text link in the page (not a menu link, which takes none).
2. A **button** whose action is slow: `BusyButton` with a `busyLabel`.
3. A navigation from code: `usePendingNavigation`, and a `target`
   when a skeleton should follow.
4. An area that changes: a `Skeleton` of the right `shape`, swapped in with
   `SwapPanel`.
5. A new animation for a wait: `@include loading-motion(...)`, never a bare
   `animation`, so reduced motion is handled.
6. A wait that ends with the browser leaving: `reportLeaving()`.

## Examples

**Coven switch, Hollow Oak to Willow Hall, on Ingredients:**

```
│ Sorrel & Salt   Compendium  Your Covens        ☰ │
│▓▓▓▓▓▓▓▓░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░│  page: bar
│ [Willow Hall ⟳ ▾]  Ingredients  Members          │  control: picked name + spinner, aria-busy
│ ┌────────┐ ┌────────┐ ┌────────┐                 │  region: the Ingredients card skeleton,
│ │░░░░░░  │ │░░░░░░  │ │░░░░░░  │                 │  <output>Loading</output>
│ └────────┘ └────────┘ └────────┘                 │
```

More examples:

- **Section link (Members):**
  - Page: the bar.
  - Control: the Members tab shows the dot.
  - Region: the coven body shows the table skeleton.
- **Site link (Compendium):**
  - Page: the bar.
  - Control: the dot.
  - Region: the page (`.app-shell__main`) shows the page-blocks skeleton.
- **Filter or pager:** unchanged, plus the bar.
  - Region: the list's skeleton replaces its rows.
- **Save in a modal:** unchanged, with no bar, because nothing navigates.
  - Control: `BusyButton` shows its busy label and a spinner.
  - On close, the route modal replaces the address with its close address and
    then calls `refresh` from the same navigation hook, so the bar shows if the
    refresh is slow. A refresh has no target, so no skeleton replaces the
    page.
- **Sign in with Google:**
  - Control: the provider button becomes a `BusyButton` with a spinner.
  - Page: the bar stays up until the browser leaves.
- **Combobox search:**
  - Control: the spinner appears in the indicator strip, and the input
    carries `aria-busy`.
- **Substitute summary:**
  - Region: a `line` skeleton replaces the plain "Loading…" text.

## Stories

Search "loading" in the workshop to find every one; they all sit under
`Feedback`. The two below are not components of their own,
so their stories live in `.storybook/`:

- `Main Body` (`.storybook/main-body.stories.tsx`): `States` holds one dropdown of pages inside the shell; the
  ones that wait open with their link already pressed, so the page has gone and the
  `page` skeleton stands in its `main`, under the page bar.
- `Pending Link` (`.storybook/pending-link.stories.tsx`): `Default` is a link with its
  hint; `Pending` opens pressed, with the dot showing and `aria-busy` set.

Both run the real `NavigationProvider`. `.storybook/navigating.tsx` keeps the
router call pending for good, as the App Router does until a page renders; its
"Start Over" button ends the wait.

## Research

Why the thresholds and parts are what they are. Each claim below names the
source it was read in during this task (M12.33, read 2026-10-19). Where a
statement is the author's reasoning and not a source's, it says "inference".

### The 100ms delay

Nielsen's response-time limits put the line at 0.1 second: that is about the
limit for the system to feel as though it reacts instantly, so no feedback is
needed beyond showing the result (Nielsen 1993). Between 0.1 and 1 second the
delay is noticeable but the user's flow of thought stays intact, and "no
special feedback is necessary" (Nielsen 1993). Past one second, a 2014 update
to the same article says to indicate that the computer is working (Nielsen
1993). So **the control answers at once** (it is the instantaneous reaction to
the press) while a **spinner or bar that only appears after 100ms** never
flashes for a fast answer. Next's `useLinkStatus` page recommends the same
shape: an initial animation delay of 100ms, starting at opacity 0, to avoid
flashes (Next.js, `useLinkStatus`). That the 100ms hold-back suits this site's own screens, and
not only the examples, is an inference.

### Skeletons against spinners

- NN/g's skeleton-screen article says skeletons suit a full screen loading,
  where the wireframe conveys the layout, and spinners suit a single module
  such as a card or video; under one second neither is needed (Tankala 2023).
- GitLab's Pajamas says to use a skeleton loader when more than one content
  element loads at once and a spinner is "not prominent enough", and a spinner
  for inline feedback, a background process or a state tied to one component;
  and not to combine a skeleton with a spinner (GitLab, "Skeleton loader").
- Primer says to use a skeleton for large areas of loading content (GitHub
  Primer, "Loading").
- Carbon offers skeleton states as the alternative to a loading indicator for
  content shown progressively (IBM Carbon, "Loading").

This is the site's split: a **region** that changes gets a skeleton, a
**control** gets a spinner, and a region never gets both (the substitute
summary and the Combobox each use one). One place where the site differs from
a source: Pajamas says a skeleton loader need not be a live region and need not
announce that the page is busy, because it is short-lived (GitLab, "Skeleton
loader"). The site's skeleton does carry one `<output>` status. That is
following Primer, which asks for a single loading announcement for a group of
skeleton loaders and not one per item (GitHub Primer, "Loading"), and WCAG
below. The choice of one status over none is the project's.

### Progress indicators and the bar

- NN/g: use a progress indicator for any action taking longer than about one
  second; a looped animation suits 2 to 10 seconds and is not recommended past
  10 seconds, where a percent-done indicator is advised (Sherwin 2014).
- Primer's timing: under one second, show no loading state; 1 to 3 seconds,
  an indeterminate state; 3 to 10 seconds, a determinate one if possible
  (GitHub Primer, "Loading").
- Carbon: "use a loading indicator if the expected wait time exceeds three
  seconds", and not several at once (IBM Carbon, "Loading").

The three sources do not agree on the number, and the bar is indeterminate
because the server cannot say how far along a render is. The bar appearing
after 100ms, not after one second or three, is the owner's call (the decision
record), taken because the bar is a cue that something is happening and not a
spinner that interrupts. Reading the sources as support for an indeterminate
bar on waits of a few seconds is an inference; none of them describes a
page-top bar.

Carbon's guidance that small loading indicators belong inside the element they
serve, such as a button, with related controls disabled while loading, matches
the control part (IBM Carbon, "Loading").

### React and Next

- React: `isPending` "stays `true` until all Actions complete and the final
  state is shown to the user"; a Transition keeps the UI responsive; and for
  frameworks, "we recommend marking page navigations as Transitions" (React,
  `useTransition`).
- React also says Transitions "will not display unwanted loading indicators",
  and its tab example shows the pending state in the tab button rather than
  hiding the container (React, `useTransition`). The control part follows that
  example.
- Next: `useLinkStatus` returns `pending` for the link it sits in; the pending
  state is skipped if the route was prefetched; and only the last link's state
  shows when several are pressed quickly (Next.js, `useLinkStatus`).

### Announcing a wait

- WCAG 2.2 success criterion 4.1.3, Status Messages (level AA): status
  messages must be programmatically determinable through role or properties so
  assistive technology can present them "without receiving focus" (W3C WAI,
  "Understanding 4.1.3"). `role="status"` is a listed technique. The
  skeleton's `<output>`, which has the status role by its tag, is how the site
  meets this for a wait. The mapping from `<output>` to that role is an
  inference from the HTML specification and was not re-read for this task.
- MDN: `aria-busy="true"` says an element "is being updated", and tells
  assistive technology that it may want to wait before informing users of the
  change (MDN, `aria-busy`). The site sets it on the control that was pressed
  (a button, the switcher, the tab row).
- Primer adds that a `role="status"` element must be rendered all the time and
  not only when a message is to be announced (GitHub Primer, "Loading"). The
  skeleton is rendered with its content, so this is not an issue for it: an
  inference.

### Motion

- MDN: `prefers-reduced-motion` detects a setting to "minimize the amount of
  non-essential motion", where the interface may "remove, reduce, or replace"
  motion; the property has been available in all browsers since January 2020,
  so it sits inside the site's browser floor (MDN, `prefers-reduced-motion`).
- NN/g warns that animated skeleton screens, with pulsing or shimmer, "can
  potentially be distracting, annoying, or even create accessibility
  problems" (Tankala 2023). This is a reason the shimmer is a gentle band and
  falls back to a slow pulse; the choice of 1.4s and 2s is the owner's.

### References

Chicago bibliography form. All accessed October 19, 2026.

- GitHub Primer. "Loading." Primer. Accessed October 19, 2026. https://primer.style/ui-patterns/loading.
- GitLab. "Skeleton loader." Pajamas Design System. Accessed October 19, 2026. https://design.gitlab.com/components/skeleton-loader.
- IBM. "Loading." Carbon Design System. Accessed October 19, 2026. https://carbondesignsystem.com/components/loading/usage/.
- MDN Web Docs. "ARIA: aria-busy attribute." Mozilla. Accessed October 19, 2026. https://developer.mozilla.org/en-US/docs/Web/Accessibility/ARIA/Reference/Attributes/aria-busy.
- MDN Web Docs. "prefers-reduced-motion CSS media feature." Mozilla. Accessed October 19, 2026. https://developer.mozilla.org/en-US/docs/Web/CSS/@media/prefers-reduced-motion.
- Next.js. "loading.js." Vercel. Last updated September 23, 2026. Accessed October 19, 2026. https://nextjs.org/docs/app/api-reference/file-conventions/loading.
- Next.js. "useLinkStatus." Vercel. Last updated September 2, 2025. Accessed October 19, 2026. https://nextjs.org/docs/app/api-reference/functions/use-link-status.
- Nielsen, Jakob. "Response Times: The 3 Important Limits." Nielsen Norman Group. Originally published January 1, 1993 (from _Usability Engineering_, chapter 5). Accessed October 19, 2026. https://www.nngroup.com/articles/response-times-3-important-limits/. Cited above as Nielsen 1993.
- React. "useOptimistic." react.dev. Accessed October 19, 2026. https://react.dev/reference/react/useOptimistic.
- React. "useTransition." react.dev. Accessed October 19, 2026. https://react.dev/reference/react/useTransition.
- Sherwin, Katie. "Progress Indicators Make a Slow System Less Insufferable." Nielsen Norman Group. October 26, 2014. Accessed October 19, 2026. https://www.nngroup.com/articles/progress-indicators/.
- Tankala, Samhita. "Skeleton Screens 101." Nielsen Norman Group. June 4, 2023. Accessed October 19, 2026. https://www.nngroup.com/articles/skeleton-screens/.
- W3C Web Accessibility Initiative. "Understanding Success Criterion 4.1.3: Status Messages." WCAG 2.2. Accessed October 19, 2026. https://www.w3.org/WAI/WCAG22/Understanding/status-messages.html.
