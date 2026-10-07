# AdminNav

`src/components/AdminNav/` — the `/admin` layout's nav, a `<nav>` labelled
"Admin" listing one link per admin-curated resource, in this order:

| Label        | Route                 | Built by |
| ------------ | --------------------- | -------- |
| Compendium   | `/admin/compendium`   | M5.5     |
| Categories   | `/admin/categories`   | M5.6     |
| Forms        | `/admin/forms`        | M5.6a    |
| Planets      | `/admin/planets`      | MB.95    |
| Zodiac signs | `/admin/zodiac-signs` | MB.95    |
| Users        | `/admin/users`        | MB.52    |

It takes no props. `src/app/admin/layout.tsx` renders it above the page, after
the guard has passed, so it appears for admins only
([`auth/admin-guard.md`](../auth/admin-guard.md), "The admin guard"). The
site-wide nav's own Admin entry is AppShell's (MB.7), and is shown to admins
only too.

## Contracts

- **The list is the admin area's table of contents.** A task that adds an
  admin resource to it adds its row here in its own PR, as `/admin/users`
  (MB.52) did: the user list is no curated resource, but it is where an admin
  acts on a person. M5.6b's `/admin/category-groups` and
  `/admin/form-groups` are not in M5.4's list; where they are reached from is
  M5.6b's call.
- **Plain anchors, not `next/link`.** `typedRoutes` refuses an `href` for a
  route the build does not contain, and of the six only `/admin/compendium`,
  `/admin/categories` and `/admin/users` exist yet, so until each of the
  others lands its link reaches a 404. Once they all do, the list switches
  to `<Link>`. A plain anchor is a full page load, so the layout's guard
  re-runs on every click; `<Link>` will not, which is why every page under
  `/admin` runs the guard itself.
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

`tests/components/AdminNav/index.test.tsx` covers the landmark's name and the
six links, labels and routes, in order. `tests/app/admin/layout.test.tsx`
checks the layout renders it only once the guard resolves, and
`tests/e2e/admin.spec.ts` that an admin sees it and a non-admin's 403 page
carries none of it.
