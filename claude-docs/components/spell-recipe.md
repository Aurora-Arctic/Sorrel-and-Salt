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
the strip's box). There is no Ingredients section: the steps carry the amounts, the amount leading
the name in weight 500 with the name in 400, and an instruction-only step's text is muted and fills
the number's line. The steps are an `ol` named Steps with no visible heading, in `position`
order, the position column 1.5rem and right-aligned (room for a two-digit number; wider read as an indent, the owner, 2026-10-29); an ingredient step draws its note, or its `body` where
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

- An ingredient's name is plain text; a Quick Look eye beside it, at seven eighths of the form's icon size, opens
  the ingredient's details (`DetailsDialog`, M12.5) over the spell, never leaving it (the owner,
  2026-10-28): the recipe page's own address plus `?entry=<id>`, or in the grimoire's Quick Look
  the tab's address with `?spell=<id>` kept and `&entry=<id>` added. The page and the tab read it
  with the Ingredients page's `readViewedEntry` and draw it with `viewedDetailsOf`, without the
  card's actions. No eye for an ingredient deleted since or one the service withheld
  ("Unavailable Ingredient").
- A one-off ingredient (MB.40) shows its own name and form, a One-Off badge (the muted tint, `badge--retired`: grey in the light theme, pale in the dark; the owner's call, 2026-10-29), no eye and no marks.
- The formal name shows in brackets only where two different ingredients in the spell share a
  label. The same ingredient in two forms does not get one.
- The `action` slot takes the page's controls, in a `.spell-recipe__actions` row at the heading's
  end: the Edit pencil for a role that may update the spell (M13.10), an `EditLink` to
  `?edit=<id>`, over which the page renders the spell builder's dialog, closing back to this
  page; and Delete Spell's bin for a role that may delete one (M13.11), `delete-spell.tsx`.
  The bin is named for the spell ("Delete Spell Hearth Warding") and asks in a `Modal` titled
  Delete Spell, as a coven's own ingredient's page asks (M8.17, M9.10): the question names the
  spell and says the coven loses it, Delete is `.btn--destructive` and busy "Deleting", Cancel
  is quiet. Not a `ConfirmQuestion`: that card asks over a form, and this page has none. Confirmed,
  `deleteSpell` runs and the page leaves, replacing its history entry, for the tab the spell was
  listed on (Spells, or Drafts for a draft) with `?deleted=<name>`, which the tab says in a
  Notice ([grimoire-list.md](grimoire-list.md)); the Modal, gone with the page, gives the focus to
  the list's heading. A refusal is the callout under the bin (M12.31). A viewer gets neither
  icon, and the service refuses them by id.
- No `PageNav`: the sections fit one screen. No print rules: M10.22 styles this page.
- Steps are drawn by `StepRow` (M13.3) with no editing controls, so the page and the Quick Look modal read them the same way as the builder draws them. The body keeps no step renderer of its own. The ingredient's name is passed to `StepRow` as markup (the name, the formal name, the Deleted mark and the Quick Look eye), and its marks as `marks`.

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
the same `QuickLookLink` the steps carry, to this page's `?entry=<id>`; and, for a role that
may update stock (`rolePermits(role, { inventory: ['update'] })`, the permission `saveStock`
asserts), Edit Stock behind the jar and the name, a `StockJarButton` ([`stock-dialog.md`](stock-dialog.md))
named "Edit Stock, <name>" and opening on the step's form, with the ingredient's forms
(`variantsOf`, read only for such a role) and the coven's jars through `stockDialogOf`. A
viewer gets the eye and no button; an ingredient or form deleted since gets neither. The
button is the name stretched over the line, as the shelf's jar button is, with the eye and the
verdict raised above it. The builder's own inventory carries no doors.

A line's verdict is `VerdictMark` (`SpellBuilder/verdict-mark.tsx`): Out, Not Enough, Units Differ or
Low as a symbol alone, in a button named by the verdict whose tip says why. One-Off and No Jar
draw no mark; the line's words say them.

## Quick Look

The body below the head is `SpellRecipeBody` (`body.tsx`), described above. The recipe page and
the grimoire list's Quick Look modal (M13.21) both render it, so nothing is drawn twice.
`look-dialog.tsx` (`SpellLookDialog`) puts it in a `RouteModal`: the title as the heading,
`LastEdit` above it. Edit and Delete are icons in the heading's `formalActions` slot, as the ingredient's Quick Look has them (owner's call, 2026-10-29): the pencil (`EditLink`, named **Edit <title>**, only when given an `editHref`) and, given a `deleteSpell` (`{ workspaceId, spellId, deletedHref }`), `DeleteSpellAction`'s bin, for a role that may delete the spell (M13.11); the confirmation dialog opens over the Quick Look. The pair is wrapped in `.spell-look-actions` (`index.scss`), which stands them on the middle of the title's first line, so a wrapped title keeps them level with its first line, and runs them to the dialog's right edge beneath the ×; the wrapper scopes this, since a spell has no formal name for the Modal's placement to ride on and the ingredient's Quick Look is left as it is. The pencil links to the `?edit=<id>` address, so one dialog shows at a time. The foot bar (`ingredient-details-foot spell-look-foot`, the bar shared with the ingredient's Quick Look and defined in `_primitives.scss`) holds only See Full Recipe. `failed` draws a Notice that the spell could not be read. The page and the modal read through `readRecipeOf`
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

The Quick Look modal is what a grimoire card's eye opens over the list, the spell's twin of the ingredient details modal. It shows the spell read in the shared body with the last edit over its title, a link through to the recipe page at the foot's start, and, for a role that may update the spell, Edit Spell at the foot's end. Edit Spell is a plain link to the list's address with `?edit=<id>` in place of `?spell=<id>`, which the spell builder's dialog answers. One dialog therefore shows at a time, and closing the builder returns to the list rather than to this modal. The component is a client part because `RouteModal` takes its body as a function, which a server page cannot hand down. The body arrives as the page's rendered children.

## The aside component

The aside is the recipe page's side column: Category Match and In Coven Inventory, the builder's Jar aside panels, read for the saved spell. They are laid out as the ingredient entry page lays its side column, beside the text past a tablet's width and beneath it on a phone. Only the page draws it; the Quick Look modal keeps to the recipe body. Both panels are read-only here, as in the builder, since the page hands them the saved steps. It is a client part because the panels are, and the landmark around them is `SpellRecipe`'s own (see "The side column").

## The inventory panel

In Coven Inventory shows one line for each form, at its first step's place. The line says what all the form's steps need together (`needOf`) against what the coven's jar holds, as `supplyOf` judges it. A one-off keeps a line for each step, and a step with an instruction only has none. The verdict's mark (`VerdictMark`) stands at the right end of the name's line, so the name is cut short before it is.

A line may carry doors (`doorsOf`): a Quick Look eye in a column of its own at the line's right, and Edit Stock behind the jar and the name, as a `StockJarButton` stretched over both, the way the entry page's shelf stretches it over a jar. The builder draws no stock, so doors serve the page alone.
