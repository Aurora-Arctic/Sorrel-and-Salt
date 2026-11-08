# HelpOutline

`src/components/HelpOutline/` draws Keepers › Help (`/keepers/help`, `src/app/(shell)/keepers/help/page.tsx`) as an outline. The guides sit on the left by audience, with the FAQ and the Glossary under them. The chosen one's rows sit on the right. The page calls `requireAdminSession()`. A row's edit link and Add Help Article open [`HelpArticleForm`](help-article-form.md) on its own page.

## The address

`keepersHelpHref(filter, view, cursor)` (`href.ts`) writes every link, and leaves out the defaults.

- **The filter:** `q` (words in the title or the body), `kind`, `audience` and `shown` (`shown`, the default and so left out, `hidden` or `all`).
- **The view:** `guide=<id>`, or `view=faq` or `view=glossary`. Without one, or with one the filter no longer admits, the page shows the first guide the filter admits, then the FAQ, then the glossary, then an empty notice.
- **A search** (`q` set) replaces the right pane with the hits, 25 to a page through the cursor helper (`after`, `before`), each sub page naming its guide. No left-pane entry is marked current while it shows.

## The reads

SQL narrows every list through `listKeeperHelpArticles` (`claude-docs/design-decisions/support.md`, "Showing and hiding, and a parent's children"); the page only groups sub pages under their guides.

- **Guides** are the top-level articles (`topLevel`) by audience, Public, then Staff, then Keeper, and by position within each (`byAudience`, `src/lib/help-audience.ts`). A guide's place ("Position 1 of 3") counts every live guide in that order, whatever the filter, so it does not move as the filter changes. The chosen guide's facts line counts its sub pages, and says nothing for a guide with none.
- **Every guide** also goes to the bar as `order` (id, title, audience, shown), hidden ones and those the filter leaves out included: what Reorder Mode lists and Save Order writes.
- **The FAQ** is in position order and **the Glossary** A to Z.
- **The chosen guide** is read with `readKeeperHelpArticle`, so its table lists its sub pages in the guide's order. The table shows only those the filter admits, but `order` holds every live sub page's id, hidden and filtered out included.

## The parts

- **The filter** (`filter.tsx`) is the shared [`FilterForm`](filter-form.md). Kind, Audience and Shown are each a `ChoiceChip` group (`src/components/FacetPanel/choice-chip.tsx`, a `fieldset facet-chip__group`), and apply as they change. Each chip's first choice is its default and leaves its parameter out of the address: All for Kind and Audience, Shown for Shown. The search applies on the magnifier or Enter. Each change opens the first guide again, as a filter opens a list at its first page.
- **The Guides bar** (`guides-bar.tsx`) is the left pane. Under a "Guides" heading it lists the guides the filter admits as links, under a sub-heading for each audience that has any: Public, then Staff, then Keeper, each once. A link is the title alone, with no number, count or badge; a hidden guide's link is muted and ends in the shut eye (`eye.tsx`, `role="img"`, named "Hidden", with a 300ms tip). The FAQ and the Glossary follow under a hairline, with no heading. The current link is marked. On a phone, `guide-select.tsx` replaces the bar with one select whose every choice is an address, the guides grouped under their audiences.
- **Reorder Mode.** A quiet Reorder button sits beside the "Guides" heading, and on a phone beside the select, while there are two guides or more. It swaps the links for every live guide under its audience's sub-heading, each row a grip, its place in the whole order ("3.") and the eye if hidden. A guide moves only among its own audience's: each audience is its own sortable (`sortable.tsx`, on `src/lib/sortable`), so neither a drag nor a key carries a guide across. On a phone the mode opens as a sheet. "The order is not saved yet." shows once a guide has moved. Save Order (solid, off until a guide moves, "Saving Order" with a spinner while the lists are `aria-busy` and the grips off) sends the whole order once through `OrderHelpGuides`, then leaves the mode, refreshes and puts the focus back on Reorder. Cancel puts the saved order back, and so does Escape, outside a drag (where Escape puts the guide back) and while no save runs. A failure keeps the keeper's order and shows an alert, "Could not save the order. Your order is still here; try again or cancel.", with Try Again. The live region says "Reorder mode. Drag a guide by its handle, or focus it and press Space.", "Reordering cancelled. The order is as it was." and "Order saved.". Unsaved moves guard leaving the page.
- **`orderHelpGuides(ids)`** (keeper only) places every live top-level guide 1, 2, 3… in one write. It refuses a list that is not every live guide exactly once, and one that interleaves audiences rather than listing Public, then Staff, then Keeper. `orderHelpFaq(ids)` does the same for every live FAQ entry.
- **The right pane's header** gives the chosen guide's title, its address, its place ("Position 1 of 3") and Add Sub Page, which links `/keepers/help/new?parent=<id>`.
- **Each row** has its Edit link and a shown switch (`shown-switch.tsx`, the help wrapper of [`ShownSwitch`](help-article-form.md#shownswitch) around `SetHelpArticleShown`) in its corner. An audience other than Public shows as a badge. A hidden row has three marks: a muted title, the shut eye after it, and the switch's own shut lid.
- **The Glossary** is A to Z and has no order to set, so it is a plain `StackTable`.

## Ordering

`order-table.tsx` (`HelpOrderTable`) draws the chosen guide's sub pages and the FAQ as a stacking table with a grip on every row, always on: the first column, under a visually hidden "Order" heading, then Position. It writes `StackTable`'s markup itself, because `StackTable` takes cell functions from the server and a grip is a client hook. One sortable (`sortable.tsx`) wraps the whole table frame, since dnd-kit draws its instructions in a `div`, which a table may not hold.

- **A drop saves at once**, with no Save step: the sub pages through `UpdateHelpArticle`'s `childIds`, the FAQ through `OrderHelpFaq`. The write is the whole order (`order`), never the filtered table, because `childIds` releases to the top level any sub page it leaves out; a drop among the visible rows is placed within it.
- **While it saves**, the moved row's Position cell is `aria-busy` with a spinner and every grip is off. A save announces "Moved Testwort Basics to position 2." and refreshes.
- **A failure** springs the row back and shows an alert, "Could not move Testwort Basics. It is back where it was.", with Try Again, which sends the same move again.

`skeleton.tsx` is the page's loading face, at the outline's size.
