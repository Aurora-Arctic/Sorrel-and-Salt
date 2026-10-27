# GrimoireList

`src/components/GrimoireList/` draws one tab of a coven's Grimoire (M10.11, story 56): a
title search and a Categories filter above the coven's spells, one `SpellCard` each
([`spell-card.md`](spell-card.md)), with the search sentence and the pager. It is built on
the ingredients page's search stack ([`ingredient-search.md`](ingredient-search.md)), not on
a new one. A client component; the page reads the spells on the server and hands them in.

## The two tabs

The Grimoire is a `TabbedPage` ([`tabbed-page.md`](tabbed-page.md)) titled Grimoire, with two
tabs, each its own address:

| Tab    | Route                           | Reads                                    |
| ------ | ------------------------------- | ---------------------------------------- |
| Spells | `/coven/[slug]/grimoire`        | the `grimoire` query, `status: complete` |
| Drafts | `/coven/[slug]/grimoire/drafts` | the `grimoire` query, `status: draft`    |

Drafts have a tab of their own because a draft may have no title, and a list of complete
spells is the one a member goes back to (the owner's call, 2026-10-27). The tabs replace a
status facet, so the panel offers none, and the tab's status wins over any `status` in the
address. The order is newest edit first (`UPDATED_DESC`); while a search is active the best
match comes first and that order breaks a tie (M10.9's `grimoire` query).

The route group `src/app/(shell)/coven/[slug]/grimoire/(list)/` holds them. Its `layout.tsx`
runs the membership guard (`requireCovenMembership`, which calls `requireSession()`) and
draws the tab row; `page.tsx` and `drafts/page.tsx` set their titles and each call
`grimoireTab()` (`grimoire-tab.tsx`) with its status. `grimoireTab` is an async function the
page returns, rather than a component, so a page test can await the page whole. It reads the
address through `GRIMOIRE_PARAMS`, the page through `readNumberedPage` at `CARD_PAGE_SIZE`
(24), each card's assigned categories in one batch, and the Categories filter's counts in one
grouped read beside the page (`reads.ts`, `readGrimoireCategoryCounts`). The page's editors are
named in one batch too: the page reads through the services rather than GraphQL, so it calls
`displayNamesOf` (`@/modules/identity`) once with every spell's `updatedBy`, and each card's
`lastEdit` is that name, or null for an editor the viewer cannot name, with `updatedAt`.

## Props

`GrimoireListProps` (`types.ts`):

| Prop                       | What it is                                                                  |
| -------------------------- | --------------------------------------------------------------------------- |
| `path`                     | The tab's own address: the filter's GET target and what Clear All opens     |
| `workspaceId`              | The coven the title search suggests from                                    |
| `status`                   | The tab's status, which the title search keeps to and the empty state names |
| `spells`                   | The page's spells, each as its card draws it                                |
| `filter`                   | The address's filter: the search text, the categories and their Match mode  |
| `categories`               | Every category the filter offers, by slug, each with its count on this tab  |
| `position`                 | The page number and the page count, for the pager                           |
| `total`                    | How many spells the filter found on this tab, every page                    |
| `previousHref`, `nextHref` | The pager's links, which keep the tab's path and the filter                 |

`GRIMOIRE_PARAMS` (`params.ts`) is the grimoire's parameter set in `defineSearchParams`:
`query`, `categories` and `categoryMode`. It reads the address and writes the GraphQL
variables, so a search and its categories live in the address and combine.

## Contracts

- **The title search.** The search box is `IngredientSearch`'s, labelled Title, with the
  same submit behaviour as the ingredients page. It matches title and intent, from two
  characters (M10.11's floor in the query). Its suggestions come from the coven's spells on
  this tab, by title. Until MB.6, picking a suggestion applies its title as the search, since
  the spell has no page to open. MB.6 makes a pick open the spell's recipe page through
  `IngredientSearch`'s `pickHref`, and M13.21 then makes it open the spell's Quick Look
  instead, as a pick on the coven's Ingredients page opens the entry's Quick Look (the
  owner's rule of 2026-10-27).
- **The Categories panel.** The panel is `FacetShell` holding the shared `CategoryLine`
  ([`facet-panel.md`](facet-panel.md)): the category picker and its Match chip, nothing
  else. Each category shows how many spells on this tab, under the search, the viewer can
  read in it, and one that holds none is not offered (`hideZeros`). The counts are
  `countGrimoireCategories`'s, read with the page under the filter the address holds, not
  the one held in the open panel: unlike the compendium's, they do not follow a pick until
  it is applied. Under Any the chosen categories are left out of the count, and under All
  they stay in force, as the ingredient facets count ([`db/grimoire.md`](../db/grimoire.md),
  "The Categories filter's counts"). A pick is held while the panel is open and applied to
  the tab's address, as a slug, when it shuts.
- **The list** is named Grimoire, and each item is named by its spell's title, through the
  card's title id, so a test or a screen reader finds a spell by
  `getByRole('listitem', { name: 'Hearth Warding Jar' })`.
- **Two empty states**, each a named status region, as the coven cards' are
  ([`coven-cards.md`](coven-cards.md)):
  - **No Spells**, "There are no complete spells here yet.", or **No Drafts**, "There are
    no drafts here yet.", when the tab holds nothing and no filter is in force;
  - **No Matches** when a filter is in force and matched nothing. The search sentence above
    already names the filter, so this says only what to do.

  Which one is the search sentence's own test (`hasFilter`), so the two never disagree.
  Neither offers a first spell: the builder is M10.12's.

- **No link yet.** A card does not open its spell until MB.6 builds the spell's page and
  adds the link.
- **Visibility is the query's.** The page lists what the `grimoire` query returns: every
  workspace-visible spell and the viewer's own private ones, filtered in SQL. Nothing here
  filters after fetching.
- **The loading shape** is `PARTS_OF_SECTION.grimoire` in `src/lib/coven-path.ts`: cards
  under a title, the tab row and a filter. Drafts is the grimoire's second tab, so it draws
  the same; any other path beneath `grimoire` draws as a spell's own page.

## Styling

Tokens only, before the section's design review. `index.scss` sets the two empty regions as the coven's empty cupboard is (`CovenCards/index.scss`): the empty tab's sentence centred and larger than body copy, the no-match hint in muted body copy. The cards are `SpellCard`'s own.

## Testing

- `tests/components/GrimoireList/index.test.tsx`: the named list and items, the three empty
  regions, the title search's address, the category pick applied as a slug, and each category
  offered with its count, a category at zero not offered.
- `tests/app/(shell)/coven/[slug]/grimoire/(list)/page.test.tsx`: the membership guard on
  both tabs and the layout, each tab's status and page size, the address read into the
  query, the tab's status winning, the categories and the editors each read in one batch,
  the category counts read under the tab's status and query and reaching the panel, and the
  pager's link.
- `tests/components/CovenNav/index.test.tsx`: the Grimoire link, current on Drafts too.
- `tests/e2e/stories/06-grimoire.spec.ts`: story 56 in the browser, a private spell listed
  for its author alone.
- Visibility, search, categories and counts are proved below the page, in
  `tests/db/repository/readable-spell-page.test.ts` and
  `tests/modules/grimoire/services/spell-reads.test.ts`.
