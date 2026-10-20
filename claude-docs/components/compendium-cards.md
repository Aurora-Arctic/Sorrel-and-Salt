# CompendiumCards

`src/components/CompendiumCards/` is the public compendium's list (M8.18; MB.80): the search and its filters, one `IngredientCard` per entry in an `IngredientCardList`, and the pager beneath. A page holds `CARD_PAGE_SIZE` (24) entries, which the page asks its read for, so the grid ends on a full row at one to four columns. It is the card-shaped sibling of the admin's `CompendiumList` table. Both are render-only: the page reads one page of entries under the address's filter and hands it over.

## Props

| Prop                                                    | What it does                                                                                 |
| ------------------------------------------------------- | -------------------------------------------------------------------------------------------- |
| `entries`                                               | One `CompendiumCardEntry` per card: name, slug, formal name, categories, forms, safety notes |
| `filter`, `facets`, `categories`, `vocabulary`, `total` | The same filter state the admin list takes; see [`compendium-list.md`](compendium-list.md)   |
| `previousHref`, `nextHref`, `position`                  | The pager's links and "Page X of Y"                                                          |
| `action`                                                | The foot of each card: `add` or `none`                                                       |
| `workspaceId`                                           | The switcher's coven, which the plus adds to; `add` with none draws no plus and no check     |
| `entries[].held`, `entries[].heldHref`                  | The coven holds the entry, and where the check leads (M9.12)                                 |
| `entries[].editHref`, `entries[].editHeading`           | A curator's Edit on the card, and the head of the dialog it opens (M8.17)                    |

## Contracts

- Each card is a plain link to `/compendium/ingredients/<slug>`, with no modal. Two entries sharing a label are told apart by the formal-name line the card draws.
- The list is regular density, never compact, and sits in `ListFrame` through `IngredientSearch shape="cards"`, so a page on its way draws `ListBody shape="cards"`.
- The filter is `CompendiumListFilter audience="public"`: no Classification facet and no No Refs or No Form control. Those are the curators' to-do lists ([`compendium-list.md`](compendium-list.md)).
- The foot of a card is one row, chosen by the page from the visitor. Its left end (`startActions` on `IngredientCard`) holds the add icons; its right end (`actions`) holds Edit. Where each sits is layout, so no test asserts it.
  - `add` with a `workspaceId` draws, for an entry not held, a **plus** (`PlusIcon`) button named and tipped Add to My Ingredients (`add-icon.tsx`'s `AddIcon`, a client component; the cards stay a server component). Until M9.12's dialog it adds directly, with no quantity: it sends `addCupboardEntry(workspaceId, ingredientId)` through `/api/graphql`, then reads the page again, which draws the check in its place. It is busy (the shared spinner in the icon's place, `aria-busy`) from the press until the page has been read again, and uses `aria-disabled` rather than `disabled` so the focus stays; a refusal is said in a callout under it ([`click-feedback.md`](click-feedback.md), M12.31). For an entry held (`held`), it draws a **check** (`CheckIcon`) link named and tipped In My Ingredients, to `heldHref` (`HeldLink`); a held entry with no `heldHref` shows neither.
  - `none`, or `add` with no `workspaceId`, draws neither, for an account that only views and for a visitor with no account, who signs in through the header (the owner's call, 2026-10-19).
  - Edit, an `EditLink` named for the entry's name and formal name, sits at the right when the entry carries an `editHref` and an `editHeading` (M8.17). The page gives them to a curator alone.
- With no entries it draws the filter's empty sentence (`emptyText`) instead of a list.

## The page

`src/app/(public)/compendium/page.tsx` draws it per request over the cached reads in `src/app/compendium-reads.ts`, which the admin page shares. The reads take no session, so every card and link is in the server HTML. The page asks for the viewer to choose `action` and the coven: `add` when any of the viewer's coven memberships `canWrite` (the per-role statement in `viewerFor`, never a comparison of role names), `none` otherwise, with no session included. The coven, passed as `workspaceId`, is the first such membership in the switcher's order: `/compendium` names no coven in its address, so the page takes M8.16's choice for a page without one (`destinationsOf`).

**Held (M9.12).** For that coven the page also asks which of the page's entries it already holds, through `heldCompendiumEntryIds` (the ingredients module), one read of `workspace_compendium_entries` for the page's ids, and gives each entry `held` and `heldHref`, the coven's Ingredients list filtered to the entry's name (`covenIngredientsHref`). The read is per viewer and sits beside the cached ones, never inside them (rule 6). A visitor, an account that only views and one in no coven are asked nothing and get neither field. A refusal reads as nothing held, so the plus shows and the add itself says no.

**A curator's Edit (M8.17).** An admin or curator (`canCurate`) gets Edit on each card: the search's own address with `?edit=<slug>`, which opens the admin Compendium's edit dialog (`CompendiumDialog`, given `path="/compendium"`) over the results, headed Edit Compendium Entry. Close or a save comes back to the same search, the query and page kept, inside a `RouteModalProvider` so a press opens the dialog at once. `?edit=` is read only once the viewer is known to curate, through the admin page's own `readEditPlace` and `readCompendiumEntry`: an old slug redirects to the new one, and a slug naming nothing shows `MissingNotice` over the list. For a visitor or any other account there is no Edit, and `?edit=` opens nothing and reads nothing. The list's reads are unchanged, cached and sessionless, keyed by the address alone, whoever asks (rule 6).

`?withoutReferences=1` and `?withoutForms=1` are dropped before the address is read, so it lists what the unfiltered page lists. `generateMetadata` marks a filtered view `noindex` with the canonical address `/compendium`; the unfiltered list and its pages stay indexable.

## Stories and tests

Stories: `Can Add`, `Held`, `Can Add And Edit`, `Curator Can Edit`, `Viewer Only`, `Mid List`, `Empty`. Tests: `tests/components/CompendiumCards/index.test.tsx` and `tests/app/(public)/compendium/page.test.tsx`; the browser flow is `tests/e2e/public-compendium.spec.ts`.

Each `CompendiumCardEntry` carries `recency` (`new`, `updated` or null), worked out by the page with `entryRecency` and shown by the card's `EntryMarks` (MB.106).
