# CovenNav

`src/components/CovenNav/` is the section nav of a coven's pages: a `<nav>`
labelled "Coven" that the `/coven/[slug]` layout draws in the context row,
beside the coven switcher (M9.15, MB.7). It links each section of the coven
the viewer is in. It is a thin wrapper around [`SectionNav`](section-nav.md),
which draws the tabs, the bar along the foot of a phone's screen, and the mark
on the page you are on.

## Props

- `slug`: the open coven's slug, from which every address is built.
- `canReadMembers`: whether the viewer's role there may read the members (the
  permission `member: read`), which decides if Members is offered. It defaults
  to false. The layout works it out with
  `rolePermits(role, { member: ['read'] })` and passes the answer in as a
  plain boolean, because the role statements (`access-control`) are
  server-only and this component's list also loads in the workshop, in the
  browser.

## The sections

| Label       | Route                       | Icon        | Shown to                     | Built by |
| ----------- | --------------------------- | ----------- | ---------------------------- | -------- |
| Overview    | `/coven/[slug]`             | overview    | every role                   | M9.15    |
| Ingredients | `/coven/[slug]/ingredients` | ingredients | every role                   | M9.6     |
| Grimoire    | `/coven/[slug]/grimoire`    | grimoire    | every role                   | M10.11   |
| Members     | `/coven/[slug]/members`     | members     | roles holding `member: read` | M6.13    |

Members stays the open section on `/coven/[slug]/invitations` too, since
Invitations is a tab on the same page (its `matches`, M7.6). Members is
`apart`, a group of its own behind a hairline, as People is in the admin nav:
it is the coven's people, not its contents (M10.11). Today an owner and a
member see all four sections and a viewer sees Overview, Ingredients and
Grimoire.

`sections.ts` holds the list as `covenSections(slug, canReadMembers)`, each
entry a `SectionNavItem` ([`section-nav.md`](section-nav.md)). `index.tsx`
draws `SectionNav` with it and stays a server component.

Each entry also carries a `target`, which says what the page draws while it is
on its way: `covenTarget(href)`. The coven
region is the coven's own body, not the whole page, so a press on a section
replaces only that body with a skeleton. `covenTarget`
(`src/lib/coven-path.ts`) picks the target from the section the address names:
cards under a title and filter for Ingredients, a table under a title and tab
row for Members and Invitations, a page with its contents menu for the coven
home and for one ingredient's own page (an id beneath `ingredients`), and a plain page for any section it does not name. The switcher and the home's Contents
use the same mapping. What the target does is
[`loading.md`](../loading.md)'s, "Where the pieces are used".

## Contracts

- **Each later section is added by the task that builds its page.**
  Ingredients (M9.6, added) and Grimoire (M10.11, added) each add their row to
  `sections.ts` in their own PR, with the icon already drawn,
  because `typedRoutes`, Next's check that a link points at a built page,
  refuses a link to a route the build does not contain. The coven's four
  sections all fit a phone's bottom bar, so it never needs More.
- **Members is offered by what the role may do, never by its rank.** A viewer
  is not offered a page that would answer them with a 404; the page and its
  service still check membership themselves, so hiding the link is
  presentation, not the guard.
- **Every address goes through `route()`** in `sections.ts`, never an
  `as Route` cast. Next checks a dynamic address against the built routes only
  when it infers the address's type, as `<Link href>` does; a field typed plain
  `Route` refuses every template literal in the production build, though `tsc`
  against the dev server's types passes it. `route()` infers the type and so
  keeps the check, where a cast would let a link to an unbuilt page through.
- **The page you are on is marked** with `aria-current="page"`. Overview is
  the parent of every coven page, so it is current only at its own address
  (`exact` on its entry); `isAtPath` (`src/lib/at-path.ts`) would mark it
  current everywhere. Every other section uses `isAtPath`, so it is current on
  the pages beneath it as well.

## Styling

All of it is `SectionNav`'s ([`section-nav.md`](section-nav.md), "Styling").

## Stories

`index.stories.tsx`, titled "Coven / Nav", render-only, on the coven index (the toolbar viewport menu shows the nav at 375px, the bar along the foot of the screen). `States` is a grid:

- Overview Current: as a member sees it, Overview current, Ingredients and Members beside it.
- Ingredients Current, Members Current, and Members Current On Its Invitations Tab: the other pages as current.
- Viewer: as a viewer sees it, Overview and Ingredients.

The shapes the nav takes by width are `SectionNav`'s stories; the nav in its
row is `ContextRow`'s Coven cell and the workshop's shell frame.

## Testing

`tests/components/CovenNav/index.test.tsx`: the nav, named "Coven", links the
index at the slug's address, marks it current there and not on a page beneath
it, and links the ingredients page for every caller, and the members page only for one who may read members.

## The sections list

`sections.ts` is the one list the nav reads, in order. Three rules shape it.

- A row is added together with the page it links to, because `typedRoutes` refuses a link to a route the build does not contain.
- Grimoire counts as current on its Drafts tab too, which lies beneath it.
- Members is shown by what the caller's role may do (`member: read`), never by a rank, so a viewer is not offered a page that answers 404. The layout passes that in as a boolean because the file loads in the workshop's browser build, where the server-only access-control module cannot.
