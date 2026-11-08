# HelpOutline

`src/components/HelpOutline/` draws Keepers › Help (`/keepers/help`, `src/app/(shell)/keepers/help/page.tsx`) as an outline. The guides sit on the left in reading order, with the FAQ and the Glossary under them. The chosen one's rows sit on the right. The page calls `requireAdminSession()`. A row's edit link and Add Help Article open [`HelpArticleForm`](help-article-form.md) on its own page.

## The address

`keepersHelpHref(filter, view, cursor)` (`href.ts`) writes every link, and leaves out the defaults.

- **The filter:** `q` (words in the title or the body), `kind`, `audience` and `shown` (`shown`, the default and so left out, `hidden` or `all`).
- **The view:** `guide=<id>`, or `view=faq` or `view=glossary`. Without one, or with one the filter no longer admits, the page shows the first guide the filter admits, then the FAQ, then the glossary, then an empty notice.
- **A search** (`q` set) replaces the right pane with the hits, 25 to a page through the cursor helper (`after`, `before`), each sub page naming its guide. No left-pane entry is marked current while it shows.

## The reads

SQL narrows every list through `listKeeperHelpArticles` (`claude-docs/design-decisions/support.md`, "Showing and hiding, and a parent's children"); the page only groups sub pages under their guides.

- **Guides** are the top-level articles (`topLevel`) in position order, each with its count of sub pages the filter admits. A guide is numbered by its place among every live guide, whatever the filter, so the numbers do not move as the filter changes.
- **The FAQ** is in position order and **the Glossary** A to Z, each with its count.
- **The chosen guide** is read with `readKeeperHelpArticle`, so its table lists its sub pages in the guide's order. The table shows only those the filter admits, but `order` holds every live sub page's id, hidden and filtered out included.

## The parts

- **The filter** (`filter.tsx`) is the shared [`FilterForm`](filter-form.md). Kind is a `ChoiceChip` group (`src/components/FacetPanel/choice-chip.tsx`, a `fieldset facet-chip__group`), and Kind, Audience and Shown apply as they change. The search applies on the magnifier or Enter. Each change opens the first guide again, as a filter opens a list at its first page.
- **The left pane** lists the guides and the other kinds as links, the current one marked. On a phone, `guide-select.tsx` replaces it with one select whose every choice is an address.
- **The right pane's header** gives the chosen guide's title, its address, its place ("Position 1 of 3") and Add Sub Page, which links `/keepers/help/new?parent=<id>`.
- **Each row** has its Edit link and a shown switch (`shown-switch.tsx`, the help wrapper of [`ShownSwitch`](help-article-form.md#shownswitch) around `SetHelpArticleShown`) in its corner. An audience other than Public shows as a badge. A hidden row has three marks: the lidded eye, a muted title and a Hidden badge.
- **Move Up and Move Down** (`move-buttons.tsx`) on each sub page write the guide's whole order back through `UpdateHelpArticle`'s `childIds`. `moved(order, index, by)` swaps the pair. The order is the guide's `order`, never the filtered table, because `childIds` releases to the top level any sub page it leaves out. A move announces itself and refreshes. A refusal shows under the buttons. Move Up is off on the first row and Move Down on the last.

`skeleton.tsx` is the page's loading face, at the outline's size.
