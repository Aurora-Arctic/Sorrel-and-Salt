# AdminNav

`src/components/AdminNav/` — the `/admin` layout's nav, a `<nav>` labelled
"Admin" listing one link per admin-curated resource, in this order:

| Label             | Route                      | Built by |
| ----------------- | -------------------------- | -------- |
| Compendium        | `/admin/compendium`        | M5.5     |
| Categories        | `/admin/categories`        | M5.6     |
| Category groups   | `/admin/category-groups`   | M5.6b    |
| Forms             | `/admin/forms`             | M5.6a    |
| Form groups       | `/admin/form-groups`       | M5.6b    |
| Planets           | `/admin/planets`           | MB.95    |
| Zodiac signs      | `/admin/zodiac-signs`      | MB.95    |
| Deities           | `/admin/deities`           | MB.132   |
| Deity traditions  | `/admin/deity-traditions`  | MB.132   |
| Users             | `/admin/users`             | MB.52    |
| Privilege changes | `/admin/privilege-changes` | MB.200   |

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
  organises, Category groups after Categories, Form groups after Forms and
  Deity traditions after Deities (M5.6b, MB.132;
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

Layout only. `index.scss` also carries `.admin-layout`, the frame the layout
renders — a 64rem column, nav above page — beside the nav it holds, as
`EmailForm`'s carries `.email-page`. It is wider than the reading measure on
purpose, for the tables the admin pages will hold; their paragraphs still stop
at `$measure` through `typography-base` ([`styling.md`](../styling.md),
"Binding rules"). The list is a wrapping row with no bullets, and no
`typography-base` ◆ marker either: a row of links is not a bulleted list, and
the marker sat against the previous link. No tokens used.

## Stories

[`index.stories.tsx`](../../src/components/AdminNav/index.stories.tsx) —
`Default`, inside the layout frame. Render-only, no test ids, no snapshots.

## Testing

`tests/components/AdminNav/index.test.tsx` covers the landmark's name and
every link, its label and its route, in order. `tests/app/admin/layout.test.tsx`
checks the layout renders it only once the guard resolves, and
`tests/e2e/admin.spec.ts` that an admin sees it and a non-admin's 403 page
carries none of it.
