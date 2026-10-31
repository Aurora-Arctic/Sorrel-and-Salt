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
alone. The slug follows the label and the formal name (MB.220), and the one
an update leaves is retired and redirects for 180 days
(["Ingredient slugs"](ingredient-slugs.md)).
The categories are `categoryIds`, written in the same transaction as a
coven's are (MB.125).

**What both tiers write the same way is written once** (MB.211), in one
internal file, `services/ingredient-rows.ts`, which both services import and
the module's index does not. `splitChildren` splits the parse into the row's
fields, the deities to check and the child lists written as sent;
`ingredientColumns` maps the fields to columns, the slug among them;
`writeChildren(write, memberships, id, children, mode)` is each write's one
child call, `'add'` on a create and `'replace'` on an update, writing the folk
names, substitutes, deities, references, categories and forms in that order; and
`softDeleteIngredient` is both deletes' body, each passing its tier's writer.
`memberships` is the tier: none here, the proof's coven for a coven's.
**A sixth child table costs one writer, one loader and one input field**: its
add and replace pair in `ingredient-rows.ts`, a line in each branch of
`writeChildren` and its list in `splitChildren` and `IngredientChildren`; a
key in the record of loaders in `loaders/ingredient-children.ts`, exported by
name for `src/graphql/loaders/index.ts` to register, which both update
mutations clear through `clearIngredientChildren`; and a field in
`graphql/ingredient-input.ts`'s `ingredientInputFields`, which the four input
types spread. No service, mutation or input type is edited, and
`tests/modules/ingredients/graphql/workspace-ingredients.test.ts` proves the
mutations clear what the record names.

**Variants are the recipe's first adopter** (MB.219). An entry's forms are
`variants`, a field of `ingredientInputFields`, and `writeChildren` writes
them last, through `addVariants` and `replaceVariants`. Each form's own
substitutes, references and categories go through the same writers as the
entry's, now taking an owner, `{ ingredientId, variantId, at }`. `variantId`
is null for the entry's own rows. `at` is where the input sent the form,
`['variants', i]`, and every issue about one of its rows is pathed beneath
it. A replace matches each form sent to a row by its `id` when the entry
holds that row, and otherwise by its text folded, `lower(btrim(form))`, so a
form can be respelt in place. A row no form keeps is soft-deleted and its
children are left for a restore. A kept row is rewritten only where it
differs, so a save that changes nothing writes no form and none of its
children. The recipe needed one more edit: the services pass the lists
`resolvePicks` checks as one bundle. A form's pick and categories are read
against the database, as the deities and categories already were, so
`splitChildren` hands `resolvePicks` the deities and the forms together, and
its `children` go to `writeChildren` whole. The next child, checked or not,
edits neither service. `ingredient_variants_form_unique` is mapped where the
form is written, onto that form's `form`, since only that write knows which
entry it was writing. The compendium holds each form to the curated rules. Each form must be a pick, refused at
`['variants', i, 'form']` or `['variants', i, 'formId']`. Each form's celestial bodies
and signs must name curated rows, at `['variants', i, 'celestialBodies', j]`.

`variants` is the only place a form is written (MB.222). The ingredient row
has no form of its own, so nothing copies a variant onto it, and an input
carries no top-level `form` or `formId`. Each of the four input types
requires `variants`, and `[]` is an entry with no form, as story 29's
one-field stub sends it. The Zod schema still accepts it absent, reading that
as none, as every child list's absence reads.

**`nomenclature` is required.** `CompendiumIngredientInput` gives it no
default, because every compendium entry declares a naming system, `none` and
`unknown` included as answers (§5). A write that leaves it out, or sends
null, is a `ValidationError` on `nomenclature` from the parse, before
`withAudit` opens; the column's `NOT NULL` would have answered with a driver
error instead.

**`shown` is optional, and rides with the entry** (M14.35). `CompendiumIngredientInput` and `CompendiumIngredientUpdateInput` carry it so a modal saves it in the entry's own write. Left out, a create takes the column's default (shown) and an update leaves the flag as it is; `setCompendiumEntryShown` stays for the list row and the details.

**The form, celestial bodies, signs and deities are the curated rows'** (MB.162). A
coven's write keeps what was typed; these two do not. After the parse,
`inCuratedValues` checks the form and the deities by pick and the celestial bodies and
signs by spelling (MB.167, which moved the form and deities onto the pick).
Each form and every deity must be a pick of a curated row, held or not,
through `resolvePicks`, which `vocabulary`'s `curatedNames` answers by id: a
curated value typed rather than picked is refused as an uncurated one is, and
a held deity pick is refused once its deity is retired, where a coven keeps
it. The celestial bodies and signs read the live curated rows each value folds to,
through `vocabulary`'s `curatedSpellings`. Every value refused is one issue of
one `ValidationError`, beside its field — `['variants', i, 'form']` or
`['variants', i, 'formId']`, or `['celestialBodies', i]`, `['zodiacSigns', i]` or `['deities', i]` at the entry sent
— naming the list to pick from or add it to. A value that passes is written in
the row's spelling, so `moon ` is stored `Moon`. A form counts only under a live
group and a deity only under a live tradition, as the autofill reads them
([`validation.md`](../validation.md), "The two ingredient variants"). The
rows are read before `withAudit` opens, on the bare client, so an admin
deleting a row at the same instant can see one entry written with it, the
window MB.148 would let a lock close
([`design-decisions/mb.162-compendium-holds-curated-values.md`](../design-decisions/mb.162-compendium-holds-curated-values.md)).
The vocabulary writes keep the rule after the write: deleting a row a live
entry holds — picks, for a form or a deity — is refused, and a rename carries
onto the entries (M5.6a, MB.95, MB.132). Deleting a form group or a deity
tradition is not refused for the compendium: its forms or deities move to
another live one first, so they stay curated and no entry's pick is rewritten
(M5.6b, MB.132).

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

**A curator's write marks the entry reviewed** (M14.8). The mark is two
columns on the entry's row, `curator_reviewed_at` and `curator_reviewed_by`
(M14.5's migration 0081, with a check that both are set or neither), and it is what
keeps the seed from rewriting an entry a person has checked
([the seed's "Write-once"](compendium-seed/README.md#write-once-and-how-a-correction-lands)).
The service sets it, never the repository writer: `createCompendiumEntry`,
`updateCompendiumEntry` (even when nothing else changed) and
`promoteCompendiumFolkName` spread `reviewMark(curator, new Date())` into the row they
write: the curator's user id and the time of the write. A coven member
promoting a folk name on the coven's own entry writes no mark. A delete
does not set it, and nor does a write to a child row alone.
**`setCompendiumEntryReviewed(session, id, reviewed)`** sets or clears the
mark and nothing else: `assertCurator` (an admin or a curator), then
`withAudit` and `updateByIdInCompendium` with `reviewMark(...)` or
`NEEDS_REVIEW` (both null), then `expireCompendium()`. It moves neither
`updated_at` nor `updated_by`: the row's trigger (`set_updated_at`, as migration 0081 redefines it) leaves
both alone for a write that changes only the mark, so the mark never
reads as an edit, and the service test asserts both stay put. A coven's own
entry, a deleted one and an id that names nothing are `NotFound`.
The lint rule `sorrel/compendium-review-mark-switch-only`
(`lint/source-sweeps.js`) fails a service file that names the mark's columns
(`curatorReviewedAt`, `curatorReviewedBy`) or calls `setReviewInCompendium`
outside `setCompendiumEntryReviewed`, so a new writer cannot set the mark.

**A deleted entry is gone from every read and frees what it held** (M5.3).
The service test's `READS` table asks every exported read an entry reaches
anyone through — the list and its count, the read by id, its address and one
it moved off, its folk names, categories, substitutes, deities and
references, and a coven's substitute picker, duplicate warning, and
common-name, form, celestial body, sign and deity suggestions — whether it shows the
entry, before the delete and after. The table is where each reader's
soft-delete filter is proved, so no reader's own test carries a one-off
(MB.187).
It then adds the entry's formal name again under another label, the
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

- `ingredients_compendium_identity_key_unique` (MB.216; mapped since
  MB.220), the formal name alone, lands on `canonicalName` when the input
  declares a formal name, and on `name` when it does not. A `none` or
  `unknown` entry keys as its label, and §5's cross-namespace case is a label
  equal to another entry's formal name, where a message beside the empty
  formal-name field would point at a box the admin never filled in. The
  message names the holder by its label and formal name, and points at
  adding the form to it: an oil of a plant the compendium holds is a variant
  of that entry, not an entry beside it. The three-part key's
  `ingredients_compendium_identity_unique` was mapped the same way until
  MB.223 dropped it.
- `ingredients_compendium_slug_unique` lands on `name`, as the coven's does,
  naming the address and the entry holding it, unless another entry holds
  the identity too: the address index is older than the identity one, so an
  oil written under the herb's own label meets it first, and the refusal is
  then the identity's.

Both name the entry through the vocabulary's `describeEntry`, its label
unquoted as every vocabulary refusal names one, so a list of entries reads as
one sentence (MB.210).

The holder is read after the write has rolled back, by
`findCompendiumEntryByIdentity({ name, canonicalName })`: the live
compendium row whose `identity_key` equals the key those values would take,
the form no part of it since MB.220.
The key comes from `identityKeyOf` in the table's schema file, the builder
the generated column is built from too, so the finder folds the values
exactly as Postgres folded the row and the key has one spelling. Given the
bare column names it renders the text the migrations hold, byte for byte, so
`db:generate` sees no change. A holder gone by the time it is read — deleted
between the two statements — leaves the message without a name rather than
surfacing the raw error.

Each write expires the `compendium` tag once it has committed, so the
cached list answers it on the next read (M8.7; ([`compendium-cache.md`](compendium-cache.md), "Expiring the tag")). The GraphQL mutations over
these services are M5.5's: `createCompendiumIngredient`,
`updateCompendiumIngredient` and `deleteCompendiumIngredient`
([`graphql/schema.md`](../graphql/schema.md), "The compendium mutations").

**MB.215: variants are the sixth child, the recipe's first adopter.** An entry's forms become rows of `ingredient_variants` (DESIGN.md §5), and MB.219 writes them by the recipe above rather than through mutations of their own: `ingredientInputFields` gains `variants`, optional on all four input types while the old top-level form still saved, so the four carry it unedited; `splitChildren` and `IngredientChildren` gain the list; and `writeChildren` gains `addVariants` and `replaceVariants` in its two branches, which write each variant's own categories, substitutes and references through the existing add and replace helpers, widened to take an owner of `{ ingredientId, variantId }`. On replace a variant is matched by its `id` when the input carries one the entry holds, else by its folded form, so a form can be respelt in place; one no longer sent is soft-deleted, its children left; a new one is inserted. `resolvePicks` runs per variant, so each compendium form must be a pick, and a collision on `ingredient_variants_form_unique` lands at `['variants', i, 'form']`. MB.220 moves the identity collision onto `identity_key`: `findCompendiumEntryByIdentity({ name, canonicalName })` names the holder by its label and formal name, and the message points the admin at adding a form to it instead. Until MB.222 the top-level `form` and `formId` still saved, read as one variant when `variants` was absent (the shim), and the row's `form` and `formId` were the first variant's (the dual write). MB.222 removed both: `form` and `formId` left `ingredientInputFields`, `variants` became required on all four input types, the two creates included, and the row's two columns are undeclared and written by nothing until MB.223 drops them.

## Compendium service details

`src/modules/ingredients/services/compendium.ts` holds the compendium's list, entry read, writes and addresses.

- **Parsing.** `listCompendium` parses its filter because the browser is not the only caller, and because a category or deity id reaches a `uuid` comparison inside the keyset query, whose one client text was the cursor: an unchecked malformed id would come back as "Invalid cursor". A query shorter than `MIN_QUERY_LENGTH` is no search. `countCompendium` parses the same way, so it counts the rows the list's pages hold. `viewer` is needed only for the Reviewed setting, which a curator alone may set; the rest of the list takes no session.
- **`getIngredient`.** Without `workspaceId` the read is the compendium alone, so a coven's row answers `NotFound` to whoever asks. A compendium entry the curators have retired answers only a coven whose cupboard names it, and `NotFound` to everyone else. An id that is not a uuid names nothing and would be a driver error at the comparison, so it is `NotFound` first.
- **Create and update.** Forms, deities, celestial bodies and signs are picked from their curated vocabularies and written in the curated row's spelling. The slug is set from the label and the formal name. Create clears the compendium's lapsed retirements in the same write. Update replaces the whole entry, so a field left out is cleared, with a form kept by its id or else its folded text. When the slug moves the old one is retired as this admin's and redirects for 180 days. The row is read before the transaction for the slug it holds, so two admins saving at one instant can retire the older slug rather than the one the other just wrote.
- **Promote a folk name.** The folk name becomes the display name and the old one a folk name, kept once whatever its case. The change is global. A slug another entry's redirect still runs from refuses the promotion, since this write has no way to confirm ending it.
- **Reviewed mark.** `setCompendiumReviewed` is the only function that writes the mark; creating, editing or promoting leaves it as it was. Marking an entry already reviewed keeps its original date and reviewer. The seed never overwrites a reviewed entry (claude-docs/db/compendium-seed/README.md). The `set_updated_at` trigger leaves `updated_at` and `updated_by` as they were, so the entry is not shown as Updated. The admin's read of the mark is uncached, since the compendium's cached reads are the public ones, and does not read the reviewer.
- **Public entry read.** `getCompendiumEntryPage` takes no session and is cached whole under the `compendium` tag: every viewer sees the compendium alike, which a coven's route cannot do with the same assembly (it reads `getIngredient` and `ingredientDetailOf` uncached, per viewer). A refusal is never cached.
- **Curated lists (`checkCuratedLists`).** A compendium entry holds curated values alone: each form and each deity a pick of a curated row, and the celestial bodies and signs of the entry and each form in the spelling of the live row they fold to. A refusal is placed at the entry the input sent, blanks counted, since parsing drops blank bodies and signs and numbers a form's rows by what it sent. It is read before the write, so an admin retiring a row while another saves an entry naming it can leave that entry holding it. Every refusal is reported at once, in the form's order.
- **Redirect guard.** A write whose slug another entry's redirect runs from is refused unless the admin confirmed ending it with `endRedirect`, so the form can ask and send again. It is read before the write, so two admins saving at once can both pass it.
- **Delete and count.** Delete soft-deletes and leaves the folk names and category links. The held-in count for the delete confirm is a number only, never a coven's name or id, and sits beside `deleteCompendiumEntry` because the cupboard's own services are the coven's, under a membership.
- **Unique-index errors.** An identity collision (a second entry under a formal name the compendium holds, an oil beside the herb) is reported on `canonicalName`, or on `name` for an entry with none, naming the holder and pointing at adding the form to it. A label with no formal name keys as another entry's formal name (DESIGN.md §5), so the input alone would not say which entry. A slug collision names the entry holding the address, unless another entry holds the identity too, which is the collision to report: Postgres names the first broken index and the address index is older, so the oil written under the herb's label meets the address first. `id` is the entry an update writes, never its own collision.
