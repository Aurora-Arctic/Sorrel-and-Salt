# MB.115 — A form's linked substitute names a form

**Status:** decided · **Date:** 2026-10-11

MB.215 let any ingredient, or any variant of one, substitute for a form: a
variant's substitute could link an ingredient as a whole, with no form named.
At MB.115's review the owner asked for a variant's substitutes to "specifically
select the variant", so a form's link now names a form of the linked
ingredient. DESIGN.md §5 ("A substitute is for a form, and a form's link names
a form") and CLAUDE.md's domain invariant carry the rule; this record carries
why and what it changed.

## The rule

- **A variant's linked substitute names a form.** It links one variant of
  another ingredient (`substituteVariantId` set), never the ingredient whole.
- **A typed name needs no form.** A substitute that matches no ingredient is
  still added as a name only, as before (the owner's answer).
- **The ingredient's own list is unchanged.** It may still link an ingredient
  whole, with an optional form ("Form of X").
- **A matching form is still a ranking, not a rule.** Any form of any
  ingredient may stand in for a form; the picker lists the same form first,
  then its form group, then the rest (MB.138, M8.3).

## Why

A form is what a coven stocks and a spell names, so a substitute for a form is
read as "use this instead", and "Apricot" alone does not say whether that is
the fruit, the oil or the kernel. Naming the form makes the substitute usable
as it stands.

## Where it holds

- **The form.** A variant's Substitute Ingredients box offers each linked
  ingredient only as its forms; the "Any form" row is gone, and an ingredient
  with no form is not offered there. A variant's link with no form, left from
  older data, is refused at Save with the error beside its chip
  ([`components/ingredient-form.md`](../components/ingredient-form.md)).
- **The schema and the services.** `formLinkRules` in
  `src/modules/ingredients/validation/ingredient.ts` refuses it, so the
  compendium's and a coven's create and update refuse it too, at
  `variants.i.substitutes.j.substituteVariantId`
  ([`validation.md`](../validation.md)).
- **Copy From Ingredient.** A variant's copy links the same form on each
  substitute, or skips one in no matching form and names it beside Copy
  Anyway, which adds the skipped ones as names only (the owner's calls).
- **Not the database.** No constraint enforces it: the seed writes raw, and
  one seeded row (Almond's Nut form, linking Apricot whole) predates the rule.
  A CHECK would need that row settled first, and is not part of this change.
