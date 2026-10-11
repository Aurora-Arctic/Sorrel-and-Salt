# AdminNav

`src/components/AdminNav/` — the `/admin` layout's nav, a `<nav>` labelled
"Admin" linking every admin page, in six sections. The same sections are the
`/admin` index's table of contents, which this component also draws
(`AdminContents`, "The index", below):

| Section    | Label             | Route                      | Built by |
| ---------- | ----------------- | -------------------------- | -------- |
| Compendium | Compendium        | `/admin/compendium`        | M5.5     |
| Categories | Categories        | `/admin/categories`        | M5.6     |
|            | Category Groups   | `/admin/category-groups`   | M5.6b    |
| Forms      | Forms             | `/admin/forms`             | M5.6a    |
|            | Form Groups       | `/admin/form-groups`       | M5.6b    |
| Deities    | Deities           | `/admin/deities`           | MB.132   |
|            | Deity Traditions  | `/admin/deity-traditions`  | MB.132   |
| Astrology  | Planets           | `/admin/planets`           | MB.95    |
|            | Zodiac Signs      | `/admin/zodiac-signs`      | MB.95    |
| People     | Users             | `/admin/users`             | MB.52    |
|            | Privilege Changes | `/admin/privilege-changes` | MB.200   |

It takes no props. The list is one constant, `ADMIN_SECTIONS` in
`sections.ts`: each section a name and its pages, each page a route, a label
and the one line the index says about it. `index.tsx` renders the nav and
stays a server component; `nav-links.tsx`, the links, is the one client
part, since only a client component can read the address.
`src/app/admin/layout.tsx` renders the nav above the page, after the guard
has passed, so it appears for admins only
([`auth/admin-guard.md`](../auth/admin-guard.md), "The admin guard"). The
site-wide nav's own Admin entry is AppShell's (MB.7), and is shown to admins
only too.

## Contracts

- **The sections are the admin area's table of contents.** A task that adds
  an admin page adds it to `ADMIN_SECTIONS` and its row here in its own PR,
  and the nav and the index both gain it. A list sits in the section of the
  group list that organises it: Categories with Category Groups, Forms with
  Form Groups, Deities with Deity Traditions (M5.6b, MB.132;
  [`design-decisions/m5.6b-admin-groups.md`](../design-decisions/m5.6b-admin-groups.md)).
  Planets and Zodiac Signs share Astrology; Users and the privilege ledger,
  the history of what was done to them there (MB.200), share People. The
  grouping is the owner's, at MB.115's design review.
- **`<Link>`, now that every route exists.** `typedRoutes` refuses an `href`
  for a route the build does not contain, so the list was plain anchors until
  each of its pages had landed. M5.6b's two group pages were the last, and
  it switched the list to `<Link>`. A soft navigation does not re-run the
  layout, so the layout's guard does not run on a click either, which is why
  every page under `/admin` runs the guard itself.
- **The page you are on is marked.** Its link carries `aria-current="page"`,
  which a screen reader announces, and no other link does. A link is current
  on its own page and on any address beneath it (`pathname === href`, or
  `pathname` starting with `href` and a slash), so the slash keeps a page
  whose path merely begins with another's letters from marking it. `/admin`
  itself, the index, is in no section and marks none. `usePathname()` reads
  the address, which is why the links are a client component (MB.115).
- **Wider than a phone, a row; at a phone's width, a disclosure** (MB.115,
  the owner's call). The row is every link in one wrapping line, in the
  sections' order. At a phone's width the row would wrap onto four or five
  lines, so a `<details>` takes its place: shut, its `<summary>` says where
  you are, the section and the page ("People", "Users"; the compendium,
  a section of one page, named once; "Admin Pages" on the index), with a
  chevron; open, it holds every link again, each section a `.link-row`
  named by its caption through `aria-labelledby`. It is still inside the
  nav landmark named Admin, and the current link still carries
  `aria-current`.
- **The disclosure needs no script.** A `<details>` opens on a press and its
  links are real links, so it opens and navigates before the page's script
  has loaded, or without it. The owner picked a jump menu, a `<select>` of
  pages; the disclosure is the agreed form of it, since a select needs
  script to navigate on a choice and is not announced as navigation.
- **Both forms are in the page; the stylesheet shows one.** A `<details>`
  cannot be open at one width and shut at another without script, so the
  row and the disclosure are both rendered and a container query hides the
  other ("Styling"). A hidden one is `display: none`, out of the
  accessibility tree, so a screen reader and a role query each find one set
  of links at any width.
- **A client-side navigation shuts it.** The layout, and so the nav, stays
  mounted across a soft navigation, so an open `<details>` would stay open
  over the new page. It is keyed by the address, and a new address remounts
  it shut.

## The index

`AdminContents`, exported beside the nav, is the `/admin` index's table of
contents (MB.115, the owner's call): a `section` per entry of
`ADMIN_SECTIONS`, each with its name as an `h2` and a list of its pages, each
page a link with its one line beneath it, which is the link's
`aria-describedby` too. It reads the nav's own constant, so the index and
the nav cannot list different pages. `src/app/admin/page.tsx` renders it
under the heading and a lede, a `<p class="lede">` saying what the area is
for; `tests/e2e/admin.spec.ts` measures that paragraph against the reading
measure, so the lede stays a `<p>` in `main`.

## Styling

`index.scss`, imported by `index.tsx`. The nav is a size container
(`container: admin-nav / inline-size`), so it switches by its own width, as
`.page-header` and `.filter-row` do. At or under `$table-stack-width`
(40rem), where the area's tables stack into cards, the row is hidden and the
disclosure shown; above it, the reverse. The nav and the tables change shape
at the one width.

- **The row** is a `ul.link-row`, the shared row of links
  ([`styling.md`](../styling.md), "Link rows and provider marks"): no bullets
  and no `typography-base` ◆ marker. Its column gap is `space(4)`, a step
  tighter than the primitive's, so more links share a line. The primitive
  draws the current link by shape rather than hue, weight 500 and a
  `$rule-heavy` underline set below the letters.
- **The summary** reads as a select does: the control's 1px edge in the
  muted ink, its radius, its card ground and `$control-height`. The section
  is in the muted caption above the page at weight 500, and the chevron,
  Combobox's `ChevronIcon` in a `$glyph-size` box, turns over while the
  menu is open. The browser's own disclosure triangle is removed. It takes
  the focus ring on `:focus-visible`.
- **Open**, the sections sit `space(3)` apart beneath it, each caption in the
  muted caption size over its `.link-row`.
- **The index** lists each section's pages in a column without bullets, a
  link over its line in the muted ink, the line capped at `$measure`, since
  it is not a `<p>`.

The frame around the nav and the page is the `.admin-layout` primitive
(`styling.md`, "The admin layout").

MB.122, the navigation review, looks at the nav again as a whole: whether
the disclosure stays, and how the admin nav sits with the site's own.

## Stories

[`index.stories.tsx`](../../src/components/AdminNav/index.stories.tsx) —
`Default`, the row; `PhoneDark` and `PhoneLight` at 375px, the disclosure
shut; `PhoneOpen`, the disclosure open at 375px; and `IndexPage` with
`IndexPagePhone`, the `/admin` index under the nav, its heading and lede
copied from the page and `AdminContents` real. Each sits inside the layout
frame. The workshop's `usePathname` stub answers `/admin/users`
([`workshop.md`](../workshop.md)), so Users is current in every story.
Render-only, no test ids, no snapshots.

## Testing

`tests/components/AdminNav/index.test.tsx`, with `next/navigation`'s
`usePathname` mocked, covers every link's route in the row, in the sections'
order, inside the landmark named Admin; the disclosure, by its `group` role,
holding every link again, a list named for each section; which link is
current for a given address, in the row and the disclosure alike: none on
the index, its own on a page, and a page's on an address beneath it; and
the disclosure shut after the address changes under it. Which form shows
at which width is presentation, the workshop's and the browser's.
`tests/app/admin/layout.test.tsx` checks the layout renders the nav only
once the guard resolves, and that the index links every page the nav does,
in its order. `tests/e2e/admin.spec.ts` checks that an admin sees the nav
and a non-admin's 403 page carries none of it.
