## Compendium writes (M5.2)

Three services in `ingredients`' `services/compendium.ts`, beside the reads:
`createCompendiumEntry(session, input)`, `updateCompendiumEntry(session, id,
input)` and `deleteCompendiumEntry(session, id)`. Each opens with
`assertSiteAdmin`, before the input is parsed, so a non-admin is refused the
same way whatever they sent, and writes through the compendium-tier methods
under its proof (["The SiteAdmin proof"](site-admin-proof.md)). A workspace
role counts for nothing: a coven's owner is refused as its viewer is.

**They mirror the coven's writes**
(["Workspace ingredients"](workspace-ingredients.md)) in everything but
the tier. The input is the whole entry, so an update replaces the row. Folk
names are written in the same transaction, the update's diff reading the live
ones through `findManyOfIngredients` with no proofs, which is the compendium
alone. The slug follows the label, the form and the formal name, and the one
an update leaves is retired and redirects for 180 days
(["Ingredient slugs"](ingredient-slugs.md)).
The row mapping and the folk-name diff live in one internal file,
`services/ingredient-rows.ts`, which both services import. Categories are not
written here, since `CompendiumIngredientInput` carries none.

**`nomenclature` is required.** `CompendiumIngredientInput` gives it no
default, because every compendium entry declares a naming system, `none` and
`unknown` included as answers (§5). A write that leaves it out, or sends
null, is a `ValidationError` on `nomenclature` from the parse, before
`withAudit` opens; the column's `NOT NULL` would have answered with a driver
error instead.

**The reach is the compendium's live rows.** A coven's ingredient, a
soft-deleted entry, an id that names nothing and one that is not a uuid are
all `NotFound`. So the site admin reaches no coven's ingredients by id — the
invariant in `CLAUDE.md` — and the service test asserts it on update and
delete with the row first shown reachable by its own coven. A delete is soft
and stamps `deleted_by`; the entry's folk names and category links stay,
since only a spell holding the entry reads them past it
(["What a spell holds"](spell-visibility.md#what-a-spell-holds-m53))
and their unique indexes are per ingredient. A `workspaceId` in the input is stripped by the Zod object,
and `insertInCompendium` would overwrite it if it were not.

**A deleted entry is gone from every read and frees what it held** (M5.3).
The service test asks each read an entry reaches anyone through — the list
and its count, the read by id, its address and one it moved off, its folk
names and categories, and a coven's duplicate warning and its common-name and
form suggestions — whether it shows the entry, before the delete and after.
It then adds the entry's formal name and form again under another label, the
write the identity index refused while the entry was live: the index's
`deleted_at IS NULL` is all that lets it through. The proof is on the formal
name, because two live entries may share a label anyway, so a label coming
back would pass with the predicate gone. The whole entry comes back the same
way, at its old address, and when a later write collides with the
re-added entry, the error names that entry rather than the deleted one,
though both rows carry the key. A spell holding the deleted entry still
reaches it.

**A collision is a `ValidationError` on the field that caused it, naming the
entry that already holds the identity.** As in the coven's writes, the service
catches the write's failure and reads the index off it with
`violatedUniqueIndex`:

- `ingredients_compendium_identity_unique` lands on `canonicalName` when the
  input declares a formal name, and on `name` when it does not. A `none` or
  `unknown` entry keys as its label, and §5's cross-namespace case is a label
  equal to another entry's formal name, where a message beside the empty
  formal-name field would point at a box the admin never filled in. The
  message names the holder by its label, formal name and form:
  `Already in the compendium as "Mugwort" (Artemisia vulgaris, herb)`.
- `ingredients_compendium_slug_unique` lands on `name`, as the coven's does,
  naming the address and the entry holding it: `"Testwort" (root) already has
the address "testwort-root" — change the name, form or formal name`.

The holder is read after the write has rolled back, by
`findCompendiumEntryByIdentity({ name, canonicalName, form })`: the live
compendium row whose `canonical_key` equals the key those values would take.
The key comes from `canonicalKeyOf` in the table's schema file, the builder
the generated column is built from too, so the finder folds the values
exactly as Postgres folded the row and the key has one spelling. Given the
bare column names it renders the text the migrations hold, byte for byte, so
`db:generate` sees no change. A holder gone by the time it is read — deleted
between the two statements — leaves the message without a name rather than
surfacing the raw error.

Firing `revalidateTag` after each write is M8.7's, once M8.6 has put the
compendium behind the cache (CLAUDE.md rule 6). The GraphQL mutations over
these services are M5.5's.
