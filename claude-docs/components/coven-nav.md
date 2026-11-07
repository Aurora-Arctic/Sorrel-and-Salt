# CovenNav

`src/components/CovenNav/` is the section nav of a coven's pages: a `<nav>` labelled "Coven" that the `/coven/[slug]` layout draws in the context row, beside the coven switcher. A thin wrapper around [`SectionNav`](section-nav.md), which draws the tabs, the phone's bottom bar and the current-page mark; all styling is its ([`section-nav.md`](section-nav.md), "Styling").

## Props

- `slug`: the open coven's slug, from which every address is built.
- `canReadMembers`: whether the viewer's role may read members (permission `member: read`); decides if Members is offered. Defaults to false. The layout computes it with `rolePermits(role, { member: ['read'] })` and passes a plain boolean, because the role statements (`access-control`) are server-only and this component's list also loads in the workshop, in the browser.

## The sections

| Label       | Route                       | Shown to                     |
| ----------- | --------------------------- | ---------------------------- |
| Overview    | `/coven/[slug]`             | every role                   |
| Ingredients | `/coven/[slug]/ingredients` | every role                   |
| Grimoire    | `/coven/[slug]/grimoire`    | every role                   |
| Members     | `/coven/[slug]/members`     | roles holding `member: read` |

`sections.ts` holds the list as `covenSections(slug, canReadMembers)`, each entry a `SectionNavItem` ([`section-nav.md`](section-nav.md)); `index.tsx` stays a server component. Members stays open on `/coven/[slug]/invitations` too (its `matches`), and Grimoire is current on its Drafts tab. Members is `apart`, a group of its own behind a hairline, as People is in the admin nav: it is the coven's people, not its contents. All four fit a phone's bottom bar, so it never needs More.

Each entry also carries a `target`, `covenTarget(href)` (`src/lib/coven-path.ts`), saying what the page draws on its way: the coven region is the coven's own body, so a press replaces only that body with a skeleton. The target is a card list under a title and filter for Ingredients, a table under a title and tab row for Members and Invitations, a page with its contents menu for the coven home and one ingredient's page, and a plain page otherwise. The switcher and the home's Contents use the same mapping. What the target does is [`loading.md`](../loading.md)'s, "Where the pieces are used".

## Contracts

- **A new section's row is added by the task that builds its page**, with its icon already drawn, because `typedRoutes` refuses a link to a route the build does not contain.
- **Members is offered by what the role may do, never by its rank.** An observer is not offered a page that would 404; the page and service still check membership, so hiding the link is presentation, not the guard.
- **Every address goes through `route()`** in `sections.ts`, never an `as Route` cast. Next checks a dynamic address against the built routes only when it infers the type, as `<Link href>` does; a field typed plain `Route` refuses every template literal in the production build though `tsc` against the dev server's types passes it. `route()` infers the type and keeps the check.
- **The current page is marked** `aria-current="page"`. Overview is the parent of every coven page, so it is current only at its own address (`exact`); `isAtPath` (`src/lib/at-path.ts`) would mark it everywhere. Every other section uses `isAtPath`, so it is current on the pages beneath it too.

## Stories and tests

`src/components/CovenNav/index.stories.tsx` ("Coven / Nav", render-only; the toolbar viewport menu shows the bottom bar at 375px) and `tests/components/CovenNav/`. The shapes by width are `SectionNav`'s stories; the nav in its row is `ContextRow`'s Coven cell and the workshop's shell frame.
