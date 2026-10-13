# AdminNav

`src/components/AdminNav/` — the `/admin` layout's nav, a `<nav>` labelled
"Admin" linking every admin page, in two sections, in the context row beside
the word Admin and, on a phone, along the foot of the window. A thin wrapper:
the tabs, the bar and the More button are [`SectionNav`](section-nav.md)'s. The same sections are the
`/admin` index's table of contents, which this component also draws
(`AdminContents`, "The index", below). Every page but the compendium is in
tabs, each tab at its own address, and the nav links a page at its first tab
([`tabbed-page.md`](tabbed-page.md)):

| Section    | Page       | Tabs: label and route                                                                                  | Built by             |
| ---------- | ---------- | ------------------------------------------------------------------------------------------------------ | -------------------- |
| Compendium | Compendium | none: `/admin/compendium`                                                                              | M5.5                 |
|            | Categories | Categories `/admin/categories` · Groups `/admin/category-groups`                                       | M5.6, M5.6b          |
|            | Forms      | Forms `/admin/forms` · Groups `/admin/form-groups`                                                     | M5.6a, M5.6b         |
|            | Deities    | Deities `/admin/deities` · Traditions `/admin/deity-traditions`                                        | MB.132               |
|            | Astrology  | Celestial Bodies `/admin/celestial-bodies` · Zodiac Signs `/admin/zodiac-signs`                        | MB.95                |
| People     | People     | Users `/admin/users` · Invitations `/admin/invitations` · Privilege Changes `/admin/privilege-changes` | MB.52, MB.70, MB.200 |

It takes no props. The list is in `sections.ts`: `ADMIN_PAGES`, each page
a label, its icon (`SectionNav/icons.tsx`), the one line the index says about it and its tabs, each a route and
a short label; and `ADMIN_SECTIONS`, each section a name and its pages.
Each tabbed page's layout reads its tabs from `ADMIN_PAGES` too, and a vocabulary's tabs take their address and label from its kind table (`GroupList/kinds.ts`, `GroupedValueList/kinds.ts`). `index.tsx`
turns the sections into `SectionNav` items (a page at its first tab, its other
tabs as `matches`, the first page of each later section `apart`) and stays a
server component; the links are `SectionNav`'s one client part.
`src/app/(shell)/admin/layout.tsx` renders the nav above the page, after the guard
has passed, so it appears for admins only
([`auth/admin-guard.md`](../auth/admin-guard.md), "The admin guard"). The
site-wide nav's own Admin entry is AppShell's (MB.7), and is shown to admins
only too.

## Contracts

- **The sections are the admin area's table of contents.** A task that adds
  an admin page, or a tab to one, adds it to `sections.ts` and its row here
  in its own PR, and the nav, the index and the page's tabs all gain it. A
  list shares a page with the group list that organises it, a tab each:
  Categories with their groups, Forms with theirs, Deities with their
  traditions (M5.6b, MB.132;
  [`design-decisions/m5.6b-admin-groups.md`](../design-decisions/m5.6b-admin-groups.md)).
  Celestial Bodies and Zodiac Signs share Astrology; Users, the admin invitations and
  the privilege ledger, the history of what was done to them (MB.200), share
  People. Two sections, Compendium and People. The grouping and the tabs are
  the owner's, at MB.115's design review.
- **`<Link>`, now that every route exists.** `typedRoutes` refuses an `href`
  for a route the build does not contain, so the list was plain anchors until
  each of its pages had landed. M5.6b's two group pages were the last, and
  it switched the list to `<Link>`. A soft navigation does not re-run the
  layout, so the layout's guard does not run on a click either, which is why
  every page under `/admin` runs the guard itself.
- **The page you are on is marked.** Its link carries `aria-current="page"`,
  which a screen reader announces, and no other link does. A page is current
  on any of its tabs, so Categories is current on `/admin/category-groups`,
  and on any address beneath one (`isAtPath` in `src/lib/at-path.ts`:
  `pathname === href`, or `pathname` starting with `href` and a slash), so
  the slash keeps a page whose path merely begins with another's letters
  from marking it. `/admin` itself, the index, is in no section and marks
  none. `usePathname()` reads the address, which is why the links are a
  client component (MB.115).
- **Six tabs, then More, then a bar** (MB.7, the owner's call at the
  navigation review, over the earlier wrapping row and `<details>` jump
  menu). Wider than a tablet all six pages are tabs along the context row,
  a hairline between Astrology and People, which is the Compendium/People
  grouping surviving. At or under 48rem the first four (Compendium,
  Categories, Forms, Deities) stay and Astrology and People go behind More;
  at or under 40rem the nav is the bottom bar with the same four and More.
  When the current page is behind More, More shows its icon and label. The
  mechanics, and why nothing is read twice, are
  [`section-nav.md`](section-nav.md)'s.

## The index

`AdminContents`, exported beside the nav, is the `/admin` index's table of
contents (MB.115, the owner's call): a `section` per entry of
`ADMIN_SECTIONS`, each with its name as an `h2` and a list of its pages, each
page a link to its first tab with its one line beneath it, which is the link's
`aria-describedby` too. It reads the nav's own constant, so the index and
the nav cannot list different pages. `src/app/(shell)/admin/page.tsx` renders it
under the heading and a lede, a `<p class="lede">` saying what the area is
for; `tests/e2e/admin.spec.ts` measures that paragraph against the reading
measure, so the lede stays a `<p>` in `main`.

## Styling

The directory has no stylesheet of its own: the nav's styling is
[`section-nav.md`](section-nav.md), "Styling", and the index's table of
contents is the `.admin-contents` primitive in `_primitives.scss`, moved there
when the coven index became its second user (MB.119), since a route loads a
component's stylesheet only when it draws the component.

- **The index** lists each section's pages in a column without bullets, a
  link over its line in the muted ink, the line capped at `$measure`, since
  it is not a `<p>`.

The nav sits in the layout's context row, led by "Admin", above the page's
frame, the `.admin-layout` primitive (`styling.md`, "The admin layout").

## Stories

[`index.stories.tsx`](../../src/components/AdminNav/index.stories.tsx),
`Admin / Admin Nav`: `Default`, the row; `Phone` at 375px, the bottom bar; and
`IndexPage` with `IndexPagePhone`, the `/admin` index under the nav, its
heading and lede copied from the page and `AdminContents` real. Each sits in
the admin layout as it is, through the workshop's `AdminFrame`
([`workshop.md`](../workshop.md), ".ladle/"): the context row led by "Admin"
with the nav in it, above the `.admin-layout` column that holds the page. The
tablet and More shapes are [`SectionNav`](section-nav.md)'s stories. The
workshop's `usePathname` stub answers `/admin/users`, the People page's Users
tab, so People is current in every story. Render-only, no test ids, no
snapshots.

## Testing

`tests/components/AdminNav/index.test.tsx`, with `next/navigation`'s
`usePathname` mocked, covers every link's route in the row, in the sections'
order, inside the landmark named Admin; which link is current for a given
address: none on the index, its own on a page's first tab and on its other
tabs, and a page's on an address beneath it; and More listing the last two
pages and naming the current one when it is among them. Which tabs show at
which width is presentation, the workshop's and the browser's.
`tests/app/(shell)/admin/layout.test.tsx` checks the layout renders the nav only
once the guard resolves, and that the index links every page the nav does,
in its order. `tests/e2e/admin.spec.ts` checks that an admin sees the nav
and a non-admin's 403 page carries none of it.
