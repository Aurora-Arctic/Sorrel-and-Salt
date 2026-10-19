# CompendiumCards

`src/components/CompendiumCards/` is the public compendium's list (M8.18; MB.80): the search and its filters, one `IngredientCard` per entry in an `IngredientCardList`, and the pager beneath. It is the card-shaped sibling of the admin's `CompendiumList` table. Both are render-only: the page reads one page of entries under the address's filter and hands it over.

## Props

| Prop                                                    | What it does                                                                                 |
| ------------------------------------------------------- | -------------------------------------------------------------------------------------------- |
| `entries`                                               | One `CompendiumCardEntry` per card: name, slug, formal name, categories, forms, safety notes |
| `filter`, `facets`, `categories`, `vocabulary`, `total` | The same filter state the admin list takes; see [`compendium-list.md`](compendium-list.md)   |
| `previousHref`, `nextHref`, `position`                  | The pager's links and "Page X of Y"                                                          |
| `action`                                                | The foot of each card: `add` or `none`                                                       |

## Contracts

- Each card is a plain link to `/compendium/ingredients/<slug>`, with no modal. Two entries sharing a label are told apart by the formal-name line the card draws.
- The list is regular density, never compact, and sits in `ListFrame` through `IngredientSearch shape="cards"`, so a page on its way draws `ListBody shape="cards"`.
- The filter is `CompendiumListFilter audience="public"`: no Classification facet and no No Refs control. Those are the curators' to-do lists ([`compendium-list.md`](compendium-list.md)).
- The foot of a card is chosen by the page, from the visitor:
  - `add` is a real `<button>` named Add to My Ingredients, **disabled** until M9.12 builds the dialog it opens (the owner's call, 2026-10-19). It is for a signed-in owner or member of at least one coven.
  - `none` draws nothing, for an account that only views and for a visitor with no account, who signs in through the header (the owner's call, 2026-10-19).
- With no entries it draws the filter's empty sentence (`emptyText`) instead of a list.

## The page

`src/app/(public)/compendium/page.tsx` draws it per request over the cached reads in `src/app/compendium-reads.ts`, which the admin page shares. The reads take no session, so every card and link is in the server HTML. The page asks for the viewer only to choose `action`: `add` when any of the viewer's coven memberships `canWrite` (the per-role statement in `viewerFor`, never a comparison of role names), `none` otherwise, with no session included.

`?withoutReferences=1` is dropped before the address is read, so it lists what the unfiltered page lists. `generateMetadata` marks a filtered view `noindex` with the canonical address `/compendium`; the unfiltered list and its pages stay indexable.

## Stories and tests

Stories: `Can Add`, `Signed Out`, `Viewer Only`, `Mid List`, `Empty`. Tests: `tests/components/CompendiumCards/index.test.tsx` and `tests/app/(public)/compendium/page.test.tsx`; the browser flow is `tests/e2e/public-compendium.spec.ts`.
