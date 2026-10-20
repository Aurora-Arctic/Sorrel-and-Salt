# CovenCards

`src/components/CovenCards/` is a coven's Ingredients list (M9.6): the search and its filters, one compact `IngredientCard` per entry of the coven's cupboard in an `IngredientCardList`, and the pager beneath. It is the coven's twin of [`CompendiumCards`](compendium-cards.md) and, like it, render-only: the page reads one page of the cupboard under the address's filter and hands it over. A page holds `CARD_PAGE_SIZE` (24) entries.

## Props

| Prop                                                    | What it does                                                                                                                                             |
| ------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `covenSlug`, `workspaceId`                              | The coven's address segment, which builds every link, and its id, which the type-ahead and counts read                                                   |
| `entries`                                               | One `CovenCardEntry` per card: the coven's label, formal name, forms, categories, kind, flags and jars, and where Edit opens (`editHref`, `editHeading`) |
| `filter`, `facets`, `categories`, `vocabulary`, `total` | The filter state of [`compendium-list.md`](compendium-list.md), with Source, In Stock and Low Stock Only                                                 |
| `previousHref`, `nextHref`, `position`                  | The pager's links and "Page X of Y"                                                                                                                      |

## Contracts

- Each card is a plain link to `/coven/<slug>/ingredients/<entry id>`, with no modal. `label` is what the coven calls the entry (its cupboard row's label where one is set), so the card shows the coven's name, not the compendium's.
- `kind` is `own` for an entry the coven made, `cupboard` for a compendium entry its cupboard names. `annotated` (the cupboard row overrides a field) and `retired` (the curators retired the entry) draw their marks on the card.
- The list is `density="compact"`. The Compact switch that lets a member turn it off is [`card-density-switch.md`](card-density-switch.md); the coven filter row draws it (`CompendiumListFilter`, `audience="coven"`), inside the search landmark; the admin and public lists have none.
- The card's `children` hold the entry's jars as [`JarLines`](jar-lines.md), one line per jar. The `actions` foot holds Edit, an `EditLink` named for the entry's label and formal name (two entries can share a label), when the entry carries an `editHref`, the list's own address with `?edit=<id>`, and an `editHeading`, the dialog's head shown at once over a skeleton while the form loads (M8.17). Beside it, a compendium entry the coven holds draws Annotate, an `AnnotateLink` named the same way, when the entry carries an `annotateHref`, the list's own address with `?annotate=<id>` (M8.17). Its icon, `AnnotateIcon` in `src/components/IconTip/icons.tsx`, is an open book with a pencil, the owner's choice, drawn at stroke width 1.25 rather than the set's 1.5 (the owner's call, 2026-10-19). A coven's own entry is deleted from its Edit dialog (M8.17); the card's own Delete waits for M9.10.
- The filter is `CompendiumListFilter audience="coven"`: it adds Source, In Stock and Low Stock Only, submits to `/coven/<slug>/ingredients`, suggests names from the coven's cupboard, and a pick opens the entry's page in the coven.
- With no entries it draws the filter's empty sentence (`emptyText`) as plain text. The empty state proper is M9.11.

## The page

`src/app/(shell)/coven/[slug]/ingredients/page.tsx` draws it per request. It first calls `requireCovenMembership`, which sends a non-member to a 404, then reads through `reads.ts`. Nothing here is cached: a cupboard is workspace-scoped.

The page hands the `Membership` that guard returns to `readCovenIngredients`, which passes it as `heldBy` to the forms and categories reads (the entry page's rule, M12.24). That is what lets a card for a retired compendium entry the coven still holds show its forms and category chips: without the proof the services refuse a retired parent. The proof admits a retired entry only where this coven's live cupboard row names it. The read is wrapped in React's `cache`, keyed by the coven id, the filter, the cursors and the `Membership` object itself, which is the same object all request because `requireCovenMembership` is cached per slug.

**Edit on the list (M8.17).** A member whose role may update ingredients gets Edit on each card for the coven's own entry; a compendium entry in the cupboard and a viewer get none. Edit's address keeps the filter and the page, so the entry page's edit dialog (`EntryDialog`, [`ingredient-entry.md`](ingredient-entry.md)) opens over the list as it was, and Close or a save comes back to it. `readEditedEntry` in `reads.ts` reads the entry `?edit` names as the signed-in member, with `entryValues` for the form. It returns nothing, and so opens no dialog, for an id the coven cannot reach or for a compendium entry, and the page reads nothing at all for a viewer's `?edit`.

**Annotate on the list (M8.17).** The same member gets Annotate on each card for a compendium entry the coven holds, a retired one included, and none on the coven's own entries. `?annotate=<id>` opens the entry page's Annotate dialog over the list, through the one `AnnotateDialog` (`src/components/IngredientEntry/annotate-dialog.tsx`) the entry page draws too, and Close or a save comes back to the list as it was. The dialog's **More** menu (the owner's label, 2026-10-19), or its lone button when only one is allowed, offers Make It Ours, which goes to the new own entry's page, and Remove, which removes the entry from the cupboard and comes back to the same search without its card; each is offered on the member's permission ([`ingredient-entry.md`](ingredient-entry.md), "Cupboard buttons"). `heldCompendiumEntry` reads the entry under the coven's proof, as the entry page does; an own entry, one the coven does not hold, or a viewer's `?annotate` opens nothing, and a viewer's reads nothing.

## Stories and tests

Stories: `Default`, `Mid List`, `Empty`, `With Edit`, `With Annotate`. Tests: `tests/components/CovenCards/index.test.tsx` and `tests/app/(shell)/coven/[slug]/ingredients/page.test.tsx`; the browser flow for Annotate on the list is in `tests/e2e/coven-ingredients.spec.ts`.
