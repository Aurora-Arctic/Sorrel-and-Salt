# GrimoireList

`src/components/GrimoireList/` draws one tab of a coven's Grimoire (M10.11, story 56): a
title search and five facets (Categories, Moon Phases, Days of the Week, Coven Members and Visibility)
above the coven's spells, one `SpellCard` each ([`spell-card.md`](spell-card.md)), with the
search sentence and the pager. It is built on the ingredients page's search stack
([`ingredient-search.md`](ingredient-search.md)), not on a new one. `index.tsx` has no
`'use client'`: the page reads the spells on the server and renders the list there, and only the
filter row (`filter.tsx`) is a client component.

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
draws the tab row, with New Spell at the heading's end for an owner or a member, the roles that
may create a spell, opening the builder in a wide modal over the open tab at `?new=spell`, the
tab, filter and page kept (M10.12; [`spell-builder.md`](spell-builder.md)); a viewer
sees no New Spell; `page.tsx` and `drafts/page.tsx` set their titles and each call
`grimoireTab()` (`grimoire-tab.tsx`) with its status. `grimoireTab` is an async function the
page returns, rather than a component, so a page test can await the page whole. It reads the
address through `GRIMOIRE_PARAMS`, the page through `readNumberedPage` at `CARD_PAGE_SIZE`
(24), each card's assigned categories in one batch, and the Categories filter's counts in one
grouped read beside the page (`reads.ts`, `readGrimoireCategoryCounts`). The page's editors are
named in one batch too: the page reads through the services rather than GraphQL, so it calls
`displayNamesOf` (`@/modules/identity`) once with every spell's `updatedBy`, and each card's
`lastEdit` is that name, or null for an editor the viewer cannot name, with `updatedAt`.

A delete on a spell's page (M13.11) leaves for the tab the spell was listed on with
`?deleted=<name>`, which the tab draws as a success Notice above the list, "**Hearth Warding**
was deleted.", a status region so it is announced as the list shows. It is read once: the
next address the tab builds (a filter, a page, a dialog's close) drops it, so a reload of that
address is the only way to see it again.

## Props

`GrimoireListProps` (`types.ts`):

| Prop                       | What it is                                                                                                        |
| -------------------------- | ----------------------------------------------------------------------------------------------------------------- |
| `path`                     | The tab's own address: the filter's GET target and what Clear All opens                                           |
| `workspaceId`              | The coven the title search suggests from                                                                          |
| `covenSlug`                | The coven's slug, which each card's recipe page address is built from                                             |
| `status`                   | The tab's status, which the title search keeps to and the empty state names                                       |
| `spells`                   | The page's spells, each as its card draws it, with its `lookHref` and, for a role that may update, its `editHref` |
| `filter`                   | The address's filter: the search text, the categories and their Match mode                                        |
| `categories`               | Every category the filter offers, by slug, each with its count on this tab                                        |
| `facets`                   | Moon Phases, Days of the Week, Visibility and Coven Members: every value each offers, with its count              |
| `position`                 | The page number and the page count, for the pager                                                                 |
| `cursor`                   | The cursor of the page shown, which a picked title's Quick Look opens over and closes back to                     |
| `total`                    | How many spells the filter found on this tab, every page                                                          |
| `previousHref`, `nextHref` | The pager's links, which keep the tab's path and the filter                                                       |

`GRIMOIRE_PARAMS` (`params.ts`) is the grimoire's parameter set in `defineSearchParams`:
`query`, `categories`, `categoryMode`, `moonPhases`, `daysOfWeek`, `visibility` and `makers`.
It reads the address and writes the GraphQL variables, so a search and its facets live in the
address and combine. `params.ts` also exports `VISIBILITIES`, the two visibilities as the address
spells them, and `VISIBILITY_LABELS`, what each is called on screen (Private and Shared).

## Contracts

- **The title search.** The search box is `IngredientSearch`'s, labelled Title, with the
  same submit behaviour as the ingredients page. It matches title and intent, from two
  characters (M10.11's floor in the query). Its suggestions come from the coven's spells on
  this tab, by title. Picking a suggestion opens the spell's Quick Look over the list (M13.21), at the address
  the card's eye opens, `?spell=<id>` added to the tab's address with its filter and its page
  (the list's `cursor` prop) kept and the text typed and not searched not applied. It goes
  through `IngredientSearch`'s `pickHref`, `pickHeading` and `pickPlace`, the row's `match`
  holding the spell id, as a pick on the coven's Ingredients page opens the entry's Quick
  Look (the owner's rule of 2026-10-27).
- **The Categories panel.** The panel is `FacetShell` holding the shared `CategoryLine`
  ([`facet-panel.md`](facet-panel.md)): the category picker and its Match chip, on the
  panel's first line, with the four facets below it. Each category shows how many spells on this tab, under the search, the viewer can
  read in it, and one that holds none is not offered (`hideZeros`). The counts are
  `countGrimoireCategories`'s, read with the page under the filter the address holds, not
  the one held in the open panel: unlike the compendium's, they do not follow a pick until
  it is applied. Under Any the chosen categories are left out of the count, and under All
  they stay in force, as the ingredient facets count ([`db/grimoire.md`](../db/grimoire.md),
  "The Categories filter's counts"). A pick is held while the panel is open and applied to
  the tab's address, as a slug, when it shuts.
- **The four more facets (M13.22).** Beside Categories, `FacetShell` holds Moon Phases, Days of the
  Week and Coven Members, each a `FacetCombobox` taking several picks
  ([facet-combobox.md](facet-combobox.md)), and last Visibility, a `ChoiceChip` with three states. Within a facet the picks are alternatives, and the
  facets are ANDed with each other, with Categories and with the search. The three boxes are named
  in the plural, as the Ingredients list's are, because each takes several picks; so each one's
  empty text reads "No Moon Phases" and the like, and its list toggle "Show Moon Phases
  suggestions".
  - **Moon Phases** and **Days of the Week** are typeaheads over the values written on spells the
    viewer can read, compared trimmed and ignoring case. Typed text that matches no suggestion
    picks nothing. Addresses: `moonPhase` and `dayOfWeek`, repeated.
  - **Coven Members** picks by the spell's maker (`created_by`), address `maker=<user id>`, an id
    that is not a uuid is dropped. Makers are named in one `displayNamesOf` batch, a former
    member included. A maker the viewer cannot name (a seed author, say) is still offered, reading A former member.
  - **Visibility** is a `ChoiceChip` ([`FacetPanel/choice-chip.tsx`](../../src/components/FacetPanel/choice-chip.tsx)),
    the control the compendium filter draws Toxic with and placed the same way, in a
    `facet-panel__quick` wrapper after Coven Members on the panel's last line (the owner's call of
    2026-10-28). Its states are Any (no filter, the default), Private and Shared, each of
    Private and Shared showing its count. Both always show, zero included, and with either at
    zero every spell shares one visibility, so the chip rests on Any and is disabled, as Toxic's
    is. It takes one value, not several: address `visibility=private|workspace`, left out for
    Any. Private counts only the viewer's own.
  - The counts are `countGrimoireFacets`'s ([db/grimoire.md](../db/grimoire.md)), read in
    `reads.ts` under the address with each facet's own picks dropped, never cached. A picked
    value with no count is shown at 0.
  - The search sentence names each pick: "in the moon phase X or Y", "for the day X",
    "that are private" (one pick), "made by X".
- **The list** is the shared `IngredientCardList` at compact density, named after its tab: Spells or
  Drafts. Its items are unnamed and each card (`article`) is named by its spell's title, so a screen
  reader hears the title once and a test finds a spell by
  `getByRole('article', { name: 'Hearth Warding Jar' })`.
- **Two empty states**, each a status region named so a test or a screen reader can tell them
  apart, as the coven cards' are ([`coven-cards.md`](coven-cards.md)):
  - **No Spells**, "There are no complete spells here yet.", or **No Drafts**, "There are
    no drafts here yet.", when the tab holds nothing and no filter is in force;
  - **No Matches** when a filter is in force and matched nothing. The search sentence above
    already names the filter, so this says only what to do.

  Which one is the search sentence's own test (`hasFilter`), so the two never disagree.
  Neither offers a first spell: New Spell at the heading does.

- **Each card links to its spell's recipe page** (MB.6), built from the `covenSlug` prop by
  `recipe-href.ts`. See [`spell-recipe.md`](spell-recipe.md).
- **Visibility is the query's.** The page lists what the `grimoire` query returns: every
  workspace-visible spell and the viewer's own private ones, filtered in SQL. Nothing here
  filters after fetching.
- **The loading shape** is `PARTS_OF_SECTION.grimoire` in `src/lib/coven-path.ts`: cards
  under a title, the tab row and a filter. Drafts is the grimoire's second tab, so it draws
  the same; any other path beneath `grimoire` draws as a spell's own page.

## Quick Look

`?spell=<id>` on either tab opens `SpellLookDialog` over the list (M13.21), for every role. The
tab reads it with `readLookedSpell` (`reads.ts`): `readSpell` for the signed-in member, which
keeps another member's private spell and another coven's spell as a NotFound, so the tab opens
nothing and says nothing of the spell. Any other failure draws the modal's own Notice. The steps,
assigned categories and editor come from `readRecipeOf` (`grimoire/recipe-read.ts`), the same
function the recipe page calls, with the editor named in one `displayNamesOf` call. Each ingredient step then carries its stock mark (`supply`), from one `readStepSuppliesOf` call (`grimoire/[id]/recipe-supply.ts`), since the modal has no In Coven Inventory column to show it (story 54; [spell-recipe.md](spell-recipe.md), "Quick Look"). A malformed
id reads nothing, and `?new` or `?edit` hold the modal back so one dialog shows at a time. The
modal's Edit shows for the same `rolePermits(role, { spell: ['update'] })` check as the card's
pencil and links to `?edit=<id>` in place of `?spell=<id>`. Delete Spell's bin, with the same confirmation dialog, sits beside it in the Quick Look's heading, and on each card as an item of its More menu, for the roles that may delete (`rolePermits(role, { spell: ['delete'] })`: owner and member, not viewer). A confirmed delete from either lands on this tab's address, filter and page kept and `?spell` dropped, with `deleted=<name>` added for the Notice (M13.11). The confirmation dialog stacks over the Quick Look. An ingredient step's Quick Look eye
opens the ingredient's details (`DetailsDialog`, M12.5) over the spell's modal, at the same
address plus `&entry=<id>`, read with the Ingredients page's `readViewedEntry` and drawn with
its `viewedDetailsOf` (`ingredients/viewed-details.tsx`), without the card's actions; closing
the details returns to the spell's modal (the owner, 2026-10-28). The details wait on the spell's
modal: `?entry` with no spell open opens nothing.

## The Compact switch

The filter row ends with `CardDensitySwitch` ([card-density-switch.md](card-density-switch.md)),
where the coven Ingredients filter draws it. It is a view setting: it sits inside the search
landmark and submits nothing. The list carries `data-density="compact"` (`IngredientCardList`'s `density`), as does the
wrapper the loading skeleton draws inside ([skeleton.md](skeleton.md)), and the stored choice
(`data-card-density="regular"` on `<html>`) turns the compact look off in CSS, so one choice
serves this list and the Ingredients list and works before hydration. `SpellCard`'s compact
look is [spell-card.md](spell-card.md), "Compact".

## Styling

Tokens only, before the section's design review. `index.scss` makes the filter row
(`.grimoire-list__row`) the positioned ancestor the facet panel opens under, and sets the two empty regions as the coven's empty cupboard is (`CovenCards/index.scss`): the empty tab's sentence centred and larger than body copy, the no-match hint in muted body copy. The cards are `SpellCard`'s own.

One thing in the list exists for the cards' smouldering edge ([spell-card.md](spell-card.md), "The smouldering edge"): **one `SpellCardFilters` before the list.** It holds the SVG filter the burn front uses, by id. An id must be unique on the page, so the list renders it once rather than each card. The list needs no stacking context of its own: the card's layers stack by the order of the markup, with no `z-index`.

## Stories

`src/components/GrimoireList/index.stories.tsx`, titled "Grimoire / Grimoire List": `States`,
with a control that chooses one state, each drawn in the Grimoire page's Spells and Drafts tabs
over the app shell, with the page's own New Spell button:

- Spells and Drafts: four complete spells, and two drafts.
- No Spells and No Drafts: each tab with nothing in it.
- No Matches: a search and filters that match nothing.
- First Page, Middle Page and Last Page: the pager at each end and between.
- Facets and Categories Picked: two categories, a moon phase, a day, a visibility and a maker
  picked, with the one spell they match.
- Filters Open With Picks: the same picks, with the Filters panel open.

The cards themselves are drawn in SpellCard's `Grimoire / Spell Card` stories
([spell-card.md](spell-card.md), "Stories").

## Testing

- `tests/components/GrimoireList/index.test.tsx`: the list named after its tab, its unnamed items and named cards, the empty
  regions (No Spells, No Drafts and No Matches), the title search's address, the category pick applied as a slug, and each category
  offered with its count, a category at zero not offered.
  The Compact switch: on by default, the list's `data-density`, and the stored choice it writes.
- `tests/app/(shell)/coven/[slug]/grimoire/(list)/page.test.tsx`: the membership guard on
  both tabs and the layout, each tab's status and page size, the address read into the
  query, the tab's status winning, the categories and the editors each read in one batch,
  the category counts read under the tab's status and query and reaching the panel, a
  private spell badged Private (M10.13), and the pager's link.
- `tests/components/CovenNav/index.test.tsx`: the Grimoire link, current on Drafts too.
- `tests/e2e/grimoire-facets.spec.ts`: the four facets in the address and the panel, another
  member's private phase not suggested, the Compact switch and axe.
- `tests/e2e/stories/06-grimoire.spec.ts`: story 56 in the browser, a private spell listed
  for its author alone.
- Visibility, search, categories and counts are proved below the page, in
  `tests/db/repository/readable-spell-page.test.ts` and
  `tests/modules/grimoire/services/spell-reads.test.ts`.

## Search parameters

The grimoire takes the compendium's search text and its category filter with the match mode as they are, so the filter row and the pager write the grimoire's address as they write every other list's (see "The parameter table" in `ingredient-search.md`). There is no status parameter, because Spells and Drafts are two addresses. Four facets sit beside them:

- Moon Phases and Days of the Week are free text, a spell's own words, so an uncurated value stays valid.
- Visibility is one of a fixed pair.
- Coven Members holds the ids of the members who made the spells; each is checked as an id and a repeat is dropped.
