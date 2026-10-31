# TabbedPage

`src/components/TabbedPage/` — a page divided into tabs, each tab at its own
address: the page's `h1` with a row of links, one per tab, drawn as small
pills beside it on the same line, the open tab's action at the line's end, and
the open tab's content beneath. On the owner's call after MB.115's design review, each admin
list shares a page with the group list that organises it: the Categories page
has a Categories tab at `/admin/categories` and a Groups tab at
`/admin/category-groups`. Every admin page but the compendium is one
([`admin-nav.md`](admin-nav.md) tables them).

## Props and parts

`TabbedPageProps` (`types.ts`):

| Prop       | What it is                                                                                    |
| ---------- | --------------------------------------------------------------------------------------------- |
| `title`    | The page's `h1`, title case, which names the tabs' nav too: "Categories"                      |
| `tabs`     | Each tab's `href`, short label ("Groups", "Traditions"), `filtered` and `shape`, in row order |
| `action`   | Optional: the open tab's one action, at the end of the heading's line                         |
| `children` | The open tab's content                                                                        |

Inside, `tab-switch.tsx` holds the client parts the tab row, the action and
the content area share: `TabSwitchProvider`, `TabAction` (the action's
wrapper), `TabPanel` (the content area) and `useTabSwitch`.
`Skeleton/swap-panel.tsx` is `SwapPanel`, the keyed swap of content for skeleton that
`TabPanel` and a list's `ListBody` share. `panel-loading.tsx` is `TabPanelLoading`, a thin user of the
shared [`Skeleton`](skeleton.md) that the content area shows while a pressed tab is on its way. A tab's `filtered`, set in
`ADMIN_PAGES` on every tab whose list opens with a filter, tells it whether
to draw a filter row. A list reuses it, with no filter row, while a filter
or a pager press is on its way ([`list-frame.md`](list-frame.md)), so it
imports its own stylesheet, `index.scss`, and its shapes are drawn wherever
it renders. A tab's `shape`, `table` by default, is the skeleton's shape while that tab is on its way: the Grimoire's Spells and Drafts tabs set `cards` (M10.11), so a pressed tab shows cards under the filter rather than a table.

## Contracts

- **Every tab keeps its own address.** A tab is a link to its own route, so
  it can be bookmarked, and its `?new`, `?edit=` and cursor links keep
  working as they did when each list was a page of its own.
- **Pressing a tab does not change the page.** On the admin pages a route
  group, a folder in parentheses that adds nothing to the address (Next's
  "Route Groups"), holds the page's tabs, and its `layout.tsx` renders this
  component through `tabbedLayout(key)` (`src/app/(shell)/admin/tabbed-layout.tsx`, over
  `ADMIN_PAGES`): `src/app/(shell)/admin/(categories)/layout.tsx` is one line around `categories/` and
  `category-groups/`. A layout stays mounted while the address moves between
  its child routes, so the heading and the tab row stay put and only the
  action and the content swap.
- **The action belongs to the tab, at the end of the page's heading line** (the owner's
  call): Add Category on Categories, Add Group on its Groups tab, Add Form,
  Add Deity, Add Tradition, Add Celestial Body, Add Zodiac Sign, Pause Admin Changes
  on Users, New Invitation on Invitations, and nothing on Privilege Changes.
  The heading is drawn by `PageHeader` ([`page-header.md`](page-header.md));
  the pills and the action are handed to it together as its trailing
  children, a fragment, so the header needs no slot of its own and its API
  is unchanged. They fall in the order heading, pills, action. Each route group's layout takes the
  action from an `@action` slot, a Next parallel route
  (`node_modules/next/dist/docs/01-app/03-api-reference/03-file-conventions/parallel-routes.md`):
  `src/app/(shell)/admin/(categories)/@action/categories/page.tsx` renders Add
  Category beside `categories/page.tsx`'s list, and so on, one slot page per
  tab. A slot page is a page, so it renders on the server with the rest of a
  direct request, and Next renders it again on every client-side navigation
  that changes its address, a tab switch, `?new`, `?edit=` or a cursor
  alike, since a page segment's key carries its search parameters. Every tab
  has a slot page, Privilege Changes one that renders nothing, because on a
  client-side navigation Next keeps a slot's last page where the new address
  has none; each slot's `default.tsx` (the shared `src/app/(shell)/no-action.tsx`, which the coven's People group uses too), what Next asks for on a full load it
  cannot match, renders nothing too. A slot page calls the guard as every
  admin page does. The value and group pages' actions are `ValueAction` and
  `GroupAction`, beside `ValuePage` and `GroupPage`, reading the same
  address the same way, so the Add keeps the list's filter and cursor. Pause
  Admin Changes reads the pause through a per-request cache the Users page
  shares (`src/app/(shell)/admin/(people)/pause-state.ts`), so it is read once.
  New Invitation is a link to `?invite`, which opens its form over the list
  ([`admin-invitations.md`](admin-invitations.md)).
- **A direct request renders the whole page on the server** (the owner's
  call): a typed address, a bookmark, a refresh or a link from outside the
  tabs gets the heading, the tabs and the tab's content in the first
  response, with no loading state streamed ahead of them. So the route
  groups have no `loading.tsx`, and the tabbed pages add no other
  `<Suspense>` boundary (the argument is in [`../loading.md`](../loading.md)).
- **A pressed tab greys the row and shows the loading state** (the owner's
  call). A plain left click on a tab other than the open one is the tab
  row's own: `tab-links.tsx` stops the browser following the link and
  navigates through `usePendingNavigation` (`src/lib/navigation/`), which
  runs `router.push` inside a React transition the row and the content area
  share, and puts up the page bar as well. Next runs its navigation inside the
  caller's transition, so it stays pending until the new tab has rendered. Until
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
  returns to the open tab. A filter and the pager hold their own list's page
  the same way ([`list-frame.md`](list-frame.md)).
- **Only a plain press is the row's.** A Ctrl, Cmd, Shift or Alt click and a
  middle click keep the browser's behaviour, a new tab or window, by the
  pager's rule (`opensElsewhere`, `src/lib/opens-elsewhere.ts`). The open
  tab is left to Next's link and shows no loading state. Without JavaScript
  each tab is a plain link.
- **The group's layout reads nothing.** No session, no guard, no data: it
  draws only the heading and the tabs, both from `ADMIN_PAGES`
  (`src/components/AdminNav/sections.ts`). A layout does not re-run on a
  tab press, so a guard there would add nothing; the guard stays in
  `src/app/(shell)/admin/layout.tsx` and every page
  ([`auth/admin-guard.md`](../auth/admin-guard.md)).
- **A filter and the pager show the same loading state, within the tab**
  (the owner's call at MB.115's review). Each list's
  [`ListFrame`](list-frame.md) puts this skeleton, without its filter row,
  in place of the list under the filter, and greys the filter row as this
  greys the tab row, `aria-busy` on it and its controls `aria-disabled`;
  the tab row stays live. A modal's `?edit=` or `?new` link navigates
  within the tab with neither, so the list stays in place behind it; the
  modal shows its own skeleton ([`modal.md`](modal.md), "Opening at once").
- **A nav of links, not a `role="tablist"`.** Each tab navigates to another
  address. A tablist promises arrow-key movement between panels shown in
  place, which these are not. The row is a `nav` named by the page's title,
  and the open tab's link carries `aria-current="page"`, found from the
  address by `usePathname()` with the admin nav's rule (`isAtPath` in
  `src/lib/at-path.ts`): the tab's own address or one beneath it, and of
  those the most specific, the longest address. The grimoire's Drafts tab lies
  beneath Spells' address, so on Drafts both are at it, and Drafts is the open one
  (M10.11). It looks like a small group of pills, and is still a nav: a
  look does not change what pressing a tab does. So `tab-links.tsx` is the
  one client part; the rest renders on the server.
- **Each tab names itself in its `page.tsx` `metadata.title`** ("Category Groups"); `src/app/(shell)/admin/layout.tsx`
  sets `title.template`, so the tab shows "Category Groups — Admin — Sorrel & Salt".

## Styling

`index.scss`, imported by `index.tsx`.

- **The heading line** is the `.page-header` primitive
  ([`styling.md`](../styling.md), "Buttons"): the heading, then the pills,
  then the action pushed to the end by an auto margin. The pills are centred on
  the line and not brought down to the heading's letters as an action is. At
  the page header's narrow width (28rem of its own, `$narrow-column`; how the
  action then sits is [`page-header.md`](page-header.md#styling)) the
  pills drop under the heading at the same size, not stretched to the line as
  an action is: the selector is doubled to outweigh the primitive's narrow
  rules. When the header holds the Add, a plus on the heading's line from
  `$tabbed-plus-width` down, the pills stay on the line beside it until
  `$tabbed-reflow-width`, a separate threshold (the owner's call, so the two
  are set apart), where the heading takes the line less the plus and the
  pills are `order`ed after it so they drop beneath. Between `$tabbed-reflow-width` and `$tabbed-plus-width` (536px to 680px) the heading yields first: its basis is zero, so a long heading wraps its own words rather than sending the plus to a line of its own. The plus has a floor, `$add-below-width` (350px of the header's own width): at or under it the Add is a labelled button again, beneath the heading at its natural width, with the pills on a line of their own below it. The action's wrapper, `.tabbed-page__action`, is taken out of the
  line when a tab has none. Any other action, the pause's row or a locked control, keeps the heading's line at its end, and from `$tabbed-reflow-width-labelled` (700px of the header's own width) down the pills drop beneath the two at their own size, a line break forced by a pseudo-element since a flex box cannot otherwise give an item a line of its own at its own width (the pills themselves take back one row gap with a negative top margin, because the empty line the break makes would otherwise be paid a gap above and below it, so the pills sit one gap under the heading in every band); the two keep the line through the forms' column (the heading gives up the line the primitive hands it there) until `$tabbed-action-below-width` (400px of the header's own width), where the action goes beneath the heading at its natural width and the line's start, the wrapper's auto margin cancelled. This reverses MB.115's spanning action (the owner's calls at MB.7's review, 2026-10-12). The header sits `space(5)` above the
  content.
- **The pills** (MB.7, drawn in its design review; they were a larger
  segmented control until then): one rounded track, `2.25rem` tall, in the
  faint grey wash (`$segment-track`, the muted ink 10% over what is behind, fainter than
  `$fill-quiet`'s 18%) edged by a `$hairline`; the owner tried the green highlight there and found it too close to the open pill (2026-10-20), with `0.125rem` of padding round the pills; each pill the caption
  size at weight 500 with `space(3)` either side of its label, in the muted
  ink, turning to the body ink on hover; the open tab a pill, the accent 18%
  into the card, edged 1px in the accent, its label in the body ink. The
  fill alone sits under WCAG 1.4.11's 3:1 against the track, so the edge
  carries it. The pill's and the track's mixes are local to the stylesheet;
  `tests/scss/tokens.test.ts` holds the open label and edge, and the muted
  labels on the track, to their floors in both themes. The pill has no shadow
  now. The row clears the list's marker, indent and item margins itself.
- **Each pill's hit area is a control tall.** The pill is smaller than
  `$control-height` (2.78rem), so a transparent `::before` pads each link
  back to it, above and below. The row inside the track is itself a control
  tall, centred on the track and overflowing it equally, and its scrollport is
  where that padding lives: a scrolling box clips whatever sticks out of it,
  so the padding has to sit inside the row rather than outside the track. A
  press in the strip above or below a pill therefore counts as a press on it.
- **The pill slides.** It is one element beneath the links, placed by
  `tab-links.tsx` under the open tab, or the pressed one while it is on
  its way, and sliding there over 250ms; under `prefers-reduced-motion:
reduce` it jumps. The server draws the pill on the open link itself, so it
  is there before the script runs and without it; once the sliding pill is
  placed, the row's `data-sliding` hands the drawing over. Not a View
  Transition: Next's (`node_modules/next/dist/docs/01-app/02-guides/view-transitions.md`)
  rides on an experimental flag and animates whole-page snapshots, and a
  tab press should move one pill.
- **Keyboard focus** is the accent ring, drawn 2px inside the pill rather
  than round it, where the track would clip it: at the shared ring's 66.6%
  in the dark theme, and at full strength in the light, where any fade takes
  it under 3:1 on the track and the open pill (2.75 even at 75%;
  [`styling.md`](../styling.md), "The focus ring").
- **Pressed**, for as long as a pointer is down on a pill, the pill's fill
  comes under its label at once and the pill sinks a pixel, so a press
  answers before the pill slides over. A tap marks it too, through
  `pressFeedback` (`src/lib/press-feedback.ts`; [`styling.md`](../styling.md),
  "Buttons"), since a phone applies `:active` late or not at all. A disabled
  pill shows no pressed look.
- **A row too long for its line scrolls.** A pill keeps its label on one line
  at every width, and a row longer than its line scrolls sideways inside the
  track rather than wrapping or squeezing: the track's rounded edge stays put
  and clips the pills, and the page never scrolls sideways. People's three
  tabs need about 290px and fit at 375, so this is a safeguard. The
  scrollbar is hidden, since it would cross the pill's foot inside a track
  this thin; the label cut off at the edge says there is more. (The earlier
  design also drew a shade at an edge with more to scroll to; the shorter
  track dropped it.) When the page loads, and when the pill moves,
  `tab-links.tsx` centres its tab in the track by setting the track's
  `scrollLeft`, never `scrollIntoView()`, which would scroll the page too, and
  again when the web font arrives or the track changes width. A keyboard focus
  moving along the row is scrolled into view by the browser, clear of the edge
  by `scroll-padding-inline`.
- **A tab while one is on its way** takes the muted, faded look of a
  disabled control ([`styling.md`](../styling.md), "Disabled is dashed and
  faded"): the muted ink at 55% and the not-allowed cursor, hover changing
  nothing. The pill, on the pressed tab by then, fades with them, its
  colour taken out (`grayscale`), so it reads as on its way rather than
  arrived; its edge then falls under 3:1 against the track in the light
  theme, while every tab is disabled. The action beside the heading fades to 55% with them and
  loses its colour, so a solid button greys as the tabs do.
- **The content** is a column `space(5)` apart, as `.list-frame` spaces a
  list's.
- **The loading state is a skeleton** of the list it stands in for, on the
  owner's call, so the page does not snap from one tab to the next: where
  the pressed tab has a filter, a filter row of the search box and a narrower
  select, edge to edge as the real row is and with no button, since the real row
  has none (MB.115), and no Add, which sits beside the heading;
  then a table's heading over the muted hairline and six rows, every second
  one banded on the card surface as the admin tables are, their bars of
  uneven lengths; then the pager's two ends, centred. One skeleton serves
  every tab, and every list's filter and pager press; a tab with no filter,
  and a list whose filter row stays, leave the row out. It is a size
  container: under `$table-stack-width` of its own width the heading goes
  and each row is a card on the card surface, its bars stacked and its
  action across its foot, as `.data-table--stack`'s cards are; under 28rem
  the filter's shapes stack full width, as the real filter's fields do.
- **Its fill** is the muted ink 18% into the card surface, as the combobox's
  quiet fills are, so both themes carry it on the page and on a card; its
  shimmer, a band 7% into the card surface, passes across every shape every
  `$shimmer-duration` (1.4s). The shapes, fill and shimmer now live in the
  shared [`Skeleton`](skeleton.md) (`Skeleton/index.scss`): the fill is the
  `$fill-quiet` token; the shimmer is the shared `skeleton-shape` mixin
  (`src/scss/_mixins.scss`, keyframes `skeleton-shimmer` in
  `_primitives.scss`), which takes its motion from `loading-motion`; a
  `color-mix` of existing tokens, and no text sits on either. The filter's
  bars and the pager's stand at `$control-height`, and the filter's fields
  at `$filter-choice-width`, so the skeleton is as tall and wide as the
  controls that replace it.
- **Motion.** The skeleton fades in over 150ms as the press takes the old
  content away, and the new content fades in over 200ms as it replaces the
  skeleton (`data-arrived` on the content area, set only after a tab
  switch, so a direct request's content shows at once). The skeleton is
  shown at once rather than held back a moment, as the spinner it replaced
  was: the press has already removed the old content, so a held-back
  skeleton would leave the panel blank, which is the snap it is there to
  avoid. Under `prefers-reduced-motion: reduce` the shimmer becomes the
  loading standard's one slow opacity pulse, never still shapes
  ([`../loading.md`](../loading.md)).
- **What a screen reader hears.** The shapes are `aria-hidden`. The one
  status is a visually hidden `<output>`, a status by its tag, saying the
  tab is loading, which the shapes already say to the eye.

## Stories

[`index.stories.tsx`](../../src/components/TabbedPage/index.stories.tsx),
`Layout / Tabbed Page`: the People page in the admin layout's frame, the nav in
its context row above, with its Invitations tab open and the pills beside the heading, New Invitation at the
end of the line, as `/admin/invitations` draws it. `States`, with a control that chooses Invitations Tab; Privilege Changes Tab, on Privilege Changes, the last
tab, with no action; Add Action Label And Plus; Single Tab; and Loading A Filtered Tab, Users on its way: the action and the row greyed out, the
pill moved to Users in its pending look, over its skeleton with the filter row; and Loading An Unfiltered Tab, the skeleton without the
filter row. `AddActionAt600`, `AddActionAt382`, `LoadingAt375` and `PrivilegeChangesAt375` are pinned to a width. Hover, focus and the pressed look are real input, so no story
holds them. The workshop's stub router goes nowhere, so those stories provide
`TabSwitchContext` above the page, holding a tab on its way; the stub
`usePathname` says which address is open ([`workshop.md`](../workshop.md),
".storybook/"). The admin lists' own stories (`UserList`, `AdminInvitations`,
`PrivilegeLedger`, `GroupedValueList`'s phone pair) sit in their tabbed page
too, each with its tab's action.

## Testing

`tests/components/TabbedPage/index.test.tsx`, with `usePathname` mocked:
the heading inside `main` with the action beside it, neither a tab nor the
content, the tabs on the heading's line between the two, a link per tab at its own address in order, no tablist, the content
shown; which tab is open for a given address, its own,
one beneath it, and none for an address in no tab; the most specific tab when one lies beneath another; a tab marked pressed
while a pointer, a touch included, is down on it, and not once it lifts or
the touch turns into a scroll. A press on another tab,
through the shared `Navigating` helper (`tests/support/navigating.tsx`),
which holds the navigation pending as Next does, leaves every tab
`aria-disabled`, the action `inert`, a status in the content area with the old content gone,
and a second press going nowhere, `aria-current` still on the open tab
and the pressed one `aria-busy`; a navigation that renders moves
`aria-current` to the pressed tab and clears the rest; a Ctrl, Cmd or Shift
press is not intercepted. Where the pill and the scroll land is layout,
which happy-dom has none of, so the workshop's screenshots and measurements
show them. `tests/components/AdminNav/index.test.tsx` checks a page's nav entry
is current on each of its tabs. The page tests render each tab's slot page
beside its page, as the layout does: `tests/app/(shell)/admin/value-page.test.tsx`
and `group-page.test.tsx` find the Add keeping the filter and cursor,
`(people)/users/page.test.tsx` the switch, and
`(people)/invitations/page.test.tsx` New Invitation and its `?invite`. How
the layout keeps the heading in place and swaps the slot is Next's, and is
the e2e suite's to see.

With a single route the pill navigation is left out (MB.106's extra item): one pill to "navigate" between is noise. The heading and the tab's content still render.

## What a tabbed page is

A page in tabs is its heading with a row of links, one per tab, beside it on the same line, the open tab's action at the line's end, and the open tab's content beneath. Each tab is at its own address, so it can be bookmarked and its `?edit=` and cursor links keep working. A route group's shared layout renders this, so pressing a tab swaps only the action and the content. The action is the group's `@action` slot, so it changes with the tab (Add Category, New Invitation, Pause Admin Changes). A tab with none leaves the wrapper empty, and the stylesheet takes an empty item out of the line.

The row is a `nav` named for the page, not a `role="tablist"`. Each tab is a navigation to another address, not a panel shown in place, and a tablist promises arrow keys it would not have. A page with a single tab (a member who cannot invite sees only Members) draws no row. The row rides in `PageHeader`'s trailing children with the action, a fragment spreading into the header's flex row in the order heading, tabs, action, so the header needs no slot of its own for it.

There is no client directive on the page. The links, which must know which tab is open, and the switch they share with the action and the panel are the client parts, and the action and the content pass through them from the server. The open tab is the longest matching address: the grimoire's Drafts lies beneath Spells, so on Drafts both match, and the first would mark Spells.

`filtered` on a tab says its list opens with a filter, so its loading skeleton draws a filter row above the table. `cards` is for the grimoire's tabs. `sections` is for the account's tabs, whose content is a jump menu beside stacked panels rather than a list: the skeleton draws the menu and `sections` panels (3 on Account, 4 on Sign-In) in the page's own `.page-with-nav` grid, with no head of its own, as the heading above stays put.

## Pressing a tab

Pressing another tab runs its navigation through the tab switch, which greys the row and shows the panel's loading state until the tab has rendered, as the pager's soft ends do. A Ctrl, Cmd or Shift click and a middle click keep the browser's own behaviour, and without JavaScript each tab is a plain link. The open tab is left to Link, so pressing it again shows no loading state.

The switch holds the pressed tab by a transition rather than a route group's `loading.tsx`, so a direct request renders the whole page on the server with nothing streamed ahead of it. The navigation runs inside the transition, so `pending` stays true until Next has rendered the new tab. A provider already above, the workshop's, is kept rather than shadowed, and the context is exported so the workshop, whose stub router goes nowhere, can draw a tab on its way.

While a tab is on its way every tab is `aria-disabled` and a press does nothing. The row is `aria-busy` rather than the panel, whose status a screen reader should hear as it arrives and not hold back, and so is the pressed tab. `aria-current` stays on the tab that is open until the new tab renders, since it names the page shown, not the press. The open tab's action is greyed out and `inert`, so it can be neither pressed nor focused until the new tab's action replaces it. It is faded with the tabs and its colour taken out, so a solid button greys as they do.

The panel while a tab is on its way shows the shared `Skeleton` of the list it stands in for, in place of the old tab's content, beneath the heading and tabs, which stay where they are. That is the filter row where the tab has one, a table's heading and six rows, and the pager, or the grid of cards. A list's body draws it too, without the tabs (ListFrame). The new tab's content fades in as it replaces the skeleton rather than snapping in. Content the server drew, before any tab was pressed, has no `data-arrived` and shows at once. The panel shows any notice, then the list, a `space(5)` apart, as `.list-frame` spaces a list's.

## The sliding pill

The pill that marks a tab is one element sliding beneath the links: on the open tab, and from a press on the pressed one, in its pending look, so it reads as on its way rather than arrived. Should the navigation fail it slides back. The server draws the pill on the open link itself (the stylesheet), so it is there before the script runs and without it. Once the sliding pill is placed, the row's `data-sliding` hands the drawing over to it.

It is placed before the slide is switched on, so the first placing does not slide in from the row's start; reading a size settles it first. It is placed again whenever its tab or the track changes size: the web font arriving after the first paint widens every label, and a phone turned on its side widens the track. It slides from tab to tab with its width easing to the new one's, and under reduced motion it jumps. It is shown by `inherit`, not `visible`: a page held hidden under a navigation's skeleton (SkeletonFade, `.skeleton-held`) hides it by inheritance, and `visible` showed the pill through the skeleton.

A row too wide for its column scrolls sideways inside its track. When the page loads and when the pill moves, its tab is centred in the track, so it is in view with a neighbour either side. The track's own `scrollLeft` is set rather than `scrollIntoView()` called, which would scroll the page too. A focus moving along the row is the browser's to scroll into view.

## The track and the pills

The track is a faint grey wash edged by a hairline, fainter than `$fill-quiet` so the green pill stands apart from it (a green track sat too close to the pill). The open tab is a pill inside it: the accent thinned into the card and edged in the accent itself, since the fill alone sits under WCAG 1.4.11's 3:1 against the track. The others are plain muted text. The pill's and the track's mixes are this row's alone, so local rather than tokens. The track spends a 1px edge and 0.125rem of air on each side, as its own padding, so the row inside carries none.

The row is a list, not bulleted: `typography-base`'s ◆ marker, indent and item margins are cleared, and since that mixin positions every list item for its marker, the items are set to stand clear of the track the links measure from. The pills keep to one line at their own widths at every width. A row wider than its line scrolls inside the track rather than wrapping or squeezing, with no scrollbar, which would cross the open pill's foot inside a track this thin. The label cut off at the track's edge says there is more. The row is positioned so the pill and the links measure their place from it, and its scroll padding clears the edge when a keyboard focus or the open tab scrolls into view.

A pill is 2.25rem less the track's edge and air, in the caption size, its label on one line. The row is smaller than a control, so each pill's hit area is padded back to `$control-height` by a transparent box above and below it. The row is a control tall, centred on the track and overflowing it by the same amount above and below, and its scrollport is what the hit area fills. A scrolling box clips whatever sticks out of it, so the hit area has to be inside the row, not outside it.

Pressed, for as long as the pointer is down (`src/lib/press-feedback.ts` marks a tap, which `:active` alone misses on a phone), the pill's fill shows under the label at once and the segment sinks a pixel, flat, so a press answers before the pill slides over. A tab that is on its way or waiting for one takes no press. The focus ring is inside the pill rather than round it, where the track would clip it, at the accent's own strength per theme: the shared fade in dark, full in light, where even 75% falls to 2.75:1 on the track.

While a tab is on its way every tab takes the muted, faded look a disabled control has, without a button's edge to dash, and hover changes nothing. The pill, on the pressed tab by then, fades with them with its colour taken out. `tab-links.tsx` ignores a press meanwhile.

## The header at narrow widths

The primitives' `.page-header` spreads its children to the two ends and nudges every non-heading item down to the heading's baseline. Here the heading is followed by its tabs, only the action is pushed to the end, and the tabs are centred on the line. The selector is doubled to outweigh the primitives' narrow-width rules, which would stretch the row across its line as they do an action. A row at a phone's width drops under the heading at its own size instead. The track sits 0.125rem lower than the nudge's cancelling, where it was found level with the heading's text, and it shrinks below its pills' width rather than overflow the line, so the row inside scrolls.

Under the forms' column `.page-header` puts an action on a line of its own beneath the heading, at its natural width and the line's start, as any action is (reversing the earlier spanning one). The wrapper's `margin-inline-start: auto` is for the wide line only. The Add is the exception, a plus beside the heading: the heading's line is then the heading and the action, so the pills, which come first in the markup, are ordered after them and drop beneath. In the plus band the heading yields first: a zero basis keeps the pills and the plus on its line, and a long heading wraps its own words rather than sending the plus to a line of its own.

From `$tabbed-reflow-width-labelled` down the wide line is too short for the heading, the pills and an action, so an action that is not the Add takes a line of its own at the line's start rather than wrapping to the line's end (it was found pushed right at 500px). The Add keeps its place at the heading's end.

A header whose action keeps its label (People's Pause Admin Changes) works differently from the same width down: the heading and the action keep the line and the pills drop beneath at their own size. A flex box cannot put an item on a line of its own at its own width, so a line break is forced by a pseudo-element the width of the line and no height, ordered between the action and the pills. The line it makes would take a row gap above and below (a flex line is never shorter than nothing), so the pills give one back. Under the forms' column the primitive gives the heading the line to itself; a tabbed page with a labelled action keeps the two on one line down to `$tabbed-action-below-width`, where the action goes beneath the heading at the line's start, the auto margin cancelled.

From `$tabbed-reflow-width` down the pills drop beneath the heading and its plus: the heading takes the line less the plus, and the pills, first in the markup, are ordered after the action. This is apart from the plus's own switch at `$tabbed-plus-width`, on purpose. At `$add-below-width` and under, the Add is the labelled button again and goes beneath the heading, which has the line to itself (the reflow rule gave it the line less the plus), and the pills follow. The labelled Add and the pills would share a line, so the same forced break as under a labelled action keeps the pills on their own, and the pills give back the row gap it takes twice.
