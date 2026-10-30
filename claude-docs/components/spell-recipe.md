# SpellRecipe

A saved spell as a page (MB.6), at `/coven/[slug]/grimoire/[id]`. `src/components/SpellRecipe/`
holds the presentational body; `src/app/(shell)/coven/[slug]/grimoire/[id]/` holds the page.

## The page

- Calls `requireSession()` itself (it is in the shell layout) and `requireCovenMembership`,
  which gives a non-member a 404.
- Reads the spell with `readSpell(session, workspaceId, id)`. `NotFound` and `Forbidden` both
  become a 404, so a private spell of another member, and a spell of another coven, are
  indistinguishable from one that does not exist. Visibility is filtered in SQL.
- Reads steps (`stepsOfSpells`), assigned categories and the last editor's name through
  services, never GraphQL. Nothing is cached.
- Skeleton shape `page` (`covenTarget` already returns it for this path).

## The body

Back link (the ingredient entry's `BackLink`, [`ingredient-entry.md`](ingredient-entry.md):
the chevron, and the way back through history to the grimoire as it was, either tab counted
as the list: the owner, 2026-10-29), `LastEdit` (above the title, where the ingredient entry
page puts it: the owner, 2026-10-29), title (Draft and Private badges), then the shared body, the "Recipe Card"
layout (M13.21), top to bottom: the intent (muted), `CategoryChips` with `showAll` (every
chip, no +N fold: the owner, 2026-10-28), a facts strip, the steps and the note. The facts strip
is a `dl` under a hairline with up to four cells, Jar (`jarDescription`), Seal Wax
(`sealWaxColor`), Moon Phase (`moonPhase`) and Day (`dayOfWeek`), each `dt` in the overline
style; a blank or null value draws no cell and none set draws no strip. The moon phase carries the
builder's `MoonPhaseIcon` before its text, which draws nothing for a phase outside the builder's
list. The drawing is a third larger here than its 1.25em line size (the owner, 2026-10-29). Four columns, two per row in a column narrower than `$narrow-column` (a container query on
the strip's box). There is no Ingredients section on screen: the steps carry the amounts (the print layout adds one, "Print" below), the amount leading
the name in weight 500 with the name in 400, and an instruction-only step's text is muted and fills
the number's line. The steps are an `ol` named Steps with no visible heading, in `position`
order, the position column 1.5rem (`$step-position-width`) and right-aligned (room for a two-digit number; wider read as an indent, the owner, 2026-10-29); an ingredient step draws its note, or its `body` where
it has no note (the note column is retired into `body` by PR #1308's migration 0088, and `note`
is read only until M13.9 drops it), indented to the name and ending where the name ends, so it never runs under the marks (an ingredient step is a grid: the position, the amount, the name and the marks across, and the note beneath in the amount's and name's columns; the owner, 2026-10-29), and an instruction step is its text, at the ingredients' size and
colour (the owner, 2026-10-28). A unit with no quantity reads "— tsp", the dash muted (`StepRow`);
the form icon `StepRow` draws is hidden here, as the mock-up's steps carry none. The marks sit
right-aligned at the row's end: Toxic or Caution (`SafetyMark`, from the ingredient and the form
laid) and, for a one-off, the One-Off badge (`OneOffBadge`, `src/components/StepRow/one-off-badge.tsx`,
a button named One-Off whose tip and description read "Used in this spell only; not kept in your
cupboard.", the owner, 2026-10-29) at the default badge size (the owner, 2026-10-28). The note is a
muted paragraph under its own hairline, drawn only when there is one; the strip and the list are
capped at the paragraphs' `$measure`, so the two hairlines end together on the page. A spell
with no steps says so.

- An ingredient's name is plain text. On the recipe page a step carries no Quick Look eye: the side
  column's In the Cupboard line carries it (MB.123 D17). `SpellRecipe` hands the body its steps with
  `look` cleared, so the body itself is unchanged. In the grimoire's Quick Look modal, which has no side
  column, a Quick Look eye sits beside the name, its glyph at seven eighths of the form's icon size in a full 24px box (the WCAG 2.2 target), and opens
  the ingredient's details (`DetailsDialog`, M12.5) over the spell, never leaving it (the owner,
  2026-10-28): the tab's address with `?spell=<id>` kept and `&entry=<id>` added. The page and the tab read it
  with the Ingredients page's `readViewedEntry` and draw it with `viewedDetailsOf`, without the
  card's actions. No eye for an ingredient deleted since or one the service withheld
  ("Unavailable Ingredient").
- A one-off ingredient (MB.40) shows its own name and form, a One-Off badge (the muted tint, `badge--muted`: grey in the light theme, pale in the dark; the owner's call, 2026-10-29), no eye and no marks.
- The formal name shows in brackets only where two different ingredients in the spell share a
  label. The same ingredient in two forms does not get one.
- The `action` slot takes the page's controls, in a `.spell-recipe__actions` row at the heading's
  end: the Edit pencil for a role that may update the spell (M13.10), an `EditLink` to
  `?edit=<id>`, over which the page renders the spell builder's dialog, closing back to this
  page; the Preview button ([`spell-preview.md`](spell-preview.md), M13.12) for every role; and, last, a three-dots `SpellMoreMenu` (`more-menu.tsx`) holding Duplicate and Delete (destructive), each only for a role that may do it, and Print (`window.print()`, between them) for every role. A role that may do neither, a viewer, gets Print as its own icon button (`print-button.tsx`, the dots' ink, tip "Print", named "Print <spell>") rather than a menu of one. The header is icon buttons only, in the order Record a Working (the cauldron), Edit (the pencil), Preview, the menu, Edit and Preview drawn in the text colour (`icon-tip__edit--plain`) and the cauldron in the accent green (owner, 2026-10-30). Delete Spell's dialog is `delete-spell.tsx`.
  The menu's items are bare verbs (Duplicate, Print, Delete), and the dialog's title carries the noun: Delete asks in a `Modal` titled
  Delete Spell, as a coven's own ingredient's page asks (M8.17, M9.10). The question names the
  spell in bold, with no quotes, and then says in one sentence what happens: for a shared spell, that the coven loses it, and for a private one, that it is gone for good; either way, nothing in stock changes. Delete is `.btn--destructive` and busy "Deleting", Cancel
  is quiet. Not a `ConfirmQuestion`: that card asks over a form, and this page has none. Confirmed,
  `deleteSpell` runs and the page leaves, replacing its history entry, for the tab the spell was
  listed on (Spells, or Drafts for a draft) with `?deleted=<name>`, which the tab says in a
  Notice ([grimoire-list.md](grimoire-list.md)); the Modal, gone with the page, gives the focus to
  the list's heading. A refusal is the callout under the bin (M12.31). A viewer gets neither
  icon, and the service refuses them by id.
- Print and the print layout are M10.22's ("Print" below).
- Steps are drawn by `StepRow` (M13.3) with no editing controls, so the page and the Quick Look modal read them the same way as the builder draws them. The body keeps no step renderer of its own. The ingredient's name is passed to `StepRow` as markup (the name, the formal name, the Deleted mark and the Quick Look eye), and its marks as `marks`.

## The jump menu

The page carries the shared `PageNav` ("On This Page", claude-docs/components/page-nav.md) in the ingredient entry page's grid: the article's children are the head (which holds the back link and the Edited line), the summary, the menu, then the columns, and `.spell-recipe--with-nav` takes the `entry-nav-grid` mixin on screen, so the menu is a sticky column left of the page from a phone's width up and stacked above the sections below it. It spans the summary and the columns (`grid-row: 2 / span 2`) so it has room to stick. The article fills the coven column and starts at its left edge; the text is capped at `$recipe-column` (`$measure`, the gutter and the side column with the jar). Its entries are Steps, a The Jar group holding Category Match and In the Cupboard, and Workings, each present only where its section is drawn: Steps with at least one step, Workings with the `workings` slot, the group with the `aside` slot (its links go to the aside's two sections), and the menu is left out when none is. The two jar entries are `narrowOnly`, and `PageNav` hides a group whose entries all are, label included: from a tablet up the jar stands beside the recipe, so the group is hidden there; below a tablet the jar stacks, and it is placed above Workings (`order`) so the page matches the menu. The ids are `sections.ts`’s constants, which the steps list, `SpellWorkings`, the aside and the
two panels (their optional `id` prop) carry, each with a scroll margin under the shell’s bar. The Quick Look
modal has no menu. Print hides it (`.page-nav` in `_print.scss`) and the nav column is a screen-only rule, so the
printed sheet is unchanged. `tests/components/SpellRecipe/index.test.tsx` checks that each link has a target;
`tests/e2e/spell-recipe-layout.spec.ts` checks the column, a jump and print.

## Print

M10.22. `SpellRecipe` does not draw Print: it is the "Print" item of the page's `SpellMoreMenu` (`more-menu.tsx`, calling `window.print()`), for every role that can read the page, or its own button (`print-button.tsx`) for a role whose menu would hold nothing else. `summary.tsx` draws an Ingredients list, one line per form in the order of its first step, with the total amount (`needOf`, in the first step’s unit when the form’s units are of one dimension, otherwise listed with "+"), label and, where two ingredients share a label, the formal name, between the intent and categories and the facts and steps. It is `display: none` on screen (`index.scss`), so the screen has no second list, and shows in print and in the Preview pane (the mixin below). Its heading names the list (`aria-labelledby`). `src/scss/_print.scss`, the one print stylesheet, sits behind `:has(.spell-recipe)`, the page's own article, so no other page changes (a browser without `:has()` prints the screen layout). The recipe's sheet is A4, a named page (`@page recipe`) that only the recipe's body takes, so every other page prints on the reader's own paper; every page keeps the 15mm margin (`@page`). Both are enhancements: a browser without them prints on its default sheet. The root is 11pt, and the article is capped at the sheet's 180mm content width, so a print emulation on a wide window lays out as the paper does; the Preview pane takes the same width in its own rem (`$recipe-sheet-width`, [`spell-preview.md`](spell-preview.md)). The spacing is the grid's `space(2)` gap, `space(4)` under the head, `space(3)` between the categories and the facts strip's rule, `space(4)` between the strip and the Ingredients row, and `space(3)` between that row and the note's rule. In print it uses the light tokens whatever the theme, on white paper (the body has no ground), sets a step's line at the body size, still muted, and hides the shell's drawings (`.backdrop`), the shell's bar, the back link, the actions, the side column, the Workings section (`.spell-workings`), the Quick Look eyes, the badges and any dialog. The shell's context row stays as the page's head: the coven's name as plain text, with no box, chevron, section nav or line under it. The sheet is a grid of two columns under a head that runs across (the owner picked mock C, 2026-10-30, with the facts moved out of the side column): the Edited line and title, the intent and categories, the four facts across the top over both columns, then the Ingredients summary in a 17em column (`$recipe-summary-width`) (its lines flush with the heading, no indent and no ◆) beside the steps, then the note, uncapped so its rule runs the facts' width. The columns, main and rest wrappers dissolve (`display: contents`), so the article is the one grid and each part is placed by row and column. The grid is the `recipe-columns` mixin (`src/scss/_recipe-columns.scss`), shared with the Spell Preview pane ([`spell-preview.md`](spell-preview.md)); `body.tsx` wraps the steps, or the "no steps yet" line, in a `spell-recipe__instructions` section with a "Steps" heading, the Ingredients heading's twin, which names the list (`aria-labelledby`); on screen (the page and Quick Look) it is visually hidden, there for a screen reader, and the mixin draws it. `tests/e2e/spell-print.spec.ts` checks that a viewer can choose Print from the menu, one printed page, the controls gone, that the context row prints as plain text with no line under it, that the intent and categories lead and the facts sit above the Ingredients column and the steps, that the Ingredients column is left of the steps with its heading level with the Steps heading, that the summary is flush with its heading and that Workings is absent; and that the recipe prints on A4 where another page prints on Letter, on white, with no drawings, the note's rule the facts' width and a step's note at the body size. At phone width the summary is not on screen; where it goes is MB.123's (moved from M10.22, 2026-10-29).

## The side column

The page alone draws a side column (M13.21; the owner, 2026-10-29), the builder's two Jar aside
panels on the saved spell: Category Match (`SpellBuilder/comparison-panel.tsx`) then In Coven
Inventory (`SpellBuilder/inventory.tsx`), the builder's order reversed (the owner, 2026-10-29),
each with an `h2`
(a prop; the builder keeps `h5` under its Jar heading) styled as the entry page's side blocks head
themselves: the h3 size and no rule beneath (the owner, 2026-10-29).
At tablet width and up the column starts level with the facts strip's rule, not with the purpose
(the owner, 2026-10-29): the body is two boxes (`body.tsx`), the purpose and chips, then the rest,
and the page lays them straight into its grid (`display: contents` on `.spell-recipe__main`), so the
column takes the second row. With no purpose and no chips it starts at the top.
The Quick Look modal draws neither. `SpellRecipe` takes the column as its `aside` slot and
wraps it in an `aside` named The Jar (a landmark needs the name inside an `article`), beside the
body in the ingredient entry page's columns (`entry-section` and `entry-side`: the same side
width and gutter, the column beneath the body on a phone), the article sized to the paragraphs'
`$measure`, the gutter and the column, so the column starts one gutter after the text ends (the
owner, 2026-10-29), and the head capped to the body's width, so the Edit pencil ends where the
text does. `aside.tsx` (`SpellRecipeAside`, client) hands the panels their props and loads the
builder's styles itself. The page reads them with `readRecipeAsideOf` (`[id]/recipe-aside.ts`):
each linked step's categories (`categoriesOf`, then `categoriesOfVariants`, the union rule) and
the coven's jars (`stockOf`), one batch each, made into the builder's `SpellStepValue` through
`jarRowsOf` (`[id]/recipe-supply.ts`, shared with the Quick Look's marks) and the builder's `jarOf`, with the assigned categories as the intended set and the group colours from
`readCategories` as entries (a Map does not cross to a client component). A step the service
withholds has no categories and no jar; no form icon or safety is read, since the column draws
neither.

Each inventory line of a linked step carries two doors (the owner, 2026-10-29), read in the same
pass as `doors` and drawn by `InCovenInventory`'s `doorsOf`: a Quick Look eye in a column of its own at the line's right,
the same `QuickLookLink` the Quick Look modal's steps carry, to this page's `?entry=<id>`, in the full 24px box (`index.scss`; the builder's own column draws it at seven eighths); and, for a role that
may update stock (`rolePermits(role, { inventory: ['update'] })`, the permission `saveStock`
asserts), Edit Stock behind the jar and the name, a `StockJarButton` ([`stock-dialog.md`](stock-dialog.md))
named "Edit Stock, <name>" and opening on the step's form, with the ingredient's forms
(`variantsOf`, read only for such a role) and the coven's jars through `stockDialogOf`. A
viewer gets the eye and no button; an ingredient or form deleted since gets neither. The
button is the name stretched over the line, as the shelf's jar button is, with the eye and the
verdict raised above it. The builder's own inventory carries no doors.

A line's verdict is `VerdictMark` (`SpellBuilder/verdict-mark.tsx`): Out, Not Enough, Units Differ or
Low as a symbol alone, in a button named by the verdict whose tip says why. One-Off and No Jar
draw no mark; the line's words say them. The button (`.spell-inventory__mark`) is bare, so it takes
the shared `focus-ring` itself.

## Quick Look

The body below the head is `SpellRecipeBody` (`body.tsx`), described above. The recipe page and
the grimoire list's Quick Look modal (M13.21) both render it, so nothing is drawn twice.
Its Steps heading, and `SpellRecipeSummary`'s Ingredients heading, take a `level` (2 or 3, default 2), one below the heading they sit under: 2 under the page's h1, 3 under a dialog's or pane's h2 title, so the Quick Look and the Spell Preview pane pass `level={3}`. The styles that place or hide them match either level.
`look-dialog.tsx` (`SpellLookDialog`) puts it in a `RouteModal`: the title as the heading,
`LastEdit` above it. Edit and Delete are icons in the heading's `formalActions` slot, as the ingredient's Quick Look has them (owner's call, 2026-10-29): the pencil (`EditLink`, named **Edit <title>**, only when given an `editHref`) and, given a `deleteSpell` (`{ workspaceId, spellId, deletedHref }`), `DeleteSpellAction`'s bin, for a role that may delete the spell (M13.11); the confirmation dialog opens over the Quick Look. The head sets the Modal's `actionsUnderClose` ([`modal.md`](modal.md), "Controls beneath the ×"), which stands the pair on the middle of the title's first line, so a wrapped title keeps them level with its first line, and runs them to the dialog's right edge beneath the ×, since a spell has no formal name for the pair to ride on. The pencil links to the `?edit=<id>` address, so one dialog shows at a time. The foot bar (`ingredient-details-foot`, the bar shared with the ingredient's Quick Look and defined in `_primitives.scss`) holds only See Full Recipe. `failed` draws a Notice that the spell could not be read, under the title **Spell Recipe**, the name of what the dialog would have shown. The page and the modal read through `readRecipeOf`
(`grimoire/recipe-read.ts`).

The modal has no side column, so each ingredient step carries its stock verdict in its own
row instead (the owner, 2026-10-29): `readLookedSpell` reads it with `readStepSuppliesOf`
(`[id]/recipe-supply.ts`), one `stockOf` call for the spell, judged by the same `supplyOf` as In
Coven Inventory, and sets it as the step's `supply`; `Marks` draws it as a `VerdictMark` after the
safety mark. The modal and the page's inventory therefore give a step the same verdict. The page
sets no `supply`, since its column already says it.

## Decisions

- The form is stored lower case and set in title case by the component. The form icon is not drawn on steps, as the step view carries no form group.
- A spell search row's `match` reuses `IngredientSearchMatch`, with `slug` set to the spell id.

## The Quick Look component

The Quick Look modal is what a grimoire card's eye opens over the list, the spell's twin of the ingredient details modal. It shows the spell read in the shared body with the last edit over its title, the Draft and Private badges (`SpellMarks`, in the head's `under` row, as the ingredient details modal places its marks) where they apply, See Full Recipe alone in the foot, and, for a role that may update the spell, the Edit pencil beside the title, with the bin beside it for a role that may delete ("Quick Look", above). The pencil is a plain link to the list's address with `?edit=<id>` in place of `?spell=<id>`, which the spell builder's dialog answers. One dialog therefore shows at a time, and closing the builder returns to the list rather than to this modal. The component is a client part because `RouteModal` takes its body as a function, which a server page cannot hand down. The body arrives as the page's rendered children.

## The workings slot

`SpellRecipe` takes a `workings` slot, drawn beneath the recipe body in the main column. The page fills it with `SpellWorkings` ([spell-workings.md](spell-workings.md)); the Quick Look modal leaves it empty.

## The aside component

The aside is the recipe page's side column: Category Match and In the Cupboard, the builder's Jar aside panels, read for the saved spell. They are laid out as the ingredient entry page lays its side column, beside the text past a tablet's width and beneath it on a phone. Only the page draws it; the Quick Look modal keeps to the recipe body. Both panels are read-only here, as in the builder, since the page hands them the saved steps. It is a client part because the panels are, and the landmark around them is `SpellRecipe`'s own (see "The side column").

## The inventory panel

In the Cupboard shows one line for each form, at its first step's place. The line says what all the form's steps need together (`needOf`) against what the coven's jar holds, as `supplyOf` judges it. A one-off keeps a line for each step, and a step with an instruction only has none. The verdict's mark (`VerdictMark`) stands at the right end of the name's line, so the name is cut short before it is.

A line may carry doors (`doorsOf`): a Quick Look eye in a column of its own at the line's right, and Edit Stock behind the jar and the name, as a `StockJarButton` stretched over both, the way the entry page's shelf stretches it over a jar. Each line is a `JarLine` ([`jar-line.md`](jar-line.md)), which the Complete Working preview uses too. The builder draws no stock, so doors serve the page alone.

## Duplicate

A Duplicate item in the actions row's three-dots menu (`SpellMoreMenu`, using `useDuplicateSpell` from `duplicate-spell.tsx`), for a role that may create a spell (`canDuplicate`, separate from the dialog's `canCreate`). It calls `duplicateSpell`, which makes a private draft of the spell with " (Copy)" added to the title, then sends the browser to the grimoire's Drafts tab with the copy's builder open (`/grimoire/drafts?edit=<id>`, `copied-href.ts`). From the choice until the copy opens the dots are busy, "Duplicating" with the spinner, so it cannot run twice. A refusal is the callout under the menu. It asks nothing first, so there is no dialog whose focus needs returning.

## Delete Spell

The Delete item in the three-dots menu (`more-menu.tsx`), with its dialog in `delete-spell.tsx`, for a role that may delete a spell. The Quick Look keeps the bin (`DeleteSpellAction`), a `ModalButton` asking the same question; the spell card uses this menu without Print (`canPrint={false}`), which returns nothing when empty. The item reads Delete, a bare verb like the menu's others, and asks in a `Modal` titled Delete Spell, as a coven's own ingredient's page asks: the question names the spell in bold and, in one sentence, says for a shared spell that the coven loses it, since a shared spell can be deleted (the visibility lock governs widening, not existence). For a private spell, which only its author reads, it says the spell is gone for good instead; a caller that passes no `visibility` gets that line too, which is true of either. Delete is `.btn--destructive` and busy "Deleting"; Cancel is quiet. It is not a `ConfirmQuestion`, which asks over a form, and this page has none. Confirmed, `deleteSpell` runs and the page leaves, replacing its history entry so Back does not return to a 404, for the tab the spell was listed on with `?deleted=<name>` (`deleted-href.ts`). The Modal, gone with the page, gives the focus to the list's heading. A refusal is the callout under the menu. A cancelled dialog returns the focus to the three dots.

## Styling

Tokens only, in three stylesheets:

- **`SpellRecipe/index.scss`** lays the page out: the head (its back link in the shared `.back-bar` row, as the ingredient entry page's is), the body's boxes, the side column beside the text past a tablet's width and under it on a phone, Workings pinned to the text column's last row, and the Recipe Card look of each `StepRow` (a `$step-position-width` number column, right-aligned). It hides the Ingredients summary on screen and keeps each jump target clear of the shell's sticky bar.
- **`src/scss/_recipe-columns.scss`** is the printed layout, shared with the Spell Preview pane: the Ingredients summary in a `$recipe-summary-width` column beside the steps, its heading and the Steps heading at `$recipe-heading-size`.
- **`src/scss/_print.scss`** is the paper: what print hides ("Print", above) and the white ground.

## Stories

`src/components/SpellRecipe/index.stories.tsx`, titled "Grimoire / Spell Recipe": `States`, with a
control that chooses one state:

- Complete: the full page of a complete shared spell, every slot filled.
- Draft: a draft, with no Record a Working and Workings empty.
- Private: a private spell.
- Quick Look: the dialog for a member, with the Edit pencil and the bin beside the title.
- Quick Look Read Only: the dialog for a viewer.
- Quick Look Read Failed: the dialog when the spell could not be read.
