## Spell visibility (M10.3)

DESIGN.md §5: a `workspace` spell is readable by every member of its coven,
viewers included; a `private` spell is readable by its **author alone**, owners
not excepted. `spells.visibility` is a `spell_visibility` enum —
`'private' | 'workspace'` — `NOT NULL DEFAULT 'workspace'`.

**The author is `created_by`.** §5 gives spells no separate author column, and
nothing in v1 transfers authorship, so the audit stamp is the answer rather
than a second column that could disagree with it.

An enum rather than a `CHECK`, for the reason `status` is one: §13's notes
model carries a third tier, `public`, and adding a value to an enum is an
`ALTER TYPE … ADD VALUE` where widening a `CHECK` re-validates every row.

**The default is on the column, not in a service.** A spell written by any
path — a seed, a fixture, a service that never mentions visibility — joins the
shared grimoire. The failure mode of the other default is silent: a spell
nobody but its author can see, in a coven that cannot tell it is missing.

### Reading: one predicate, nine finders, and why the generic ones refuse

`readableSpells(membership)` is the predicate, and the only one: the coven from
the proof, `deleted_at IS NULL`, and `visibility = 'workspace' OR created_by =
membership.userId`. Both halves come out of the proof, so there is no id a
caller could pass that disagrees with the check that minted it — the argument
`scopedTo` already makes one layer down.

`readableSpells` is exported from `src/db/repository/spells.ts` for the
repository's own finders, M13.5's and M13.6's workings among them, and not from
the repository's `index.ts`: above the repository nothing builds SQL (MB.33),
so a service has nothing to do with a condition. It builds that condition and
runs nothing; what the condition admits is proved over every finder by
`tests/db/repository/readable-spells.test.ts`.

Eight finders read through it, six of them in `spells.ts`:

| Finder                                                                             | Reads                                                                          |
| ---------------------------------------------------------------------------------- | ------------------------------------------------------------------------------ |
| `findOneSpell(membership, spellId)`                                                | one by id, `undefined` when it is another's private spell                      |
| `findManyInSpell(membership, table, spellId)`                                      | a spell's rows in `spell_steps` or `spell_categories`                          |
| `findManyInSpells(membership, table, spellIds)`                                    | the same for many spells in one statement, a loader's batch (M10.9)            |
| `findPageInReadableSpells(membership, table, order, page, where?)` (`finders.ts`)  | a cursor page of `spells` or a `spell_id` table (M10.9)                        |
| `findGrimoirePage(membership, page, query)` (`grimoire.ts`)                        | the grimoire's page in `query.order`, of `query.status`, through the one above |
| `findIngredientsInSpellsIncludingSoftDeleted(membership, ingredientIds)`           | the ingredients a readable spell holds ("What a spell holds", below)           |
| `findManyOfSpellIngredientsIncludingSoftDeleted(membership, table, ingredientIds)` | those ingredients' folk names or category links, through the one above         |
| `findFormsInSpellsIncludingSoftDeleted(membership, ingredientIds)`                 | those ingredients' forms, deleted or not (M10.9)                               |

One writer reads through the same rule (M13.11): `write.softDeleteSpell(membership, spellId)`
marks a spell deleted only where `readableSpells` admits it, so a member deleting another's
private spell by id writes nothing and is answered `[]`, as `findOneSpell` answers `undefined`.
Its steps go first, through `write.softDeleteStepsOfSpell`, scoped to the coven through their
live spell: once the spell is marked, the steps' `EXISTS` no longer reaches them.

**Proved as one matrix, held by one guard (M10.6).**
`tests/db/repository/readable-spells.test.ts` runs every relationship against
both visibilities — the author, the owner, another member, a viewer, the author
after demotion to viewer, a member of another coven by direct id, and the author
of a soft-deleted spell — and requires `findOneSpell` and `findManyInSpell` over
both child tables to give the same answer in each cell.
A site admin and a site curator are refused at the service, because
`assertMembership` refuses anyone outside the coven before a finder runs: its
site-admin arm is proved in `tests/modules/coven/services/membership.test.ts`,
and `tests/db/workspace-isolation.test.ts` sweeps both roles across the
grimoire's read check and `setSpellVisibility`. The lint rule
`sorrel/spell-visibility-read-in-one-place` (`lint/source-sweeps.js`) reads
`src/` as text and fails a
spell's visibility compared anywhere outside `readableSpells`: the column in a
query, the word in a raw `sql` template, or a JavaScript comparison of a
fetched row. The JavaScript check covers only `src/db/` and `src/modules/`,
where read decisions live: a component or a GraphQL resolver compares
`spell.visibility` to draw a private badge or a read-only control (M10.11,
M10.13) on a spell the service has already let the viewer read, which is a
display decision rather than who may read it. It allows two helpers beside the predicate, `visibilityIn` and `visibilityText` (M13.22: the grimoire's Visibility facet, which only narrows what `readableSpells` lets through), and one comparison, `setSpellVisibility`'s check of the
spell it has already read, which decides a write rather than who reads.
`spellStepWrites` scopes by coven alone and skips visibility on purpose: it
moves steps because their form is going, whoever may read the spell.

The generic finders refuse all three tables, and that refusal is the point.
`spells` carries `visibility`, so `findManyInWorkspace` will not compile
against it; the two join tables carry a `spell_id`, so `findMany`, `findOne`
and `findManyIncludingSoftDeleted` will not compile against them. Two
`{ column?: never }` constraints do it, in the shape `{ workspaceId?: never }`
already had: `spells` and the join tables each go through one finder because
every other finder's signature excludes them. A private spell that a service
merely forgot to exclude is
_absent_; one the type will not let that service query is _impossible_, and
only the second survives the next service written in a hurry.

**Why the join tables need a finder of their own.** Neither carries a
`workspace_id`, so neither can scope itself, and a spell's visibility rule
would hold for the spell while its contents stayed readable to anyone who knew
the id — the rule holding for the jar and leaking what is in it. Both reach
their coven and their visibility through the parent spell, which
`findManyInSpell` expresses as a correlated `EXISTS` over `readableSpells` —
in SQL, per CLAUDE.md rule 7, so a row a caller may not see is never fetched to
be filtered out afterwards. The subquery is `existsIn`'s, the repository's
second read builder (["Soft-delete filtering"](soft-delete.md)), which ANDs the spell's
`deleted_at IS NULL` onto it by construction; `readableSpells` carries the same
filter for the two finders that read `spells` directly, so in this one finder
the parent is filtered twice, and neither copy is the other's to forget.

### What a spell holds (M5.3)

A spell is a record of a working, so an ingredient soft-deleted after it went
into the jar is still in it: shown as it was, its categories still counted
toward the spell's derived categories, its safety notes still warning. The
data already holds that — `spell_steps` points at the row, its foreign
key is `NO ACTION`, and a soft delete touches no layer. What would lose it is
the read, since every other finder filters a deleted ingredient and `existsIn`
filters a deleted parent by construction. So three finders in `spells.ts` are
named exceptions to CLAUDE.md rule 4, each ending `…IncludingSoftDeleted` so
the call site says what it is:

| Finder                                                                             | Reads                                                                                    |
| ---------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------- |
| `findIngredientsInSpellsIncludingSoftDeleted(membership, ingredientIds)`           | the ingredients among the ids that a spell this member may read holds, deleted or not    |
| `findManyOfSpellIngredientsIncludingSoftDeleted(membership, table, ingredientIds)` | the live folk names or category links of those ingredients                               |
| `findFormsInSpellsIncludingSoftDeleted(membership, ingredientIds)`                 | the forms of those ingredients, deleted or not, so a step keeps the form it laid (M10.9) |

**Only the ingredient's tombstone is skipped, and the form's.** The spell must be readable and
live (`readableSpells`), and the layer live (`existsIn` over
`spell_steps`, which filters a removed layer by construction). The ingredient must be in the compendium
or the proof's coven: a layer's foreign key checks the id alone, so a W spell
linking X's ingredient is a row the schema accepts and the finder withholds. A
child's own tombstone still filters, so a folk name removed before the delete
stays removed. The forms are the one child read past its own tombstone,
through the third finder, so a step whose form alone was deleted still shows
it; a deleted form's category pairs need no hatch, since
`ingredient_categories` has no `deleted_at` and a form's soft delete leaves them.
The two children's finders reach their parents through the first —
two statements rather than one — because a deleted parent's tier cannot be
tested through `existsIn`, and a raw subquery is what MB.100 removed.

All three take ingredient ids rather than a spell id. The layers come from
`findManyInSpell`, and their `ingredientId`s batch into the first, which is
the loader key M10.9's resolution needs; a custom layer names no ingredient to
ask about. `findManyOfIngredients` refuses `spell_steps` at compile time
since M5.3: the table carries an `ingredient_id`, and read through a
compendium entry it would have been every coven's layers of that entry,
private spells included. The soft-delete guard pins all three hatches' shape
(["Soft-delete filtering"](soft-delete.md)); the argument, and v2's revision-pinned layers,
are [`m5.3-spells-keep-deleted-ingredients.md`](../design-decisions/m5.3-spells-keep-deleted-ingredients.md).

### Writing: the one-way rule

`src/modules/grimoire/services/spell-visibility.ts`'s `setSpellVisibility(session, workspaceId,
spellId, visibility)`. `private` may be widened to `workspace`; a **complete** spell's `workspace` may
never be narrowed back, for §5's reason. A draft moves either way (M10.20), and
the check reads the status the row holds before the write. The narrowing is refused with a
`Forbidden` **carrying a message that says so**, not the bare one: the caller
holds the permission, and a two-word refusal would send them looking for a
role they already have. The rule governs visibility and not existence — a
shared spell can still be deleted.

**There is no author clause in that service, and none is missing.**
`findOneSpell` has already answered `undefined` to everyone but the author, so
a member who cannot see a private spell cannot widen it either, and what they
get is `NotFound` rather than a refusal that confirms the spell exists.
Restating the visibility a spell already has is permitted: it is not a
narrowing, and refusing it would make an idempotent call an error.

M10.6 adds the read half: the exported `readableSpells` predicate, the read
matrix and the guard, all under "Reading" above. The transitions are proved in
`tests/modules/grimoire/services/spell-visibility.test.ts`. A shared spell's
deletion is proved in the repository by the matrix file, which soft-deletes a
`workspace` spell through `softDeleteByIdInWorkspace` under `withAudit` and
finds it gone from every finder; the service that deletes a spell is M13.11's
`deleteSpell`.

### `updateByIdInWorkspace`, and why it exists

MB.33 bars everything outside the database layer from importing `drizzle-orm`
at runtime, so a service cannot build the `where` that `updateInWorkspace`
takes. The eighth `AuditWriter` method builds the one predicate every entity
update needs — `id = $1`, ANDed onto the proof's own clause — below that
boundary. Each new method is a decision argued for in its own PR rather than
a convenience.

**`updateById` is the ninth** (MB.60), for the same reason on a table no proof
scopes: the primary admin's promotion writes `users.role` by the signed-in
user's own id, and the service cannot build `id = $1` either. It is the
unscoped twin, typed to refuse a table carrying `workspace_id`, so a scoped
update cannot take this route around the proof.

**`softDeleteByIds` is the tenth** (M8.2), for the same reason on the delete
side: saving an ingredient tombstones the folk names the save dropped, a batch
of ids the service holds and cannot turn into `id IN (…)`. It is the
soft-delete twin of `findManyByIds` — unscoped, typed to demand a
`deletedAt` and refuse a `workspace_id`, and an empty list writes nothing.
The proof still governs it: the ids come from `findManyOfIngredients` under
the parent’s tier, inside the transaction that has just written the parent
through the proof (see ["Workspace ingredients"](workspace-ingredients.md)).

**`softDeleteByIdInWorkspace` is the fifteenth** (M5.3), the delete-side twin
of `updateByIdInWorkspace`: a coven member's delete names its ingredient by
id, which the service cannot turn into `id = $1`. It ANDs the id onto the
proof's clause, so another coven's row and a compendium row are written
nothing and returned as nothing. Like `updateByIdInWorkspace` it admits
`spells`, whose visibility its type cannot see, so a spell's delete reads
`findOneSpell` first, as `setSpellVisibility` does.

### The spell service (M10.5)

`src/modules/grimoire/services/spells.ts` is where a coven's members meet the
grimoire. Owners and members hold `spell: create` and `update`, a viewer holds
`read` alone, and `assertMembership` refuses everyone else, a site admin
included.

| Call                               | Does                                                                                                |
| ---------------------------------- | --------------------------------------------------------------------------------------------------- |
| `createSpell` / `updateSpell`      | write the spell, its whole recipe and its assigned categories; `updateSpell` widens visibility only |
| `listGrimoire` / `readSpell`       | read a page, or one spell without its steps (`spell-reads.ts`)                                      |
| `addSpellStep` / `updateSpellStep` | write a one-off ingredient or an instruction, only on a spell the caller reads                      |

A call that names a spell reads it first as the caller. A private spell of
someone else, and a spell of another coven, both come back `NotFound`, so the
refusal does not confirm the spell exists. A step has no scope of its own, so
the spell read is what makes it writable exactly when its spell is readable.

`stepsOfSpells`, `Spell.steps`' batch, resolves each linked step's ingredient
through `findIngredientsInSpellsIncludingSoftDeleted` and marks one deleted
since with `deleted: true`. The list's paging is M10.9's. M10.10's saves link a step to
an ingredient, checking the link only when it is new: a step may lay a live
form of a live ingredient in the compendium or this coven, and a saved step
whose ingredient was deleted since keeps it. `updateSpell` changes the
visibility under the same one-way rule as `setSpellVisibility`, through the
same check (`services/visibility-rule.ts`), so a save cannot make a shared
spell private. [grimoire.md](grimoire.md), "Saving a recipe", has the rest.
