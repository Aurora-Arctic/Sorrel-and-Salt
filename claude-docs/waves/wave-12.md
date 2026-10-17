# Wave 12 — Ingredient UI

M8's UI half, on M4's schema, M5's services and M3's GraphQL, with M9's beside it. One concern has one owner:

- M8.13 owns the URL-state mechanism every filter plugs into, and the element filter
- M12.4 owns every facet control, Forms included
- M9.7 owns source (local vs compendium) and in-stock-only, both of which need M9 data
- M9.8 owns low-stock badging
- M8.13a owns safety presentation project-wide, the toxic badge included; M8.14, M8.19 and M10.18 consume it unmodified
- M8.14 is the card shell, with a jar-line slot that M9.6 fills
- M8.10 builds the `IngredientSearch` shell the filters above plug into

Hence the order M8.10, M8.13, M8.11, M8.12, M12.3, M12.4, M8.13a, M9.7, M9.8, M8.14: the shell comes first, then the URL mechanism every filter needs, then the facet controls, and M8.13a lands before its three consumers, so every one of M8.14's dependencies lands before it. Editing is never in the shell (MB.7), so M8.16's Add dialog is reached from the global Add Ingredient button, and M8.17's Edit from a list row and the entry page.

**Decided by the Wave 12 review (2026-10-16):**

1. The public layout reads the session when there is one and renders the right chrome on the server; there is no client island and no `me` call.
2. The coven Ingredients list is a card per ingredient with a jar line per held form, so `IngredientCard` serves both the public compendium and the coven page.
3. Add Ingredient and Add to My Ingredients target the switcher's current coven, with a coven select only when the viewer is in more than one.
4. A jar carries over to a local entry that hides its compendium entry, which is the new task M12.8. Where the local already holds a jar of that form the two merge, and when their units differ the member chooses how, never the code.
5. M8.15 is retired into M8.19.
6. MB.84 ships without the Open Graph image, which M11.16 adds in Wave 15; MB.83 makes the asset paths public so a favicon never redirects.
7. M6.18 shows a relative time with the absolute date visible, worked out on the client.
8. M12.1 folds the folk-name id change in.

**M12.8 follows M8.9**, minted 2026-10-16 on the Wave 12 review (decision 4). It is a service change with no UI, so it lands early, ahead of the pages that would otherwise need it: M8.16's save status names a jar it carried over, and M9.6 and M9.12 add and show jars on entries a local may hide. M8.17 asks the member how to merge two jars of one form when their units differ, so it carries that half.

**M12.3 and M12.4 follow M8.13** (minted 2026-10-15 on the owner's backlog): M12.3 reads the count each filter value would give, over the list arguments M11.22 adds in Wave 11 and M8.12's category mode, and M12.4 puts the facet chips, their counts and the one-sentence summary of the search on `IngredientSearch`, through M8.13's URL state, so both land before M8.18 and M9.6 compose the search.

**MB.83 precedes M8.18**, which sits in the public route group it builds: the group's layout, the Compendium link in the shell, and the public paths in the proxy. **MB.155 follows M8.19**, minted during MB.127: it renders an entry's references beneath its substitutes and above the slot v2's notes take, on the page M8.19 builds and in the Chicago form MB.153's API renders, so it lands once the page exists and before MB.84 indexes it. **MB.106 precedes MB.84**: MB.84's `lastModified` and MB.106's Updated marker must share one definition of "modified", and MB.106 settles it (the `updated_at` trigger skips a no-op, and the ingredient service touches the parent after a child-list change). Its New and Updated markers sit on M8.18's cards and M8.19's entry page, so it follows both. **MB.84 follows MB.106 and M8.19**, since both compendium pages must exist before they can carry metadata and appear in the sitemap. **M12.2 follows MB.84**, minted 2026-10-15 on the owner's backlog: `llms.txt` and `ai-catalog.json` list the same entries as the sitemap and take the same off-production rule, so they reuse the slug read MB.84 builds. The noindex rule off production is MB.83's. M5.4's design reviews each follow the last task of their section: **MB.120 follows M12.2** and **MB.121 follows M12.1**, with **M12.1 after M12.5 and before MB.121**: M12.1 puts the promote control on the ingredient form once every other change to that form has landed, so MB.121's review covers it. The Wave 11 review minted it on 2026-10-13 as the UI half of M8.3a. The nav's own review, MB.122, was folded into MB.7 in Wave 9 and retired ([wave-09.md](wave-09.md)). **MB.85 closes the wave**, once every page story 63 walks has landed ([`design-decisions/mb.80-public-compendium.md`](../design-decisions/mb.80-public-compendium.md)). MW.12 is retired (MB.31).

**M8.17 follows M9.6**, because Edit is reached from a list row, which M9.6 builds, and from the entry page M8.19 builds; it is never in the shell (MB.7). **M9.9 and M9.10 follow M8.17** and **M9.11 and M9.12 follow M9.10**: the jar editor, the Delete action, the empty states and the stock dialog all sit on M9.6's list, and M9.12 reuses the dialog rule M8.16 sets. M8.15 is retired into M8.19, so the read-only mode it asked for is the entry page.

**M6.18 follows M9.9**, moved here from Wave 9 on 2026-10-12, the owner's call. It shows who last edited a row, but the rows it annotates are built here: the card (M8.14) and the ingredients page (M9.6), over `workspaceIngredients` and `Ingredient.stock`, which M9.3 and M9.4 land in Wave 11. A compendium entry reaches a coven only as a stock row the coven owns, so the editor to show is that row's, a member of the coven, and never the compendium entry's own, which an admin last edited. A local entry with no stock row shows the local ingredient's editor.

**M12.5 follows M9.12 and precedes M12.1** (minted 2026-10-16 on the owner's backlog): a name in the coven Ingredients list (M9.6) and the admin Compendium list opens the detail page's content in a modal, with an Edit button into M8.17's modal where the viewer may edit. It lands after M9.12 so the modal opens the finished ingredient form, and before M12.1 so the promote control M12.1 adds is in the form it opens. The public `/compendium` list (M8.18) opens no modal, to stay crawlable.

**M12.6 and M12.7 open the wave** (minted 2026-10-16 on the owner's backlog): a form group carries an icon, and every list of forms shows it. They come first so that M8.13's filter, M8.14's card, M8.18, M8.19, M9.6 and M12.4 use the form icon component when they are built, not in a second pass. M8.9 follows them as the story scaffold.

**M12.9 follows M12.7 and M12.10 follows M12.5** (minted 2026-10-16 on the owner’s question): undo and redo in the forms. M12.9 builds the shared history hook, its Undo and Redo buttons and the keyboard chords, and wires them into the two admin forms, right after M12.7 last touches those forms for the glyphs. M12.10 wires the ingredient form, after M12.5 so the form the detail modal opens is the one it changes, and before M12.1 and MB.121 so the promote control and the design review meet a form whose undo is already there. The reasoning and the models set aside are in [m12.9-plan.md](../design-decisions/m12.9-plan.md).

**M12.11 follows M8.13** (minted 2026-10-17 from the M12.9 PR’s CI run): the Vitest log loses its noise, each source fixed where it starts, and a guard fails a `dom` test that logs a console error or warning it did not declare. It sits after the work already started, since nothing else in the wave waits on it, and the guard lands as early as it can be written (the sweep-task rule).
