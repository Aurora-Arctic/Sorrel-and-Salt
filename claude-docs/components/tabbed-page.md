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

| Prop       | What it is                                                                           |
| ---------- | ------------------------------------------------------------------------------------ |
| `title`    | The page's `h1`, title case, which names the tabs' nav too: "Categories"             |
| `tabs`     | Each tab's `href`, short label ("Groups", "Traditions") and `filtered`, in row order |
| `action`   | Optional: the open tab's one action, at the end of the heading's line                |
| `children` | The open tab's content                                                               |

Inside, `tab-switch.tsx` holds the client parts the tab row, the action and
the content area share: `TabSwitchProvider`, `TabAction` (the action's
wrapper), `TabPanel` (the content area) and `useTabSwitch`.
`swap-panel.tsx` is `SwapPanel`, the keyed swap of content for skeleton that
`TabPanel` and a list's `ListBody` share. `panel-loading.tsx` is `TabPanelLoading`, the skeleton the content area
shows while a pressed tab is on its way. A tab's `filtered`, set in
`ADMIN_PAGES` on every tab whose list opens with a filter, tells it whether
to draw a filter row. A list reuses it, with no filter row, while a filter
or a pager press is on its way ([`list-frame.md`](list-frame.md)), so it
imports its own stylesheet, `index.scss`, and its shapes are drawn wherever
it renders.

## Contracts

- **Every tab keeps its own address.** A tab is a link to its own route, so
  it can be bookmarked, and its `?new`, `?edit=` and cursor links keep
  working as they did when each list was a page of its own.
- **Pressing a tab does not change the page.** On the admin pages a route
  group, a folder in parentheses that adds nothing to the address (Next's
  "Route Groups"), holds the page's tabs, and its `layout.tsx` renders this
  component through `tabbedLayout(key)` (`src/app/admin/tabbed-layout.tsx`, over
  `ADMIN_PAGES`): `src/app/admin/(categories)/layout.tsx` is one line around `categories/` and
  `category-groups/`. A layout stays mounted while the address moves between
  its child routes, so the heading and the tab row stay put and only the
  action and the content swap.
- **The action belongs to the tab, at the end of the page's heading line** (the owner's
  call): Add Category on Categories, Add Group on its Groups tab, Add Form,
  Add Deity, Add Tradition, Add Celestial Body, Add Zodiac Sign, Pause Admin Changes
  on Users, Invite Admin on Invitations, and nothing on Privilege Changes.
  The heading is drawn by `PageHeader` ([`page-header.md`](page-header.md));
  the pills and the action are handed to it together as its trailing
  children, a fragment, so the header needs no slot of its own and its API
  is unchanged. They fall in the order heading, pills, action. Each route group's layout takes the
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
  has none; each slot's `default.tsx` (the shared `no-action.tsx`), what Next asks for on a full load it
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
  `src/app/admin/layout.tsx` and every page
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
  `src/lib/at-path.ts`): the tab's own address or one beneath it, the
  first such tab. It looks like a small group of pills, and is still a nav: a
  look does not change what pressing a tab does. So `tab-links.tsx` is the
  one client part; the rest renders on the server.
- **Each tab names itself in its `page.tsx` `metadata.title`** ("Category Groups"); `src/app/admin/layout.tsx`
  sets `title.template`, so the tab shows "Category Groups — Admin — Sorrel & Salt".

## Styling

`index.scss`, imported by `index.tsx`.

- **The heading line** is the `.page-header` primitive
  ([`styling.md`](../styling.md), "Buttons"): the heading, then the pills,
  then the action pushed to the end by an auto margin. The pills are centred on
  the line and not brought down to the heading's letters as an action is. At
  the page header's narrow width (28rem of its own, `$narrow-column`; how the
  action then spans the line is [`page-header.md`](page-header.md#styling)) the
  pills drop under the heading at the same size, not stretched to the line as
  an action is: the selector is doubled to outweigh the primitive's narrow
  rules. The action's wrapper, `.tabbed-page__action`, is taken out of the
  line when a tab has none. An action that wraps its button, the pause's row
  or a locked control, spans its button too: the `.page-header` primitive
  makes any wrapper that is not a bare button a flex box whose children grow
  to the line, and a locked control's own button, a level deeper, does so in
  `UserList/controls.scss`, so Pause Admin Changes and a locked Invite Admin
  span the line as an Add link does. The header sits `space(5)` above the
  content.
- **The pills** (MB.7, drawn in its design review; they were a larger
  segmented control until then): one rounded track, `2.25rem` tall, in the
  quiet fill (`$fill-quiet`) edged by a `$hairline`; each pill the caption
  size at weight 500 with `space(3)` either side of its label, in the muted
  ink, turning to the body ink on hover; the open tab a pill, the accent 18%
  into the card, edged 1px in the accent, its label in the body ink. The
  fill alone sits under WCAG 1.4.11's 3:1 against the track, so the edge
  carries it. The two mixes are local to the stylesheet;
  `tests/scss/tokens.test.ts` holds the open label and edge, and the muted
  labels on the track, to their floors in both themes. The pill has no shadow
  now. The row is not the `.link-row` primitive, whose underline it does not
  draw; it clears the list's marker, indent and item margins itself.
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
  than round it, where the track would clip it.
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
  1.4s. The fill is the `$fill-quiet` token; the shimmer is the shared
  `skeleton-shape` mixin (`src/scss/_mixins.scss`, keyframes
  `skeleton-shimmer` in `_primitives.scss`; M9.18 moved it there, for the
  modal's skeleton to share), a `color-mix` of existing tokens, and no text sits on either. The filter's
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
  avoid. Under `prefers-reduced-motion: reduce` there is no shimmer and no
  fade, only the still shapes.
- **What a screen reader hears.** The shapes are `aria-hidden`. The one
  status is a visually hidden `<output>`, a status by its tag, saying the
  tab is loading, which the shapes already say to the eye.

## Stories

[`index.stories.tsx`](../../src/components/TabbedPage/index.stories.tsx),
`Admin / Tabbed Page`: the People page under the admin nav with its
Invitations tab open and the pills beside the heading, Invite Admin at the
end of the line, as `/admin/invitations` draws it. `Default`; `PhoneDark` and
`PhoneLight` at 375px, the pills under the heading and Invite Admin across the
line beneath them; `PhoneScrolled` at 375px, on Privilege Changes, the last
tab, with no action; and `LoadingState` with `LoadingPhoneDark` and
`LoadingPhoneLight`, Users on its way: the action and the row greyed out, the
pill moved to Users in its pending look, over its skeleton with the filter row,
the rows as cards at 375px; and `LoadingUnfiltered`, the skeleton without the
filter row. Hover, focus and the pressed look are real input, so no story
holds them. The workshop's stub router goes nowhere, so those stories provide
`TabSwitchContext` above the page, holding a tab on its way; the stub
`usePathname` says which address is open ([`workshop.md`](../workshop.md),
".ladle/"). The admin lists' own stories (`UserList`, `AdminInvitations`,
`PrivilegeLedger`, `GroupedValueList`'s phone pair) sit in their tabbed page
too, each with its tab's action.

## Testing

`tests/components/TabbedPage/index.test.tsx`, with `usePathname` mocked:
the heading inside `main` with the action beside it, neither a tab nor the
content, the tabs on the heading's line between the two, a link per tab at its own address in order, no tablist, the content
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
