# SpellRecipe

A saved spell as a page at `/coven/[slug]/grimoire/[id]`, and the shared body the grimoire's Quick Look modal draws. `src/components/SpellRecipe/` holds the presentational parts; `src/app/(shell)/coven/[slug]/grimoire/[id]/` holds the page. Props are in `src/components/SpellRecipe/types.ts`.

## Contracts

### The page

- It calls `requireSession()` itself (the shell layout does not cover it) and `requireCovenMembership`, which gives a non-member a 404.
- `readSpell(session, workspaceId, id)` raising `NotFound` or `Forbidden` both become a 404, so another member's private spell and another coven's spell look like one that does not exist. Visibility is filtered in SQL.
- Steps, assigned categories and the last editor's name come from services, never GraphQL, and nothing is cached. The page and the modal both read through `readRecipeOf` (`grimoire/recipe-read.ts`).
- Its wait is the page's own skeleton, `SpellRecipeSkeleton` in `src/app/(shell)/coven/[slug]/skeleton.tsx`, registered for this path ([`loading.md`](../loading.md), "How a skeleton is chosen").

### The body

- **Order.** Back link (the ingredient entry's `BackLink`, [`ingredient-entry.md`](ingredient-entry.md); the Drafts tab counts as the list for the way back through history), `LastEdit` above the title, the title with the Draft and Private badges, then the intent, every category chip (`showAll`, no +N fold), the facts strip, the steps and the note.
- **Facts strip.** A blank or null value draws no cell; none set draws no strip. The moon phase draws nothing for a phase outside the builder's list.
- **No Ingredients section on screen.** The steps carry the amounts. The print layout adds the summary (see Print).
- **Steps** are an `ol` named Steps with no visible heading, in `position` order. The position column is `$step-position-width` (1.5rem): room for two digits, and wider read as an indent. `StepRow` draws every step with no editing controls, so the page and the modal read steps as the builder draws them, and the body keeps no step renderer of its own. The form is stored lower case and set in title case by the component. The form icon is hidden here, as the step view carries no form group.
- **A one-off ingredient** shows its own name and form and the One-Off badge, with no eye and no safety mark.
- **Formal name** shows in brackets only where two different ingredients in the spell share a label. The same ingredient in two forms does not get one.
- **The note** is drawn only when there is one. The strip and the list are capped at the paragraphs' `$measure`, so the two hairlines end together.
- **Quick Look eye.** On the page a step carries none: the side column's In the Cupboard line carries it, and `SpellRecipe` hands the body its steps with `look` cleared. In the Quick Look modal, which has no side column, an eye sits beside the name, in a 24px box (the WCAG 2.2 target). It opens the ingredient's details (`DetailsDialog`) over the spell without leaving it, at the tab's address with `?spell=<id>` kept and `&entry=<id>` added, read with the Ingredients page's `readViewedEntry` and drawn with `viewedDetailsOf`, without the card's actions. An ingredient deleted since, or one the service withheld ("Unavailable Ingredient"), gets no eye.
- **Heading level.** The Steps heading and `SpellRecipeSummary`'s Ingredients heading take a `level` (2 or 3, default 2), one below the heading they sit under: 2 under the page's h1, 3 under a dialog's or pane's h2. The Quick Look and the Spell Preview pane pass `level={3}`. The styles that place or hide the headings match either level.
- **A spell search row's** `match` reuses `IngredientSearchMatch`, with `slug` set to the spell id.

### The actions row

- The `action` slot takes the page's controls in a `.spell-recipe__actions` row at the heading's end, icon buttons only: Record a Working, Edit, Preview, and a three-dots menu.
- Edit is an `EditLink` to `?edit=<id>` for a role that may update the spell; the page renders the spell builder's dialog over it, closing back to the page. Preview ([`spell-preview.md`](spell-preview.md)) is for every role.
- `SpellMoreMenu` (`more-menu.tsx`) holds Duplicate, Print and Delete, in that order. Print is for every role; Duplicate and Delete only for a role that may do them. A role that may do neither (an observer) gets Print as its own icon button (`print-button.tsx`) rather than a menu of one. The service refuses an observer's edit and delete by id. The spell card uses the same menu with `canPrint={false}`, which returns nothing when empty.
- **Duplicate** (`useDuplicateSpell`) is for a role that may create a spell (`canDuplicate`, separate from the dialog's `canCreate`). `duplicateSpell` makes a private draft titled with " (Copy)" added, then the browser goes to the grimoire's Drafts tab with the copy's builder open (`/grimoire/drafts?edit=<id>`, `copied-href.ts`). The dots are busy from the choice until the copy opens, so it cannot run twice. It asks nothing first, so no dialog needs its focus returned. A refusal is the callout under the menu.
- **Delete Spell** (`delete-spell.tsx`) asks in a `Modal`, as a coven's own ingredient's page asks, not a `ConfirmQuestion`, which asks over a form. The question (`DeleteSpellWords`, which the builder's bin asks too) says a shared spell leaves the grimoire for every member; a caller that passes no `visibility` gets the private line, which is true of either. A shared spell can be deleted: the visibility lock governs widening, not existence. Confirmed, `deleteSpell` runs and the page leaves, replacing its history entry so Back does not return to a 404, for the tab the spell was listed on (Spells, or Drafts for a draft) with `?deleted=<name>` (`deleted-href.ts`), which the tab says in a Notice ([`grimoire-list.md`](grimoire-list.md)). The Modal, gone with the page, gives the focus to the list's heading. A cancelled dialog returns the focus to the three dots.

### The jump menu

- The page carries the shared `PageNav` ("On This Page", [`page-nav.md`](page-nav.md)) in the ingredient entry page's grid (`entry-nav-grid`). The Quick Look modal has no menu.
- From a phone's width up the menu is the left column, sticky, spanning the lead's row and the columns' (`grid-row: 2 / span 2`) so it has room to stick. Below that it stacks above the sections, after the intent and categories and over the facts, in the source too, so the keyboard and a screen reader meet the chips before the menu (WCAG 2.2 SC 2.4.3).
- The page draws the body's two boxes apart (`body.tsx` exports both); Quick Look and the Preview pane draw them together through the default `SpellRecipeBody`. The text is capped at `$recipe-column` (`$measure`, the gutter and the side column with the jar).
- Each entry is present only where its section is drawn, and the menu is left out when none is. The two jar entries are `narrowOnly`, and `PageNav` hides a group whose entries all are, label included: from a tablet up the jar stands beside the recipe; below it the jar stacks above Workings, as the menu lists it, and comes before Workings in the source too (SC 2.4.3). From a tablet up the columns place the rest and Workings in the text column by explicit row, with the jar spanning both, so no `order` rule moves a section.
- The ids are `sections.ts`'s constants, which the steps list, `SpellWorkings`, the aside and the two panels (their optional `id` prop) carry, each with a scroll margin under the shell's bar.
- Print hides the menu (`.page-nav` in `_print.scss`), and the nav column is a screen-only rule, so the printed sheet is unchanged.

### Print

- Print is the "Print" item of the page's `SpellMoreMenu`, or its own button for a role whose menu would hold nothing else. `SpellRecipe` draws neither itself.
- `SpellRecipeSummary` draws an Ingredients list, one line per form in the order of its first step. Each line has the total amount (`needOf`, in the first step's unit when the form's units are of one dimension, otherwise listed with "+"), the label and, where two ingredients share a label, the formal name. It is `display: none` on screen and shows in print and in the Preview pane.
- `src/scss/_print.scss`, the one print stylesheet, sits behind `:has(.spell-recipe)`, so no other page changes; a browser without `:has()` prints the screen layout. The recipe's sheet is A4, a named page (`@page recipe`) that only the recipe's body takes, so every other page prints on the reader's own paper. Both are enhancements: a browser without them prints on its default sheet.
- The article is capped at the sheet's content width, so a print emulation on a wide window lays out as the paper does. The Preview pane takes the same width in its own rem (`$recipe-sheet-width`, [`spell-preview.md`](spell-preview.md)).
- Print uses the light tokens whatever the theme, on white paper (the body has no ground), and hides the shell's drawings, bar, back link, actions, side column, Workings (`.spell-workings`), the Quick Look eyes, the Edited line and any dialog. The Draft and Private badges print beside the title, so a printed draft or private spell is not taken for a finished, shared one. The shell's context row stays as the page's head: the coven's name as plain text, with no box, chevron, section nav or line under it.
- The columns, main and rest wrappers are `display: contents`, so the article is one grid and each part is placed by row and column. The facts run across both columns, the note is uncapped so its rule runs the facts' width, and the Ingredients summary stands in a `$recipe-summary-width` column beside the steps, its lines flush with the heading.
- The grid is the `recipe-columns` mixin (`src/scss/_recipe-columns.scss`), shared with the Spell Preview pane. The steps section's "Steps" heading is the Ingredients heading's twin: visually hidden on screen, for a screen reader, and drawn by the mixin.
- At phone width the summary is not on screen. Where it goes is open work on the print and phone layout.

### The side column

- Only the page draws it; the Quick Look modal does not. It is the builder's two Jar aside panels on the saved spell: Category Match (`SpellBuilder/comparison-panel.tsx`) then In Coven Inventory (`SpellBuilder/inventory.tsx`), the builder's order reversed. Both are read-only here. Each takes an `h2` (a prop; the builder keeps `h5` under its Jar heading), styled as the entry page's side blocks head themselves.
- `SpellRecipe` takes the column as its `aside` slot and wraps it in an `aside` named The Cupboard (a landmark inside an `article` needs the name). It uses the ingredient entry page's side width and gutter. The article is sized to the paragraphs' `$measure`, the gutter and the column, so the column starts one gutter after the text ends, and the head is capped to the body's width, so the Edit pencil ends where the text does.
- At tablet width and up the column starts level with the facts strip's rule, not the purpose: the page lays the body's two boxes straight into its grid (`display: contents` on `.spell-recipe__main`), so the column takes the second row. With no purpose and no chips it starts at the top.
- `SpellRecipeAside` is client because the panels are, and loads their stylesheet, `SpellBuilder/panels.scss`, itself, so the page loads none of the builder's other rules.
- `readRecipeAsideOf` (`[id]/recipe-aside.ts`) reads each linked step's categories (`categoriesOf`, then `categoriesOfVariants`, the union rule) and the coven's jars (`stockOf`), one batch each. It builds the builder's `SpellStepValue` through `jarRowsOf` (`[id]/recipe-supply.ts`, shared with the Quick Look's marks) and `jarOf`, with the group colours from `readCategories` passed as entries (a Map does not cross to a client component). A step the service withholds has no categories and no jar.
- **Workings.** `SpellRecipe` takes a `workings` slot, drawn beneath the body and pinned to the text column's last row. The page fills it with `SpellWorkings` ([`spell-workings.md`](spell-workings.md)); the Quick Look modal leaves it empty.

### In the Cupboard

- One line per form, at its first step's place. The line says what all the form's steps need together (`needOf`) against what the coven's jar holds, as `supplyOf` judges it. A one-off keeps a line for each step; a step with an instruction only has none. Each line is a `JarLine` ([`jar-shelf.md`](jar-shelf.md#jar-line)), which the Complete Working preview uses too.
- **Verdict.** `VerdictMark` (`SpellBuilder/verdict-mark.tsx`) shows Out, Not Enough, Units Differ or Low as a symbol alone, in a button named by the verdict whose tip says why. One-Off and No Jar draw no mark; the line's words say them. The button (`.spell-inventory__mark`) is bare, so it takes the shared `focus-ring` itself.
- **Doors** (`doorsOf`), for a linked step only, serve the page alone; the builder's own inventory carries none. A Quick Look eye (the same `QuickLookLink` the modal's steps carry, to this page's `?entry=<id>`) stands in a column of its own at the line's right. For a role that may update stock (`rolePermits(role, { inventory: ['update'] })`, the permission `saveStock` asserts), Edit Stock sits behind the jar and the name: a `StockJarButton` ([`stock-dialog.md`](stock-dialog.md)) opening on the step's form, with the ingredient's forms (`variantsOf`, read only for such a role) and the coven's jars through `stockDialogOf`. The button is the name stretched over the line, as the shelf's jar button is, with the eye and the verdict raised above it. An observer gets the eye and no button; an ingredient or form deleted since gets neither.

### The Quick Look modal

- `SpellLookDialog` is client because `RouteModal` takes its body as a function a server page cannot hand down. See Full Recipe is alone in the foot bar (`ingredient-details-foot`, shared with the ingredient's Quick Look, in `_primitives.scss`).
- Edit (only when given an `editHref`) links to the list's address with `?edit=<id>` in place of `?spell=<id>`, which the builder's dialog answers, so one dialog shows at a time and closing the builder returns to the list rather than to this modal. The head sets the Modal's `actionsUnderClose` ([`modal.md`](modal.md), "Controls beneath the ×"), since a spell has no formal name for the pencil to ride on.
- It has no Delete: a spell has an edit dialog, and Delete lives there and in the card's and the page's More menus.
- `failed` draws a Notice that the spell could not be read, under the title **Spell Recipe**, the name of what the dialog would have shown.
- With no side column, each ingredient step carries its stock verdict in its own row. `readLookedSpell` reads it with `readStepSuppliesOf` (`[id]/recipe-supply.ts`), one `stockOf` call for the spell, judged by the same `supplyOf` as In the Cupboard, and sets it as the step's `supply`, so the modal and the page give a step the same verdict. The page sets no `supply`, since its column already says it.

## Styling

Tokens only. `SpellRecipe/index.scss` lays the page out; `src/scss/_recipe-columns.scss` is the printed layout shared with the Spell Preview pane; `SpellBuilder/panels.scss` styles the side column's two panels, which the builder's `index.scss` also takes; `src/scss/_print.scss` is the paper.

## Testing

Component tests are in `tests/components/SpellRecipe/`. `tests/e2e/spell-recipe-layout.spec.ts` checks the column, a jump and print. `tests/e2e/spell-print.spec.ts` checks the printed sheet: an observer can choose Print, one A4 page (another page on Letter), on white, the controls, Workings and Edited line gone, and the order of the intent, facts, Ingredients column and steps.

## Used by

The recipe page, the grimoire list's Quick Look modal through `SpellLookDialog`, and the Spell Preview pane through `SpellRecipeBody` ([`spell-preview.md`](spell-preview.md)).
