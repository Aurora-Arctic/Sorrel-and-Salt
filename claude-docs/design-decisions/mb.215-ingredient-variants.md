# MB.215 — An ingredient and its forms

**Status:** decided · **Date:** 2026-10-11 (settled with the owner on 2026-10-10)

An ingredient's forms used to be separate entries. This record says why they become rows beneath one entry, what each row carries, and what was turned down. The scoping plan that led here is [`mb.215-plan.md`](mb.215-plan.md); DESIGN.md §5 (`ingredient_variants` and "Ingredient identity — the formal name") carries the model, and MB.216 to MB.223 build it.

## The problem

Until MB.215 an ingredient's identity was its formal name **plus its form**: `canonical_key` was `lower(coalesce(canonical_name, name))` followed by `::` and the folded form. So Rosemary as a herb, as an oil and as a powder was three `ingredients` rows. Each repeated the description, the elements, planets, zodiac signs, colours and safety notes, and each owned its own categories, deities, folk names, substitutes and references. A curator correcting Rosemary's planets corrected it three times, and a reader of the herb's page never learnt that the oil existed.

The owner wants what the forms share entered once: a parent ingredient carrying it, a child row per form carrying what is particular to that form, one page showing the ingredient and its forms, and a search that reaches the forms' details.

It is decided now because nearly everything that reads the shape is unbuilt. The detail page (M8.19), the compendium page (M8.18), the search UI (M8.10 to M8.14), the local-beats-compendium rule (M8.3), stock (M9.4), the spell services and `unitConvert` (M9.5) are all ahead, and production is not live. Only the admin compendium page, `IngredientForm`, the search SQL, the vocabulary's rename-carry and their tests read today's shape. Recording the model before any DDL transcribes it is MB.28 and MB.91's rule: cheapest to get right before anything depends on it.

## The decisions

| Question                                     | Decision                                                                                                                                                                                                                                                        |
| -------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| What is the child row called?                | A _variant_, in `ingredient_variants`, its GraphQL type `IngredientVariant`. `ingredient_forms` stays the curated vocabulary of form names, so a variant _has_ a form.                                                                                          |
| What is an ingredient with no variant?       | Information only. It can be read, searched and linked as a substitute, but a stock row or a spell layer names a variant. The compendium page and the entry form prompt for at least one form.                                                                   |
| What is identity?                            | The formal name alone: `identity_key = lower(coalesce(canonical_name, name))`, unique per tier (the compendium, or one workspace). A variant is unique per ingredient and folded form, `(ingredient_id, lower(btrim(form)))`.                                   |
| What happens to the slug?                    | It drops the form. Old compendium slugs retire through the existing 180-day redirects as each entry next saves.                                                                                                                                                 |
| How does a variant relate to its ingredient? | A union: a variant adds to its ingredient and never removes. There is no override and no merging of two values on read. If a form lacks a property, the curator moves the property off the ingredient onto the forms that have it.                              |
| What does a variant carry?                   | `form`, `form_id` (the curated pick), `description`, `safety_notes`, the four lists (elements, planets, zodiac signs, colours), and its own references, substitutes and categories. Deities and folk names stay on the ingredient.                              |
| What may substitute for a form?              | Any ingredient, or any variant of one: leaves for stems, or a different ingredient altogether. The picker ranks a matching form first, then the same form group, then the rest. The "not itself" check refuses only the same ingredient _and_ the same variant. |
| What does search reach?                      | A variant's form and description, still returning one row per ingredient.                                                                                                                                                                                       |
| How is a variant written?                    | Inside the ingredient's own save, one transaction for the whole entry. There are no variant mutations.                                                                                                                                                          |

## The model

**`ingredient_variants`**: `id`, `ingredient_id` (NOT NULL, to `ingredients`), `form` (text, NOT NULL, never blank), `form_id` (nullable, to `ingredient_forms`), `description`, `safety_notes`, `elements` (`ingredient_element[]`), `planets`, `zodiac_signs`, `colors`, and the audit columns. One live row per ingredient and folded form. A unique index on `(id, ingredient_id)`, not partial, is what the composite foreign keys below point at; a foreign key cannot point at a partial index, and this one reserves nothing the primary key does not, so it is the one named exception to "every unique index is partial". An index on `form_id` over live rows serves the vocabulary's reads of who picks a form, and a trigram index over the accent-folded form and description serves the search. The table carries no `workspace_id`: like every child of an ingredient it takes its parent's tier, and is read only beneath its parent.

**`ingredients.identity_key`**: a generated column, `lower(coalesce(canonical_name, name))`, unique per tier as `ingredients_compendium_identity_key_unique` and `ingredients_workspace_identity_key_unique`. The old `canonical_key`, `form` and `form_id` stay on the row, unread after MB.222, until MB.223 drops them.

**The children of a variant name both ids.** `inventory_items`, `spell_ingredients`, `ingredient_categories` and `ingredient_substitutes` reach a variant through a composite foreign key, `(variant_id, ingredient_id) → ingredient_variants (id, ingredient_id)`, so no row can pair one ingredient with another ingredient's variant. The key is `MATCH SIMPLE`, which skips the check when either column is null, so where `ingredient_id` may be null a CHECK pairs the two.

- `inventory_items.variant_id` is NOT NULL, and a coven holds one live row per variant: Rosemary herb and Rosemary oil are two rows.
- `spell_ingredients.variant_id` is set exactly when `ingredient_id` is, and a jar lays a variant once, so it may hold Rosemary herb and Rosemary oil.
- `ingredient_categories` gains a nullable `variant_id`. A pair with none files the ingredient; a pair with one files that form, and still carries the `ingredient_id`.
- `ingredient_substitutes` gains `variant_id`, the form a row is a substitute _for_, and `substitute_variant_id`, the form of the linked ingredient it names, which needs a link beside it.
- `reference_links` gains one more sourced column, `ingredient_variant_id`, through the registry of sourced tables that already builds the others.

**The union rule, as code.** `Ingredient.categories`, `substitutes` and `references` are the ingredient's own rows, those with no variant; `IngredientVariant`'s are that form's additions; nothing merges the two. The compendium's category filter matches the union for free, since a variant's pair also carries the `ingredient_id`. An entry counts as sourced, for the admin's to-do list, if it or one of its live variants cites a reference. A spell's derived categories are the ingredient's pairs plus the layer's variant's.

**An example.** Rosemary, _Salvia rosmarinus_, is one compendium entry at `/compendium/ingredients/rosemary-salvia-rosmarinus`. The ingredient holds its description, `Fire`, the Sun, its folk names, its deities and the categories every form shares. Its Herb variant adds nothing it does not need to. Its Oil variant adds the oil's own description, the safety note "dilute before it touches the skin", the monograph that covers the oil, and "for anointing". The page shows the ingredient, then a section for each form, the oil's at `#form-oil`.

## Why those children

The question was which of an ingredient's properties belong to a form. The answer follows what the sources attach to a form and what they attach to the plant.

- **References and safety notes are per form.** The European Medicines Agency writes one herbal monograph per plant part or preparation: its template is titled for a plant, a plant part, or the essential oil (_aetheroleum_), each with its own uses and cautions (European Medicines Agency 2024). An essential oil concentrates a great deal of plant into a little liquid — about a hundred roses go into one drop of rose oil — so it is diluted before use, and carries contraindications and routes the dried herb does not (Sustainable Agriculture Research and Education; American College of Healthcare Sciences).
- **Substitutes are per form, but not bound to a form.** Cunningham's substitution lists are organised by use and property rather than by part, and a formula swaps within its kind by convenience, not by rule (Cunningham 1985; Cunningham 1989). The owner's examples, leaves for stems or a different ingredient altogether, are ordinary. So a substitute hangs off the form it replaces and may link anything, and a similar form is a ranking in the picker, not a constraint.
- **Categories are mostly the plant's, sometimes a form's.** Correspondence references attribute "powers" to the plant, with parts and preparations beneath (Cunningham 1985). "For anointing" is a real but occasional use of one form, and the join table is cheap to widen with a nullable column.
- **Deities and folk names are the plant's.** The rose is Aphrodite's; its oil is a use of it ("Fragrance in Ancient Greece"). The deities table is ordered and its rows link curated deities, which makes it the costliest child to split, for the weakest case. Folk names name the plant.

## What was rejected

- **A `parent_id` on `ingredients` pointing at another `ingredients` row.** It is the cheapest migration, but it puts two kinds of row in one table. A form row listed where only ingredients belong would be merely _absent_ from each list, kept out by every query remembering to, never _impossible_; and the formal name would be duplicated onto every form row and kept in step by hand.
- **Prefilling a new entry from an existing one.** It copies rather than shares: the next correction to Rosemary's planets would again be made three times.
- **Override semantics**, where a variant may replace an inherited value. Every read would have to merge the variant's value over the ingredient's, every join table would need an "explicitly none" flag so a form could say it has no categories, and changing one element on a form would mean re-entering its whole list. Under the union rule a property true of only some forms simply lives on those forms.
- **Separate mutations for variants.** The entry form saves the whole entry in one `withAudit` transaction. Variant mutations would need a second tier check, a second mapper from a unique-index collision to a field error, a cache expiry per variant, and several round trips per save, any one of which could fail halfway.

## What it costs

- **A window in which two models coexist.** From MB.216 to MB.223 the row keeps `canonical_key`, `form` and `form_id` beside `identity_key` and the variants. MB.219 writes both until MB.222 stops reading the old columns, and `tests/db/schema-drift.test.ts` declares each column awaiting its drop in `PENDING_DROPS` until MB.223 removes it.
- **A refusal before the switch.** The identity index lands with MB.216, before MB.220 maps it to a field error, so for that short window an admin trying to add "Rosemary, oil" as an entry beside the herb is refused with an unmapped index name. It is admin-only, and the answer is the variant MB.219 adds.
- **A guard that may stop a deploy.** MB.216's migration refuses a database holding two live entries of one formal name in a tier, rather than merging them. No seeded or live database holds such a group, so the guard is expected never to fire; if it does, the procedure below is how to clear it.

## Merging a group

A _group_ is two or more live entries in one tier sharing a formal name — under the old model, one plant entered once per form. MB.216's migration `0062` refuses to run while one exists, naming this section. Merging is a **hand procedure**, not a migration or a tool, because no such group exists in any seed or live database, a general merge is v2's duplicate merge tooling (DESIGN.md §13), and a migration that merged could not be tested against data that does not exist.

Drizzle applies every pending migration in one transaction, so a refused `0062` rolls back `0061` too and the database is left as it was: the merge runs against the old schema, before `ingredient_variants` exists, and the merged form is added as a variant once the migrations have applied.

1. **Find the groups.** Run the pre-flight query MB.216 names, on the database the deploy will migrate. Each row is a group: its tier (`workspace_id`, null for the compendium), its key and how many live entries share it.

   ```sql
   select workspace_id, lower(coalesce(canonical_name, name)), count(*)
   from ingredients
   where deleted_at is null
   group by 1, 2
   having count(*) > 1;
   ```

2. **Pick the entry to keep.** List the group's entries with their label, form, slug and description. Keep the one whose label and description should stand for the plant — usually the plainest form, such as the herb. Each of the others is, below, _the other_.
3. **Record the other's form.** Copy out what will become its variant: `form`, `form_id`, and its `description`, `safety_notes`, `elements`, `planets`, `zodiac_signs` and `colors` where they differ from the kept entry's. Under the union rule, a value both entries hold belongs on the kept entry; a value only the other holds belongs on the variant.
4. **Move its children across where they differ**, in one transaction that sets `app.current_user_id` to your user id and stamps `created_by` and `updated_by` with it, as `claude-docs/auth/admin-bootstrap.md` shows for a hand fix:
   - **categories**: insert each of the other's `ingredient_categories` pairs the kept entry lacks, for the kept entry;
   - **substitutes**: move each live row the kept entry does not already list to the kept entry (`update … set ingredient_id`), except one linking the kept entry itself, which would then substitute for itself;
   - **references**: move each live `reference_links` row citing a reference the kept entry does not cite, keeping its `locator`;
   - **deities**: move each live row naming a deity the kept entry lacks, its `position` placed after the kept entry's last;
   - **folk names**: move each live name the kept entry lacks, and add the other's label as a folk name if it differs from the kept entry's label.

   What is not moved stays with the other, and goes with it when it is soft-deleted.

   Leave the other's spell layers where they are: a spell keeps reaching an ingredient that is later deleted (M5.3), and `0062` gives a soft-deleted entry its own variant, so each such layer still names the form it laid. `inventory_items` is empty in every database until M9.4; if it is not, stop and ask.

5. **Soft-delete the other** (`deleted_at`, `deleted_by`), which frees its slug.
6. **On the compendium tier, retire the other's slug** as a 180-day redirect to the kept entry: insert a `retired_ingredient_slugs` row with the kept entry's `ingredient_id`, a null `workspace_id` and the other's `slug`. A coven's entry retires nothing, since no route reads its slug.
7. **Re-run the guard**: the pre-flight query returns no row, and `npm run db:migrate` applies `0061` and `0062`.
8. **Add the recorded form to the kept entry** as a variant, with the values from step 3: by hand once `0062` has applied, or in the entry form once MB.219 and MB.221 have landed. If a reference, substitute or category was the other's alone because it was true of that form only, move it from the kept entry onto the new variant once MB.217 has added the variant columns.

## Sources

- American College of Healthcare Sciences. "Understanding Cautions & Contraindications for Herbs & Oils." ACHS Blog. Accessed October 11, 2026. https://achs.edu/blog/cautions-contraindications-for-herbs-oils/. (Reviewed by Amanda Lattin, ACHS Dean of Aromatherapy.)
- Cunningham, Scott. _Cunningham's Encyclopedia of Magical Herbs_. St. Paul, MN: Llewellyn Publications, 1985.
- Cunningham, Scott. _The Complete Book of Incense, Oils and Brews_. St. Paul, MN: Llewellyn Publications, 1989.
- European Medicines Agency, Committee on Herbal Medicinal Products. "Template for a European Union Herbal Monograph." EMA/HMPC/107436/2005 Rev. 8. Amsterdam: European Medicines Agency, November 20, 2024. Accessed October 11, 2026. https://www.ema.europa.eu/system/files/documents/template-form/template-hmpc-european-union-herbal-monograph_en_0.pdf.
- "Fragrance in Ancient Greece: Mythical Origins." Scento. August 21, 2026. Accessed October 11, 2026. https://www.scento.com/blog/fragrance-ancient-greece-mythical-origins.
- Sustainable Agriculture Research and Education. "Essential Oils: Pure Botanical Distillations." SARE Projects. Accessed October 11, 2026. https://projects.sare.org/media/pdf/e/s/s/essential-oils.pdf.
