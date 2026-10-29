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

Back link, `LastEdit` (above the title, where the ingredient entry page puts it: the owner,
2026-10-29), title (Draft and Private badges), then the shared body, the "Recipe Card"
layout (M13.21), top to bottom: the intent (muted), `CategoryChips` with `showAll` (every
chip, no +N fold: the owner, 2026-10-28), a facts strip, the steps and the note. The facts strip
is a `dl` under a hairline with up to four cells, Jar (`jarDescription`), Seal Wax
(`sealWaxColor`), Moon Phase (`moonPhase`) and Day (`dayOfWeek`), each `dt` in the overline
style; a blank or null value draws no cell and none set draws no strip. The moon phase carries the
builder's `MoonPhaseIcon` before its text, which draws nothing for a phase outside the builder's
list. Four columns, two per row in a column narrower than `$narrow-column` (a container query on
the strip's box). There is no Ingredients section: the steps carry the amounts, the amount leading
the name in weight 500 with the name in 400, and an instruction-only step's text is muted and fills
the number's line. The steps are an `ol` named Steps with no visible heading, in `position`
order, the position column 1.5rem and right-aligned (room for a two-digit number; wider read as an indent, the owner, 2026-10-29); an ingredient step draws its note, or its `body` where
it has no note (the note column is retired into `body` by PR #1308's migration 0088, and `note`
is read only until M13.9 drops it), indented to the name, and an instruction step is its text, at the ingredients' size and
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
- A one-off ingredient (MB.40) shows its own name and form, a One-Off badge, no eye and no marks.
- The formal name shows in brackets only where two different ingredients in the spell share a
  label. The same ingredient in two forms does not get one.
- No Delete control. The `action` slot takes the Edit control, which the page passes for a role
  that may update the spell (M13.10): an `EditLink` to `?edit=<id>`, over which the page
  renders the spell builder's dialog, closing back to this page.
- No `PageNav`: the sections fit one screen. No print rules: M10.22 styles this page.
- Steps are drawn by `StepRow` (M13.3) with no editing controls, so the page and the Quick Look modal read them the same way as the builder draws them. The body keeps no step renderer of its own. The ingredient's name is passed to `StepRow` as markup (the name, the formal name, the Deleted mark and the Quick Look eye), and its marks as `marks`.

## The side column

The page alone draws a side column (M13.21; the owner, 2026-10-29), the builder's two Jar aside
panels on the saved spell: In Coven Inventory (`SpellBuilder/inventory.tsx`) then Category
Match (`SpellBuilder/comparison-panel.tsx`), as the builder orders them, each with an `h2`
(a prop; the builder keeps `h5` under its Jar heading) in the entry page's ruled heading style.
The Quick Look modal draws neither. `SpellRecipe` takes the column as its `aside` slot and
wraps it in an `aside` named The Jar (a landmark needs the name inside an `article`), beside the
body in the ingredient entry page's columns (`entry-section` and `entry-side`: the same side
width and gutter, the column beneath the body on a phone), the article widened by the column so
the body keeps its width and the head capped to the body's, so the Edit pencil ends where the
text does. `aside.tsx` (`SpellRecipeAside`, client) hands the panels their props and loads the
builder's styles itself. The page reads them with `readRecipeAsideOf` (`[id]/recipe-aside.ts`):
each linked step's categories (`categoriesOf`, then `categoriesOfVariants`, the union rule) and
the coven's jars (`stockOf`), one batch each, made into the builder's `SpellStepValue` through
its own `jarOf`, with the assigned categories as the intended set and the group colours from
`readCategories` as entries (a Map does not cross to a client component). A step the service
withholds has no categories and no jar; no form icon or safety is read, since the column draws
neither.

## Quick Look

The body below the head is `SpellRecipeBody` (`body.tsx`), described above. The recipe page and
the grimoire list's Quick Look modal (M13.21) both render it, so nothing is drawn twice.
`look-dialog.tsx` (`SpellLookDialog`) puts it in a `RouteModal`: the title as the heading,
`LastEdit` above it, no pencil, and a foot bar (`ingredient-details-foot spell-look-foot`, the bar
shared with the ingredient's Quick Look and defined in `_primitives.scss`) holding See Recipe
Page at its start and, only when given an `editHref`, Edit Spell (`btn--solid`) at its end; See
Recipe Page alone stands centred. Edit Spell is a link to the `?edit=<id>` address, so one
dialog shows at a time. `failed` draws a Notice that the spell could not be read. The page and the modal read through `readRecipeOf`
(`grimoire/recipe-read.ts`).

## Decisions

- The form is stored lower case and set in title case by the component. The form icon is not drawn on steps, as the step view carries no form group.
- A spell search row's `match` reuses `IngredientSearchMatch`, with `slug` set to the spell id.
