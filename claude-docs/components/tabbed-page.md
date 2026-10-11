# TabbedPage

`src/components/TabbedPage/` — a page divided into tabs, each tab at its own
address: the page's `h1` with the open tab's action at the end of its line,
a row of links, one per tab, drawn as a segmented control, and the open
tab's content beneath. On the owner's call after MB.115's design review, each admin
list shares a page with the group list that organises it: the Categories page
has a Categories tab at `/admin/categories` and a Groups tab at
`/admin/category-groups`. Every admin page but the compendium is one
([`admin-nav.md`](admin-nav.md) tables them).

## Props and parts

`TabbedPageProps` (`types.ts`):

| Prop       | What it is                                                                           |
| ---------- | ------------------------------------------------------------------------------------ |
| `title`    | The page's `h1`, title case, which names the tabs' nav too: "Categories"             |
| `tabs`     | Each tab's `href`, short label ("Groups", "Traditions") and `filtered`, in row order |
| `action`   | Optional: the open tab's one action, beside the heading                              |
| `children` | The open tab's content                                                               |

Inside, `tab-switch.tsx` holds the client parts the tab row, the action and
the content area share: `TabSwitchProvider`, `TabAction` (the action's
wrapper), `TabPanel` (the content area) and `useTabSwitch`.
`panel-loading.tsx` is `TabPanelLoading`, the skeleton the content area
shows while a pressed tab is on its way. A tab's `filtered`, set in
`ADMIN_PAGES` on every tab whose list opens with a filter, tells it whether
to draw a filter row.

## Contracts

- **Every tab keeps its own address.** A tab is a link to its own route, so
  it can be bookmarked, and its `?new`, `?edit=` and cursor links keep
  working as they did when each list was a page of its own.
- **Pressing a tab does not change the page.** On the admin pages a route
  group, a folder in parentheses that adds nothing to the address (Next's
  "Route Groups"), holds the page's tabs, and its `layout.tsx` renders this
  component: `src/app/admin/(categories)/layout.tsx` around `categories/` and
  `category-groups/`. A layout stays mounted while the address moves between
  its child routes, so the heading and the tab row stay put and only the
  action and the content swap.
- **The action belongs to the tab, beside the page's heading** (the owner's
  call): Add Category on Categories, Add Group on its Groups tab, Add Form,
  Add Deity, Add Tradition, Add Planet, Add Zodiac Sign, Pause Admin Changes
  on Users, Invite Admin on Invitations, and nothing on Privilege Changes.
  The heading is drawn by `PageHeader` ([`page-header.md`](page-header.md)),
  the action at the end of its line. Each route group's layout takes the
  action from an `@action` slot, a Next parallel route
  (`node_modules/next/dist/docs/01-app/03-api-reference/03-file-conventions/parallel-routes.md`):
  `src/app/admin/(categories)/@action/categories/page.tsx` renders Add
  Category beside `categories/page.tsx`'s list, and so on, one slot page per
  tab. A slot page is a page, so it renders on the server with the rest of a
  direct request, and Next renders it again on every client-side navigation
  that changes its address, a tab switch, `?new`, `?edit=` or a cursor
  alike, since a page segment's key carries its search parameters. Every tab
  has a slot page, Privilege Changes one that renders nothing, because on a
  client-side navigation Next keeps a slot's last page where the new address
  has none; each slot's `default.tsx`, what Next asks for on a full load it
  cannot match, renders nothing too. A slot page calls the guard as every
  admin page does. The value and group pages' actions are `ValueAction` and
  `GroupAction`, beside `ValuePage` and `GroupPage`, reading the same
  address the same way, so the Add keeps the list's filter and cursor. Pause
  Admin Changes reads the pause through a per-request cache the Users page
  shares (`src/app/admin/(people)/pause-state.ts`), so it is read once.
  Invite Admin is a link to `?invite`, which opens its form over the list
  ([`admin-invitations.md`](admin-invitations.md)).
- **A direct request renders the whole page on the server** (the owner's
  call): a typed address, a bookmark, a refresh or a link from outside the
  tabs gets the heading, the tabs and the tab's content in the first
  response, with no loading state streamed ahead of them. So the route
  groups have no `loading.tsx`, and the tabbed pages add no other
  `<Suspense>` boundary.
- **A pressed tab greys the row and shows the loading state** (the owner's
  call). A plain left click on a tab other than the open one is the tab
  row's own: `tab-links.tsx` stops the browser following the link and
  calls `router.push` inside a React transition (`useTransition`) the row
  and the content area share. Next runs its navigation inside the caller's
  transition, so it stays pending until the new tab has rendered. Until
  then the content area shows the pressed tab's skeleton, `TabPanelLoading`,
  in place of the old tab's content, every tab is `aria-disabled` and ignores a press, and the
  action beside the heading is `inert`, out of reach of a press or focus;
  the row is `aria-busy`, and so is the pressed tab. The pill that marks a
  tab moves to the pressed one at once, in its pending look (the owner's
  call), while `aria-current="page"` stays on the tab that is open, since
  it names the page shown, not the press. All clear when the new tab
  renders, `aria-current` and the pill on it, its action replacing the old
  one in the same render, and the new content fades in over the skeleton.
  A navigation that fails or is abandoned ends the transition, so the pill
  returns to the open tab. The pager's soft ends
  hold their own page the same way ([`pager.md`](pager.md)).
- **Only a plain press is the row's.** A Ctrl, Cmd, Shift or Alt click and a
  middle click keep the browser's behaviour, a new tab or window, by the
  pager's rule (`opensElsewhere`, `src/lib/opens-elsewhere.ts`). The open
  tab is left to Next's link and shows no loading state. Without JavaScript
  each tab is a plain link.
- **The group's layout reads nothing.** No session, no guard, no data: it
  draws only the heading and the tabs, both from `ADMIN_PAGES`
  (`src/components/AdminNav/sections.ts`). A layout does not re-run on a
  tab press, so a guard there would add nothing; the guard stays in
  `src/app/admin/layout.tsx` and every page
  ([`auth/admin-guard.md`](../auth/admin-guard.md)).
- **Only a change of tab shows the loading state.** A filter, a pager press
  or a modal's `?edit=` link navigates within the tab without the tab row,
  so the list stays in place while the new one reads, as before.
- **A nav of links, not a `role="tablist"`.** Each tab navigates to another
  address. A tablist promises arrow-key movement between panels shown in
  place, which these are not. The row is a `nav` named by the page's title,
  and the open tab's link carries `aria-current="page"`, found from the
  address by `usePathname()` with the admin nav's rule (`isAtPath` in
  `src/lib/at-path.ts`): the tab's own address or one beneath it, the
  first such tab. It looks like a segmented control, and is still a nav: a
  look does not change what pressing a tab does. So `tab-links.tsx` is the
  one client part; the rest renders on the server.
- **Each tab keeps its own `metadata` title**, set in its `page.tsx`:
  "Category Groups — Admin — Sorrel & Salt" on the Groups tab.

## Styling

`index.scss`, imported by `index.tsx`.

- **The heading line** is the `.page-header` primitive
  ([`styling.md`](../styling.md), "Buttons"): the action at the end of the
  heading's line, beneath it under 28rem and spanning that line in the admin
  area, the owner's call for an admin page's primary action at a phone's
  width. The action's wrapper, `.tabbed-page__action`, spans it with its
  action, and is taken out of the line when a tab has none. An action that
  wraps its button, the pause's row or a locked control, spans its button
  in its own stylesheet (`UserList/index.scss`, `controls.scss`), so
  Pause Admin Changes and a locked Invite Admin span the line as an Add
  link does. The line sits
  `space(4)` above the tab row, which sits `space(5)` above the content.
- **The tab row is a segmented control** (the owner's call at MB.115's
  review, over an underline bar and folder tabs): one rounded track on the
  card surface, edged in the muted ink 35% into the card so it holds on the
  light page, whose ground is close to the card's; each tab a segment in
  the muted ink at weight 500, `space(2)` by `space(4)` round its label,
  turning to the body ink on hover; the open tab a raised pill, the accent
  18% into the card under `$shadow-floating`, edged 1px in the accent, its
  label in the body ink. The fill alone sits under WCAG 1.4.11's 3:1 against
  the track (1.40:1 dark, 1.28:1 light); the edge measures 7.23:1 and
  5.17:1, and the open label on the fill 9.60:1 and 11.68:1. The two mixes
  are local to the stylesheet, as the skeleton's are, since nothing else
  uses them; `tests/scss/tokens.test.ts` holds the open label and the edge
  to their floors in both themes. The page ground would sit darker than the
  track in the light theme and read as a dent rather than a pill. The row
  is not the `.link-row` primitive, whose underline it does not draw; it
  clears the list's marker, indent and item margins itself.
- **The pill slides.** It is one element beneath the links, placed by
  `tab-links.tsx` under the open tab, or the pressed one while it is on
  its way, and sliding there over 250ms; under `prefers-reduced-motion:
reduce` it jumps. The server draws the pill on the open link itself, so it
  is there before the script runs and without it; once the sliding pill is
  placed, the row's `data-sliding` hands the drawing over. Not a View
  Transition: Next's (`node_modules/next/dist/docs/01-app/02-guides/view-transitions.md`)
  rides on an experimental flag and animates whole-page snapshots, and a
  tab press should move one pill.
- **Keyboard focus** is the accent ring, drawn 2px inside the segment rather
  than round it, where the track would clip it.
- **Pressed**, for as long as a pointer is down on a segment, the pill's
  fill comes under its label at once and the segment sinks a pixel, so a
  press answers before the pill slides over. A tap marks it too, through
  `pressFeedback` (`src/lib/press-feedback.ts`; [`styling.md`](../styling.md),
  "Buttons"), since a phone applies `:active` late or not at all. A
  disabled segment shows no pressed look.
- **At a phone's width** (under 28rem, `$narrow-column`, of the nav's own
  width, the nav being a size container, as the page header stacks under
  28rem of its own), the track spans the line and the segments grow to share
  it from their own widths, never under them. At every width a segment keeps
  its label on one line, and a row longer than its column scrolls sideways
  inside the track rather than wrapping or squeezing: the track's rounded
  edge stays put and clips the segments, and the page never scrolls
  sideways. People's three tabs need 403px and get 309px at 375. The
  scrollbar is hidden, since it would cross the pill's foot inside a track
  this thin and a phone draws none at rest; what says there is more is the
  label cut off at the edge and a shade on that side, the muted ink 45%
  into nothing, shown only on a side with more to scroll to (the
  scroll-shadow pattern: covers in the track's fill ride with the segments,
  the shades stay with the track, no script). When the page loads, and when
  the pill moves, `tab-links.tsx` centres its tab in the track by setting
  the track's `scrollLeft`, never `scrollIntoView()`, which would scroll
  the page too, and again when the web font arrives or the track changes
  width. A keyboard focus moving along the row is scrolled into view by
  the browser, clear of the shade by the track's `scroll-padding-inline`.
- **A tab while one is on its way** takes the muted, faded look of a
  disabled control ([`styling.md`](../styling.md), "Disabled is dashed and
  faded"): the muted ink at 55% and the not-allowed cursor, hover changing
  nothing. The pill, on the pressed tab by then, fades with them, its
  colour taken out (`grayscale`) and its shadow gone, so it reads as on its
  way rather than arrived; its edge then measures about 3.07:1 dark and
  2.30:1 light against the track, under 3:1 in the light theme, while every
  tab is disabled. The action beside the heading fades to 55% with them and
  loses its colour, so a solid button greys as the tabs do.
- **The content** is a column `space(5)` apart, as `.list-frame` spaces a
  list's.
- **The loading state is a skeleton** of the list it stands in for, on the
  owner's call, so the page does not snap from one tab to the next: where
  the pressed tab has a filter, a filter row of the query field, a narrower
  select and the Filter button, with no Add, which sits beside the heading;
  then a table's heading over the muted hairline and six rows, every second
  one banded on the card surface as the admin tables are, their bars of
  uneven lengths; then the pager's two ends, centred. One skeleton serves
  every tab; a tab with no filter leaves the row out. It is a size
  container: under `$table-stack-width` of its own width the heading goes
  and each row is a card on the card surface, its bars stacked and its
  action across its foot, as `.data-table--stack`'s cards are; under 28rem
  the filter's shapes stack full width, as the real filter's fields do.
- **Its fill** is the muted ink 18% into the card surface, as the combobox's
  quiet fills are, so both themes carry it on the page and on a card; its
  shimmer, a band 7% into the card surface, passes across every shape every
  1.4s. No token was added: both are `color-mix`es of existing tokens, and
  no text sits on them.
- **Motion.** The skeleton fades in over 150ms as the press takes the old
  content away, and the new content fades in over 200ms as it replaces the
  skeleton (`data-arrived` on the content area, set only after a tab
  switch, so a direct request's content shows at once). The skeleton is
  shown at once rather than held back a moment, as the spinner it replaced
  was: the press has already removed the old content, so a held-back
  skeleton would leave the panel blank, which is the snap it is there to
  avoid. Under `prefers-reduced-motion: reduce` there is no shimmer and no
  fade, only the still shapes.
- **What a screen reader hears.** The shapes are `aria-hidden`. The one
  status is a visually hidden `<output>`, a status by its tag, saying the
  tab is loading, which the shapes already say to the eye.

## Stories

[`index.stories.tsx`](../../src/components/TabbedPage/index.stories.tsx),
`Admin / Tabbed Page`: the People page under the admin nav with its
Invitations tab open and Invite Admin beside the heading, as
`/admin/invitations` draws it. `Default`; `PhoneDark` and `PhoneLight` at
375px, Invite Admin across the line beneath the heading and the three
segments running past the track's end; `PhoneScrolled` at 375px, on
Privilege Changes, the last tab, so the row loads scrolled to its end with
Users cut off and shaded at the start; and `LoadingState` with
`LoadingPhoneDark` and `LoadingPhoneLight`, Users on its way: the action
and the row greyed out, the pill moved to Users in its pending look, over
its skeleton with the filter row, the rows as cards at 375px; and
`LoadingUnfiltered`, the skeleton without the filter row. Hover, focus and
the pressed look are real input, so no story holds them. The workshop's stub
router goes nowhere, so those stories provide `TabSwitchContext` above the
page, holding a tab on its way; the stub `usePathname` says which address is
open ([`workshop.md`](../workshop.md), ".ladle/"). The admin lists' own stories
(`UserList`, `AdminInvitations`, `PrivilegeLedger`, `GroupedValueList`'s
phone pair) sit in their tabbed page too, each with its tab's action.

## Testing

`tests/components/TabbedPage/index.test.tsx`, with `usePathname` mocked:
the heading inside `main` with the action beside it, neither a tab nor the
content, a link per tab at its own address in order, no tablist, the content
shown; which tab is open for a given address, its own,
one beneath it, and none for an address in no tab; a tab marked pressed
while a pointer, a touch included, is down on it, and not once it lifts or
the touch turns into a scroll. A press on another tab,
through the shared `Navigating` helper (`tests/support/navigating.tsx`),
which holds the navigation pending as Next does, leaves every tab
`aria-disabled`, the action `inert`, a status in the content area with the old content gone,
and a second press going nowhere, `aria-current` still on the open tab
and the pressed one `aria-busy`; a navigation that renders moves
`aria-current` to the pressed tab and clears the rest; a Ctrl, Cmd or Shift
press is not intercepted. Where the pill and the scroll land is layout,
which jsdom has none of, so the workshop's screenshots and measurements
show them. `tests/components/AdminNav/index.test.tsx` checks a page's nav entry
is current on each of its tabs. The page tests render each tab's slot page
beside its page, as the layout does: `tests/app/admin/value-page.test.tsx`
and `group-page.test.tsx` find the Add keeping the filter and cursor,
`(people)/users/page.test.tsx` the switch, and
`(people)/invitations/page.test.tsx` Invite Admin and its `?invite`. How
the layout keeps the heading in place and swaps the slot is Next's, and is
the e2e suite's to see.
