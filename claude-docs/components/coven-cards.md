# CovenCards

`src/components/CovenCards/` is a coven's Ingredients list (M9.6): the search and its filters, one compact `IngredientCard` per entry of the coven's cupboard in an `IngredientCardList`, and the pager beneath. It is the coven's twin of [`CompendiumCards`](compendium-cards.md) and, like it, render-only: the page reads one page of the cupboard under the address's filter and hands it over. A page holds `CARD_PAGE_SIZE` (24) entries.

## Props

| Prop                                                    | What it does                                                                                             |
| ------------------------------------------------------- | -------------------------------------------------------------------------------------------------------- |
| `covenSlug`, `workspaceId`                              | The coven's address segment, which builds every link, and its id, which the type-ahead and counts read   |
| `entries`                                               | One `CovenCardEntry` per card: the coven's label, formal name, forms, categories, kind, flags and jars   |
| `filter`, `facets`, `categories`, `vocabulary`, `total` | The filter state of [`compendium-list.md`](compendium-list.md), with Source, In Stock and Low Stock Only |
| `previousHref`, `nextHref`, `position`                  | The pager's links and "Page X of Y"                                                                      |
| `canAdd`                                                | The viewer may add to this coven, so an empty cupboard offers the first add                              |

## Contracts

- Each card is a plain link to `/coven/<slug>/ingredients/<entry id>`, with no modal. `label` is what the coven calls the entry (its cupboard row's label where one is set), so the card shows the coven's name, not the compendium's.
- `kind` is `own` for an entry the coven made, `cupboard` for a compendium entry its cupboard names. `annotated` (the cupboard row overrides a field) and `retired` (the curators retired the entry) draw their marks on the card.
- The list is `density="compact"`. The Compact switch that lets a member turn it off is [`card-density-switch.md`](card-density-switch.md); the coven filter row draws it (`CompendiumListFilter`, `audience="coven"`), inside the search landmark; the admin and public lists have none.
- The card's `children` hold the entry's jars as [`JarLines`](jar-lines.md), one line per jar. The `actions` foot stays empty until Edit and Delete exist.
- The filter is `CompendiumListFilter audience="coven"`: it adds Source, In Stock and Low Stock Only, submits to `/coven/<slug>/ingredients`, suggests names from the coven's cupboard, and a pick opens the entry's page in the coven.
- With no entries it draws `EmptyCupboard` (`empty.tsx`) instead of a list, below.

## The empty and no-match states

With no card to show, the list draws one of two regions (M9.11). Each is a `role="status"` region, so a screen reader announces it, and each has its own name, so a test tells them apart by which one is present rather than by its words:

| Region           | When                                         | What it holds                                                                                      |
| ---------------- | -------------------------------------------- | -------------------------------------------------------------------------------------------------- |
| `No Ingredients` | No filter is in force: the cupboard is empty | "There are no ingredients here yet." and, when `canAdd`, an Add Ingredient button                  |
| `No Matches`     | A filter is in force and matched nothing     | "Change or clear the filter to see more." and, when the filter has a search, Search the Compendium |

- **Which state** is the search sentence's own test: `buildSearchSentence(...).hasFilter` (`IngredientSearch/sentence.ts`), with the filter normalised as the filter row normalises it. It counts the coven's own filters too (Source, In Stock, Low Stock Only), so an In Stock filter over a cupboard with nothing in stock reads as no match, not as an empty cupboard, and the region never disagrees with the sentence above it.
- **No Matches says only what to do.** The search sentence above the list already names every filter and says nothing matched ("No ingredients, matching “Knitbone”"), so the region does not repeat it. Its one sentence is `NO_MATCH_HINT` from `src/lib/text.ts`, the same advice that ends `noMatchText` on the admin lists; `noMatchText` itself is not used, because it always opens by naming the filters, which is exactly the repetition. The advice points at the filter row's own clears (Clear Name in the search box, the facet panel's Clear All), and the region draws no clear control of its own.
- **Add Ingredient** (`first-add.tsx`) does not build a dialog. It writes `?new=<slug>` into the address with `openHref` from `AppShell/add-href.ts`, and the shell's Add Ingredient control opens its dialog for this coven ([`modal.md`](modal.md), "Add Ingredient"). The page passes `canAdd` from the same permission that control checks (`ingredient: create` and `inventory: update`), so a viewer gets the sentence and no button.
- **Search the Compendium** is a link styled as the filled primary button (`.btn .btn--solid`), going to `/compendium?query=<the search>`: a search that found nothing in the cupboard may still be in the Compendium. A filter with no search, such as In Stock alone, has nothing to hand on, so it is not drawn.
- **Layout** (`index.scss`, the owner's call): the empty cupboard's sentence and button are centred, set larger (the sentence at `heading-size(4)`, the button's label at body size) and set down `space(7)` from the filter row. No Matches stays at the list's left edge.

## The page

`src/app/(shell)/coven/[slug]/ingredients/page.tsx` draws it per request. It first calls `requireCovenMembership`, which sends a non-member to a 404, then reads through `reads.ts`. Nothing here is cached: a cupboard is workspace-scoped.

The page hands the `Membership` that guard returns to `readCovenIngredients`, which passes it as `heldBy` to the forms and categories reads (the entry page's rule, M12.24). That is what lets a card for a retired compendium entry the coven still holds show its forms and category chips: without the proof the services refuse a retired parent. The proof admits a retired entry only where this coven's live cupboard row names it. The read is wrapped in React's `cache`, keyed by the coven id, the filter, the cursors and the `Membership` object itself, which is the same object all request because `requireCovenMembership` is cached per slug.

## Stories and tests

Stories: `Default`, `Mid List`, `Empty`, `Empty for a Viewer`, `No Matches`. Tests: `tests/components/CovenCards/index.test.tsx` and `tests/app/(shell)/coven/[slug]/ingredients/page.test.tsx`.
