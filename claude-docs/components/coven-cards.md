# CovenCards

`src/components/CovenCards/` is a coven's Ingredients list (M9.6): the search and its filters, one compact `IngredientCard` per entry of the coven's cupboard in an `IngredientCardList`, and the pager beneath. It is the coven's twin of [`CompendiumCards`](compendium-cards.md) and, like it, render-only: the page reads one page of the cupboard under the address's filter and hands it over. A page holds `CARD_PAGE_SIZE` (24) entries.

## Props

| Prop                                                    | What it does                                                                                             |
| ------------------------------------------------------- | -------------------------------------------------------------------------------------------------------- |
| `covenSlug`, `workspaceId`                              | The coven's address segment, which builds every link, and its id, which the type-ahead and counts read   |
| `entries`                                               | One `CovenCardEntry` per card: the coven's label, formal name, forms, categories, kind, flags and jars   |
| `filter`, `facets`, `categories`, `vocabulary`, `total` | The filter state of [`compendium-list.md`](compendium-list.md), with Source, In Stock and Low Stock Only |
| `previousHref`, `nextHref`, `position`                  | The pager's links and "Page X of Y"                                                                      |

## Contracts

- Each card is a plain link to `/coven/<slug>/ingredients/<entry id>`, with no modal. `label` is what the coven calls the entry (its cupboard row's label where one is set), so the card shows the coven's name, not the compendium's.
- `kind` is `own` for an entry the coven made, `cupboard` for a compendium entry its cupboard names. `annotated` (the cupboard row overrides a field) and `retired` (the curators retired the entry) draw their marks on the card.
- The list is `density="compact"`. The Compact switch that lets a member turn it off is [`card-density-switch.md`](card-density-switch.md); the coven filter row draws it (`CompendiumListFilter`, `audience="coven"`), inside the search landmark; the admin and public lists have none.
- The card's `children` hold the entry's jars as [`JarLines`](jar-lines.md), one line per jar. The `actions` foot stays empty until Edit and Delete exist.
- The filter is `CompendiumListFilter audience="coven"`: it adds Source, In Stock and Low Stock Only, submits to `/coven/<slug>/ingredients`, suggests names from the coven's cupboard, and a pick opens the entry's page in the coven.
- With no entries it draws the filter's empty sentence (`emptyText`) as plain text. The empty state proper is M9.11.

## The page

`src/app/(shell)/coven/[slug]/ingredients/page.tsx` draws it per request. It first calls `requireCovenMembership`, which sends a non-member to a 404, then reads through `reads.ts`. Nothing here is cached: a cupboard is workspace-scoped.

## Stories and tests

Stories: `Default`, `Mid List`, `Empty`. Tests: `tests/components/CovenCards/index.test.tsx` and `tests/app/(shell)/coven/[slug]/ingredients/page.test.tsx`.
