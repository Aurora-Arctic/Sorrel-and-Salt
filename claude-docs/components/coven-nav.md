# CovenNav

`src/components/CovenNav/` — the `/coven/[slug]` layout's section nav, a
`<nav>` labelled "Workspace" that the layout renders above every page under a
workspace (M9.15). It takes the workspace's `slug` and links each section of it.

Today it holds one entry:

| Label    | Route           | Built by |
| -------- | --------------- | -------- |
| Overview | `/coven/[slug]` | M9.15    |

`sections.ts` holds the list, as `covenSections(slug)`. `index.tsx` renders
the nav and stays a server component; `nav-links.tsx`, the links, is the one
client part, since only a client component can read the address
(`usePathname()`).

## Contracts

- **Each later task adds its own row.** Members (M6.13, shown only to roles
  holding `member: read`), Ingredients (M9.6) and Grimoire (M10.11) each add
  a row to `sections.ts` in their own PR, and it is the task that builds the
  page that adds it: `typedRoutes` refuses a link to a route the build does
  not contain. M6.13 adds the role check with its row; the nav takes no role
  or permission prop until then.
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
  current everywhere. Every other section link uses `isAtPath`, so it is
  current on the pages beneath it as well.
- **No phone disclosure.** One link needs none, so the `.link-row` wraps at
  any width. Add a disclosure, as AdminNav has ([`admin-nav.md`](admin-nav.md)),
  when the row no longer fits a phone.

## Styling

Tokens, mixins and the `.link-row` primitive only; the section's design
review styles it further.

## Tests

`tests/components/CovenNav/index.test.tsx`: the nav links the index at the
slug's address, marks it current there, and does not mark it on a page
beneath it. Its story is render-only.
