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

It takes no props. `src/app/admin/layout.tsx` renders it above the page, after
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
- **No current-page marker yet.** Marking the active entry needs
  `usePathname()`, and so a client component; it is the admin area's design
  review's to add (MB.115).

## Styling

Layout only. `index.scss` carries `.admin-layout`, the frame the layout
renders — a 64rem column, nav above page — beside the nav it holds. It is
wider than `.page-frame` and the reading measure on purpose, for the tables
the admin pages hold; their paragraphs still stop at `$measure` through
`typography-base` ([`styling.md`](../styling.md), "Binding rules"). Its raw
lengths are the admin review's to put on the scale (MB.115).

The list is a `ul.link-row`, the shared row of links
([`styling.md`](../styling.md), "Link rows and provider marks"): a wrapping
row with no bullets and no `typography-base` ◆ marker, since a row of links
is not a bulleted list and the marker sat against the previous link. It was
`.admin-nav__list`, the same rules written here, until MB.116 made them a
primitive. No tokens used.

## Stories

[`index.stories.tsx`](../../src/components/AdminNav/index.stories.tsx) —
`Default`, inside the layout frame. Render-only, no test ids, no snapshots.

## Testing

`tests/components/AdminNav/index.test.tsx` covers the landmark's name and
every link, its label and its route, in order. `tests/app/admin/layout.test.tsx`
checks the layout renders it only once the guard resolves, and
`tests/e2e/admin.spec.ts` that an admin sees it and a non-admin's 403 page
carries none of it.
