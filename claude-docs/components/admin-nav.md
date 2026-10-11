# AdminNav

`src/components/AdminNav/` — the `/admin` layout's nav, a `<nav>` labelled
"Admin" listing one link per admin-curated resource, in this order:

| Label             | Route                      | Built by |
| ----------------- | -------------------------- | -------- |
| Compendium        | `/admin/compendium`        | M5.5     |
| Categories        | `/admin/categories`        | M5.6     |
| Category Groups   | `/admin/category-groups`   | M5.6b    |
| Forms             | `/admin/forms`             | M5.6a    |
| Form Groups       | `/admin/form-groups`       | M5.6b    |
| Planets           | `/admin/planets`           | MB.95    |
| Zodiac Signs      | `/admin/zodiac-signs`      | MB.95    |
| Deities           | `/admin/deities`           | MB.132   |
| Deity Traditions  | `/admin/deity-traditions`  | MB.132   |
| Users             | `/admin/users`             | MB.52    |
| Privilege Changes | `/admin/privilege-changes` | MB.200   |

It takes no props. `index.tsx` holds the list and stays a server component; `nav-links.tsx`, the links, is the one client part, since only a client component can read the address. `src/app/admin/layout.tsx` renders it above the page, after
the guard has passed, so it appears for admins only
([`auth/admin-guard.md`](../auth/admin-guard.md), "The admin guard"). The
site-wide nav's own Admin entry is AppShell's (MB.7), and is shown to admins
only too.

## Contracts

- **The list is the admin area's table of contents.** A task that adds an
  admin resource to it adds its row here in its own PR, as `/admin/users`
  (MB.52) did: the user list is no curated resource, but it is where an admin
  acts on a person. So did the privilege ledger (MB.200), after Users, since
  it is the history of what was done to them there. A vocabulary's group page follows the vocabulary it
  organises, Category Groups after Categories, Form Groups after Forms and
  Deity Traditions after Deities (M5.6b, MB.132;
  [`design-decisions/m5.6b-admin-groups.md`](../design-decisions/m5.6b-admin-groups.md)).
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
  itself, the index, is in no entry and marks none. `usePathname()` reads
  the address, which is why the links are a client component (MB.115).

## Styling

None of its own. The list is a `ul.link-row`, the shared row of links
([`styling.md`](../styling.md), "Link rows and provider marks"): a
wrapping row with no bullets and no `typography-base` ◆ marker, since a
row of links is not a bulleted list. The same primitive draws the current
link by shape rather than hue, weight 500 and a `$rule-heavy` underline
set below the letters. The frame around the nav and the page is the
`.admin-layout` primitive ("The admin layout" there), which lived in
this component's stylesheet until MB.115 put its lengths on the scale and
moved it; the component has no stylesheet now. At 375px today's row wraps
onto four or five lines; MB.115's sign-off picks its phone layout, and the
collapse of the whole nav is MB.122's.

## Stories

[`index.stories.tsx`](../../src/components/AdminNav/index.stories.tsx) —
`Default`, and `PhoneDark` and `PhoneLight` at 375px, each inside the layout frame.
The workshop's `usePathname` stub answers `/admin/users`
([`workshop.md`](../workshop.md)), so Users is current in every story.
MB.115's proposals for the phone layout, until its sign-off deletes the
losers with `proposals.scss`, their story-only stylesheet:
`ProposalNavWrap` (a tighter wrapping row, today's marker),
`ProposalNavWrapPill` (the same row, the marker a pill on the card
surface), `ProposalNavScroll` (one row scrolling sideways),
`ProposalNavGrouped` (three captioned rows: Compendium, Vocabularies,
People) and `ProposalNavJumpMenu` (a select). The `/admin` index's two, beside
the nav it sits under: `ProposalIndexToday`, the page's heading and
paragraph, and `ProposalIndexContents` with its `ProposalIndexContentsPhone`,
a lede and a table of contents in the same three groups, each link with a
line saying what its page is for. Render-only, no test ids,
no snapshots.

## Testing

`tests/components/AdminNav/index.test.tsx` covers every link's route, in
order, inside the landmark named Admin, and which link is current for a
given address, with `next/navigation`'s `usePathname` mocked: none on the
index, its own on a page, and a page's on an address beneath it. `tests/app/admin/layout.test.tsx`
checks the layout renders it only once the guard resolves, and
`tests/e2e/admin.spec.ts` that an admin sees it and a non-admin's 403 page
carries none of it.
