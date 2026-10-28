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

Back link, title (Draft and Private badges), `LastEdit`, intent, `CategoryChips`, then
sections: Ingredients (a summary of the ingredient steps), Steps (an ordered list in
`position` order, quantity and unit on ingredient steps) and Note. Empty sections are left out,
except Steps, which says the spell has no steps.

- An ingredient links to its coven page, unless it has been deleted since or the service
  withheld it ("Unavailable Ingredient").
- A one-off ingredient (MB.40) shows its own name and form, a One-Off badge and no link.
- The formal name shows in brackets only where two different ingredients in the spell share a
  label. The same ingredient in two forms does not get one.
- No Delete control. The `action` slot takes the Edit control, which the page passes for a role
  that may update the spell (M13.10): an `EditLink` to `?edit=<id>`, over which the page
  renders the spell builder's dialog, closing back to this page.
- No `PageNav`: the sections fit one screen. No print rules: M10.22 styles this page.
- Steps are drawn by the component read-only. M13.3's `StepRow` replaces this when it lands.

## Quick Look

The body below the head is `SpellRecipeBody` (`body.tsx`): intent, `CategoryChips`, Ingredients,
Steps and Note. The recipe page and the grimoire list's Quick Look modal (M13.21) both render it,
so nothing is drawn twice. `look-dialog.tsx` (`SpellLookDialog`) puts it in a `RouteModal`: the
title as the heading, `LastEdit` above it, an Edit link (`formalActions`) when given an
`editHref`, and a foot bar with "See Recipe Page" linking to the page. `failed` draws a Notice
that the spell could not be read. The page and the modal read through `readRecipeOf`
(`grimoire/recipe-read.ts`).

## Decisions

- The form is stored lower case and set in title case by the component. The form icon is not drawn on steps, as the step view carries no form group.
- A spell search row's `match` reuses `IngredientSearchMatch`, with `slug` set to the spell id.
