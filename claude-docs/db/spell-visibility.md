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

### Reading: three finders, and why the generic ones refuse

`readableSpells(membership)` is the predicate, and the only one: the coven from
the proof, `deleted_at IS NULL`, and `visibility = 'workspace' OR created_by =
membership.userId`. Both halves come out of the proof, so there is no id a
caller could pass that disagrees with the check that minted it — the argument
`scopedTo` already makes one layer down.

| Finder                                        | Reads                                                       |
| --------------------------------------------- | ----------------------------------------------------------- |
| `findManySpells(membership)`                  | every spell of the coven this member may read               |
| `findOneSpell(membership, spellId)`           | one by id, `undefined` when it is another's private spell   |
| `findManyInSpell(membership, table, spellId)` | a spell's rows in `spell_ingredients` or `spell_categories` |

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
data already holds that — `spell_ingredients` points at the row, its foreign
key is `NO ACTION`, and a soft delete touches no layer. What would lose it is
the read, since every other finder filters a deleted ingredient and `existsIn`
filters a deleted parent by construction. So two finders in `spells.ts` are
named exceptions to CLAUDE.md rule 4, each ending `…IncludingSoftDeleted` so
the call site says what it is:

| Finder                                                                             | Reads                                                                                 |
| ---------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------- |
| `findIngredientsInSpellsIncludingSoftDeleted(membership, ingredientIds)`           | the ingredients among the ids that a spell this member may read holds, deleted or not |
| `findManyOfSpellIngredientsIncludingSoftDeleted(membership, table, ingredientIds)` | the live folk names or category links of those ingredients                            |

**Only the ingredient's tombstone is skipped.** The spell must be readable and
live (`readableSpells`), and the layer live (`existsIn` over
`spell_ingredients`, which filters a removed layer by construction). The ingredient must be in the compendium
or the proof's coven: a layer's foreign key checks the id alone, so a W spell
linking X's ingredient is a row the schema accepts and the finder withholds. A
child's own tombstone still filters, so a folk name removed before the delete
stays removed. The children's finder reaches its parents through the first —
two statements rather than one — because a deleted parent's tier cannot be
tested through `existsIn`, and a raw subquery is what MB.100 removed.

Both take ingredient ids rather than a spell id. The layers come from
`findManyInSpell`, and their `ingredientId`s batch into the first, which is
the loader key M10.9's resolution needs; a custom layer names no ingredient to
ask about. `findManyOfIngredients` refuses `spell_ingredients` at compile time
since M5.3: the table carries an `ingredient_id`, and read through a
compendium entry it would have been every coven's layers of that entry,
private spells included. The soft-delete guard pins both hatches' shape
(["Soft-delete filtering"](soft-delete.md)); the argument, and v2's revision-pinned layers,
are [`m5.3-spells-keep-deleted-ingredients.md`](../design-decisions/m5.3-spells-keep-deleted-ingredients.md).

### Writing: the one-way rule

`src/modules/grimoire/services/spell-visibility.ts`'s `setSpellVisibility(session, workspaceId,
spellId, visibility)`. `private` may be widened to `workspace`; `workspace` may
never be narrowed back, for §5's reason. The narrowing is refused with a
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

M10.6 adds the pure `resolveSpellVisibility()` and the exhaustive transition
matrix; this is the half that runs against the database.

### `updateByIdInWorkspace`, and why it exists

MB.33 bars everything outside the database layer from importing `drizzle-orm`
at runtime, so a service cannot build the `where` that `updateInWorkspace`
takes. The eighth `AuditWriter` method builds the one predicate every entity
update needs — `id = $1`, ANDed onto the proof's own clause — below that
boundary. `tests/db/repository/write.test.ts` pins the method count, so each new one is a
decision argued for in its own PR rather than a convenience.

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
