# AdminNav

`src/components/AdminNav/` — the `/admin` layout's nav, a `<nav>` labelled
"Admin" linking every admin page, in two sections (a curator sees the first only), in the context row beside
the word Admin and, on a phone, along the foot of the window. A thin wrapper:
the tabs, the bar and the More button are [`SectionNav`](section-nav.md)'s. The same sections are the
`/admin` index's table of contents, which this component also draws
(`AdminContents`, "The index", below). Every page but the compendium is in
tabs, each tab at its own address, and the nav links a page at its first tab
([`tabbed-page.md`](tabbed-page.md)):

| Section          | Page       | Tabs: label and route                                                                                  | Built by             |
| ---------------- | ---------- | ------------------------------------------------------------------------------------------------------ | -------------------- |
| Compendium       | Compendium | none: `/admin/compendium`                                                                              | M5.5                 |
|                  | Categories | Categories `/admin/categories` · Groups `/admin/category-groups`                                       | M5.6, M5.6b          |
|                  | Forms      | Forms `/admin/forms` · Groups `/admin/form-groups`                                                     | M5.6a, M5.6b         |
|                  | Deities    | Deities `/admin/deities` · Traditions `/admin/deity-traditions`                                        | MB.132               |
|                  | Astrology  | Celestial Bodies `/admin/celestial-bodies` · Zodiac Signs `/admin/zodiac-signs`                        | MB.95                |
| People & Support | People     | Users `/admin/users` · Invitations `/admin/invitations` · Privilege Changes `/admin/privilege-changes` | MB.52, MB.70, MB.200 |
|                  | Support    | none: `/admin/support`                                                                                 |                      |

It takes one prop, `managesPeople` (M11.20): true for an admin, false for a curator, whom the People page leaves out. It is display only; the pages' guards refuse a curator whatever the nav shows ([`auth/admin-guard.md`](../auth/admin-guard.md), "The curator guard (M11.20)"). The list is in `sections.ts`: `ADMIN_PAGES`, each page
a label, its icon (`SectionNav/icons.tsx`), the one line the index says about it and its tabs, each a route and
a short label; and `ADMIN_SECTIONS`, each section a name and its pages, and People carrying `adminOnly: true`; `adminSections(managesPeople)` drops the `adminOnly` pages and any section left empty. Support follows People in the same section, so no hairline sits between them; a curator, with no People, sees Support open that section.
Each tabbed page's layout reads its tabs from `ADMIN_PAGES` too, and a vocabulary's tabs take their address and label from its kind table (`GroupList/kinds.ts`, `GroupedValueList/kinds.ts`). `index.tsx`
turns the sections into `SectionNav` items (a page at its first tab, its other
tabs as `matches`, the first page of each later section `apart`) and stays a
server component; the links are `SectionNav`'s one client part.
`src/app/(shell)/admin/layout.tsx` renders the nav above the page, after the guard
has passed, so it appears for curators and admins only, with `managesPeople` set from the session's role
([`auth/admin-guard.md`](../auth/admin-guard.md), "The curator guard (M11.20)"). The
site-wide nav's own Admin entry is AppShell's (MB.7), and is shown to curators and admins
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
  People. Two sections, Compendium and People & Support. The grouping and the tabs are
  the owner's, at MB.115's design review.
- **A link, now that every route exists.** `typedRoutes` refuses an `href`
  for a route the build does not contain, so the list was plain anchors until
  each of its pages had landed. M5.6b's two group pages were the last, and
  it switched the list to links; they are now `PendingLink`s, which wrap
  `next/link` ([`loading.md`](../loading.md)). A soft navigation does not re-run the
  layout, so the layout's guard does not run on a click either, which is why
  every page under `/admin` runs the guard itself.
- **Each link names what its page draws on the way** (M12.33). `target.ts`
  holds `adminTarget(href)`, which gives the `admin` region and the parts of the
  page that arrives, from one table keyed by the page's first-tab address: `page` for
  `/admin`, which draws its own heading; for every other page a heading row
  (`title`), its Add or other action (`action`) and its filter row (`filter`), over
  `cards` for `/admin/compendium` or a `table` for the rest. The tab row is not
  drawn: there is no tab placeholder. `index.tsx` sets it on each section from the page's first tab, and
  `AdminContents` passes the same function for its links. The `Admin` lead in
  the context row is a `PendingLink` to `/admin` that names `admin` and `page`
  directly. The `admin` region is the `/admin` layout's `SectionBody` (see
  [`section-body.md`](section-body.md)): it swaps only the page under the
  context row, so the row and this nav stay while the wait shows. Links into
  admin from elsewhere (the site bar, the account menu) keep `main`, since
  there the whole page changes. What a target does is [`loading.md`](../loading.md)'s.
- **The page you are on is marked.** Its link carries `aria-current="page"`,
  which a screen reader announces, and no other link does. A page is current
  on any of its tabs, so Categories is current on `/admin/category-groups`,
  and on any address beneath one (`isAtPath` in `src/lib/at-path.ts`:
  `pathname === href`, or `pathname` starting with `href` and a slash), so
  the slash keeps a page whose path merely begins with another's letters
  from marking it. `/admin` itself, the index, is in no section and marks
  none. `usePathname()` reads the address, which is why the links are a
  client component (MB.115).
- **The wait draws the tab row** (M12.33). The index is the `contents` shape, drawn in every route into `/admin` (the lead link, the bar and account menu links, `AdminNav`). `adminTarget` sets `tabs` for the tabbed pages (Categories, Forms, Deities, Celestial Bodies, Users) and not for the Compendium or the index.
- **A curator sees five tabs, not six** (M11.20). `AdminNav` and `AdminContents` both take `managesPeople`, so the nav and the index leave People out together. The rule below describes the admin's six.
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
- **The page is centred** in the admin area: the `/admin` page's `<main>` carries `.admin-index` (`src/scss/_primitives.scss`), a `$narrow-column` wide block with `margin-inline: auto` inside the layout's `.page-column`. The heading and the text stay left-aligned within it. A curator and an admin get the same markup; they differ only in which sections `AdminContents` draws.
- **Its links are in the body ink (`$text-primary`), followed or not**, with
  the accent on hover as every link has: the list reads as a table of
  contents, and the default link colours would make the admin and coven
  overviews differ by the browser's history.

The nav sits in the layout's context row, led by "Admin", above the page's
frame, the `.page-column` primitive (`styling.md`, "The page column").

## Stories

[`index.stories.tsx`](../../src/components/AdminNav/index.stories.tsx), `Admin / Nav`: `States` has a control that chooses People Current, Categories Current, Astrology Current, Invitations Current, Curator (no People, M11.20), Index Page (the `/admin` index under the nav, inside the app shell's bar, its heading and lede copied from the page and `AdminContents` real) and Index Page Curator. `NarrowPinned` is the row at a phone's width. Each sits in the admin layout as it is, through the workshop's `AdminFrame` ([`workshop.md`](../workshop.md), ".storybook/"): the context row led by "Admin" with the nav in it, above the `.page-column` column that holds the page. The tablet and More shapes are [`SectionNav`](section-nav.md)'s stories. Render-only, no test ids, no snapshots.

## Testing

`tests/components/AdminNav/index.test.tsx`, with `next/navigation`'s
`usePathname` mocked, covers every link's route in the row, in the sections'
order, inside the landmark named Admin; which link is current for a given
address: none on the index, its own on a page's first tab and on its other
tabs, and a page's on an address beneath it; and More listing the last two
pages and naming the current one when it is among them. A curator's nav and index leave People out (`managesPeople` false), and an admin's list it. Which tabs show at
which width is presentation, the workshop's and the browser's.
`tests/app/(shell)/admin/layout.test.tsx` checks the layout renders the nav only
once the curator guard resolves, and sets `managesPeople` by role, and that the index links every page the nav does,
in its order. `tests/e2e/admin.spec.ts` checks that an admin sees the nav, a curator sees it without People, and a non-admin's 403 page carries none of it.

## Where the nav is drawn

The `/admin` layout's nav sits in the context row beside the word Admin and, on a phone, in the bottom bar. It lists every admin page, in the sections the `/admin` index's table of contents shows too. It renders only inside the guarded layout, so only a curator or an admin sees it, and People only an admin. A page is linked at its first tab and is current on any of its tabs. The first page of each section after the first starts a group, which the row sets apart by a hairline.

## One list of pages

`sections.ts` holds every admin page, its tabs and its section. The nav, the `/admin` index and each tabbed page's layout all read it, so the three cannot drift. A list shares its page with the group list that organises it, a tab each, as Category Groups organise Categories. A vocabulary's tab is built from its kind table (`GroupList/kinds.ts`, `GroupedValueList/kinds.ts`), which holds its address. The other addresses are checked against the built routes (`typedRoutes`). A tab marked `filtered` opens with a filter, which its loading skeleton draws.

## The wait for an admin page

`target.ts` says what each admin page draws while it is on its way, keyed by the address the nav and the index link it at, its first tab. The admin area has its own body under its context row, so every wait belongs to the `admin` region and the row with its nav stays. The wait is the page that arrives: its heading, the action at the heading's end, its filter row, then the list. The index is sections of links and draws its own heading. A tabbed page draws its tab row between the heading and the action. The Compendium has one tab and so no row.
