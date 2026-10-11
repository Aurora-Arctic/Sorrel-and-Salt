# TabbedPage

`src/components/TabbedPage/` — a page divided into tabs, each tab at its own
address: the page's `h1`, a row of links, one per tab, and the open tab's
content beneath. On the owner's call after MB.115's design review, each admin
list shares a page with the group list that organises it: the Categories page
has a Categories tab at `/admin/categories` and a Groups tab at
`/admin/category-groups`. Every admin page but the compendium is one
([`admin-nav.md`](admin-nav.md) tables them).

## Props and parts

`TabbedPageProps` (`types.ts`):

| Prop       | What it is                                                               |
| ---------- | ------------------------------------------------------------------------ |
| `title`    | The page's `h1`, title case, which names the tabs' nav too: "Categories" |
| `tabs`     | Each tab's `href` and short label ("Groups", "Traditions"), in row order |
| `children` | The open tab's content, or its loading state                             |

Two more parts are exported beside it:

- **`TabActions`** — the open tab's own action, at the end of the line above
  its content: Add Category, Add Group, Invite Admin, Pause Admin Changes.
- **`TabPanelLoading`** — what the content area shows while a tab loads.

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
  content beneath swaps. The group's `loading.tsx` renders `TabPanelLoading`
  in the content area while the pressed tab's page reads, and Next fetches
  that loading state ahead of time, so it shows at once.
- **The group's layout reads nothing.** No session, no guard, no data: it
  draws only the heading and the tabs, both from `ADMIN_PAGES`
  (`src/components/AdminNav/sections.ts`). A layout that awaited the session
  would hold every tab press until it had, instead of showing the loading
  state (Next's `loading.js` reference, "Good to know"). The guard stays in
  `src/app/admin/layout.tsx` and every page
  ([`auth/admin-guard.md`](../auth/admin-guard.md)).
- **Search parameters do not show the loading state.** Next keys the content
  by its route without the query string, so a filter, a pager press or a
  modal's `?edit=` keeps the list in place while the new one reads, as
  before; only a different tab, a different route, swaps in the loading
  state.
- **A nav of links, not a `role="tablist"`.** Each tab navigates to another
  address. A tablist promises arrow-key movement between panels shown in
  place, which these are not. The row is a `nav` named by the page's title,
  and the open tab's link carries `aria-current="page"`, found from the
  address by `usePathname()` with the admin nav's rule (`isAtPath` in
  `src/lib/at-path.ts`): the tab's own address or one beneath it. So
  `tab-links.tsx` is the one client part; the rest renders on the server.
- **The pressed tab shows it is on its way.** Next's `useLinkStatus` reports
  a link pressed whose address has not moved yet, which happens when its
  loading state was not fetched ahead (on a slow network, or in `next dev`,
  which fetches nothing ahead). The tab then shows the buttons' spinner after
  its label until the address moves; once it has, the tab is marked open and
  the loading state takes over.
- **Each tab keeps its own `metadata` title**, set in its `page.tsx`:
  "Category Groups — Admin — Sorrel & Salt" on the Groups tab.
- **The action belongs to the tab, not the heading**, since it changes from
  tab to tab and the heading does not. A tab with no action, Privilege
  Changes, has no `TabActions`.

## Styling

`index.scss`, imported by `index.tsx`.

- **The heading** sits `space(4)` above the tab row, which sits `space(5)`
  above the content.
- **The tab row** is the `.link-row` primitive
  ([`styling.md`](../styling.md), "Link rows and provider marks"), so the open
  tab is drawn as the admin nav's current page is: weight 500 and the
  `$rule-heavy` underline set below the letters. A 1px rule in the muted ink
  runs beneath the row, `space(2)` below the labels, setting it off from the
  content. At a phone's width the row wraps as any `.link-row` does.
- **The pending spinner** is the `.spinner` primitive at 0.75em, positioned
  after the label in the gap before the next tab, out of the flow, so no
  label moves while it shows.
- **The content** is a column `space(5)` apart, as `.list-frame` spaces a
  list's.
- **`TabActions`** is a wrapping row at the end of the line, and a size
  container, as `.page-header` is: under 28rem of its own width, inside
  `.admin-layout`, its action spans the line, the owner's call for an admin
  page's primary action at a phone's width.
- **The loading state** is the muted ink with the buttons' spinner. It fades
  in after 150ms, so a tab that loads quickly never flashes it. It fades by
  opacity rather than `visibility`, so a screen reader still hears the
  status as it arrives. It is an `<output>`, a status by its tag.

## Stories

[`index.stories.tsx`](../../src/components/TabbedPage/index.stories.tsx),
`Admin / Tabbed Page`: the People page under the admin nav with its
Invitations tab open, as `/admin/invitations` draws it. `Default`;
`PhoneDark` and `PhoneLight` at 375px; `LoadingState` with
`LoadingPhoneDark` and `LoadingPhoneLight`, the content area showing its
loading state; and `TabPending`, Privilege Changes pressed with its spinner.
The workshop's stubs say which address is open and which link is pending
([`workshop.md`](../workshop.md), ".ladle/"). The admin lists' own stories
(`UserList`, `AdminInvitations`, `PrivilegeLedger`, `GroupedValueList`'s
phone pair) sit in their tabbed page too.

## Testing

`tests/components/TabbedPage/index.test.tsx`, with `usePathname` mocked:
the heading inside `main`, a link per tab at its own address in order, no
tablist, the content shown; which tab is open for a given address, its own,
one beneath it, and none for an address in no tab; and the loading state a
status. `tests/components/AdminNav/index.test.tsx` checks a page's nav entry
is current on each of its tabs. How the layout keeps the heading in place is
Next's, and is the e2e suite's to see.
