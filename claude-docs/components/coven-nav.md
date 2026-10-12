# CovenNav

`src/components/CovenNav/` — the `/coven/[slug]` layout's section nav, a
`<nav>` labelled "Coven" that the layout renders in the context row beside the
coven switcher (M9.15, MB.7). It takes the workspace's `slug` and links each
section of it. It is a thin wrapper: the tabs, the bottom bar on a phone, the
current-page mark and the rest are [`SectionNav`](section-nav.md)'s.

Today it holds one entry:

| Label    | Route           | Icon     | Built by |
| -------- | --------------- | -------- | -------- |
| Overview | `/coven/[slug]` | overview | M9.15    |

`sections.ts` holds the list, as `covenSections(slug)`, each entry a
`SectionNavItem` ([`section-nav.md`](section-nav.md)). `index.tsx` renders
`SectionNav` with it and stays a server component.

## Contracts

- **Each later task adds its own row.** Members (M6.13, shown only to roles
  holding `member: read`), Ingredients (M9.6) and Grimoire (M10.11) each add
  a row to `sections.ts` in their own PR, with its icon (`members`,
  `ingredients`, `grimoire`, already drawn), and it is the task that builds the
  page that adds it: `typedRoutes` refuses a link to a route the build does
  not contain. M6.13 adds the role check with its row; the nav takes no role
  or permission prop until then. The coven's four sections all fit a phone's
  bottom bar, so it never needs More.
- **Every address goes through `route()`** in `sections.ts`, never an
  `as Route` cast. Next checks a dynamic address against the built routes
  only when it infers the address's type, as `<Link href>` does; a field
  typed plain `Route` refuses every template literal in the production
  build, though `tsc` against the dev server's types passes it. `route()`
  infers the type and so keeps the check, where a cast would let a link to
  an unbuilt page through.
- **The page you are on is marked** with `aria-current="page"`. Overview is
  the ancestor of every coven page, so it is current only at its own address
  (`exact` on its entry); `isAtPath` (`src/lib/at-path.ts`) would mark it
  current everywhere. Every other section uses `isAtPath`, so it is current on
  the pages beneath it as well.

## Styling

All of it is `SectionNav`'s ([`section-nav.md`](section-nav.md), "Styling").

## Tests

`tests/components/CovenNav/index.test.tsx`: the nav, named "Coven", links the
index at the slug's address, marks it current there, and does not mark it on
a page beneath it. Its story is render-only; the shapes are `SectionNav`'s.
