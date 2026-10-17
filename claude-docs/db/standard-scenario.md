## The standard scenario (M1.22)

`src/db/seed/standard.ts` implements DESIGN.md §"Seed data"'s second scenario:
six fixture users, workspaces W and X, and a populated compendium. It is the
fixture every authorization test reads against, which is why the cast is fixed
rather than generated — `asUser(A)` (M1.26, `tests/support/as-user.ts`, which
re-exports this module's own `FIXTURE_USERS`) has to mean the same person in
every suite, and an id a test can name beats one this run happened to produce.

| User | Id      | Role      | Where                        |
| ---- | ------- | --------- | ---------------------------- |
| A    | `…0003` | `user`    | owner of W                   |
| B    | `…0004` | `user`    | member of W                  |
| C    | `…0005` | `user`    | viewer in W                  |
| D    | `…0006` | `user`    | member of unrelated X        |
| E    | `…0007` | `admin`   | no workspace at all          |
| F    | `…0008` | `curator` | no workspace at all (M11.20) |

The ids continue the series `…0001` (the bootstrap user, MB.5) and `…0002`
(`minimal`'s plain user) opened; W and X take `…0001-…0001` and `…0001-…0002`,
a block of their own so a stray id is never ambiguous about what it names.
Their slugs are not written down — `slugify(name)`, through the one shared
implementation, exactly as every other slug in the repo.

**E's absence from every workspace is the fixture, not an omission.** "A site
admin has no access to any workspace's ingredients or grimoire" (CLAUDE.md,
asserted by M6.6) is only assertable against an admin who is in none, and W and
X sharing no member is what makes a cross-workspace denial test say something.

**F is the curator (M11.20)**: the fixture that proves a curator reaches the compendium's writes and refuses the people ones, and, like E, belongs to no workspace. F is seeded with the flag `true`, since the CHECK that replaced MB.177's (`users_privileged_can_create_workspace`) refuses any non-`user` role without it.

**`canCreateWorkspace` follows the invite gate rather than convenience.** A–D
are seeded `true` because each is in a workspace, and under §5 that is how the
flag comes to be true — an invitation was accepted. E has never been invited,
and holds the flag by being an admin: E is seeded `true`, since MB.177's CHECK
refuses an admin without the flag and M6.7's gate reads the flag alone
([`mb.177-admins-hold-workspace-creation.md`](../design-decisions/mb.177-admins-hold-workspace-creation.md)).

**The cast's privileges are in `user_privilege_changes` from the start.** The
seed writes no ledger row itself: the trigger on `users` records each
privilege a fixture user is inserted holding, by the route the seed declares
around the insert, `bootstrap` (`declaringBootstrapPrivileges`). A–D are
inserted as the seed's own user, so each has one `create_workspace` grant
stamped as it; E and F are each inserted alone with themselves published as the acting user,
so E's `admin` and `create_workspace` grants, and F's `curator` and `create_workspace` ones, are stamped as themselves, as a primary
admin's promotion is stamped as that admin. A second run inserts no user, so
the trigger records nothing more (MB.195;
[`mb.194-privilege-ledger-by-trigger.md`](../design-decisions/mb.194-privilege-ledger-by-trigger.md)).

### The compendium is awkward on purpose

A clean list of herbs would exercise nothing the identity model exists for, so
the 26 entries carry §5's own hard cases:

- **Five rows labelled "Cat's Claw"** — _Uncaria tomentosa_, _U. guianensis_,
  _Senegalia greggii_, _Dolichandra unguis-cati_ and a claw from _Felis catus_
  — told apart only by the generated `identityKey`, their formal names. Under uniqueness on
  `lower(name)` the compendium could have held one of them.
- **Two mineral varieties**, `Quartz var. amethyst` and `Gypsum var. selenite`,
  plus `Lapis lazuli` as a rock rather than a species.
- **A cultivar beside its species**: `Lavandula angustifolia 'Hidcote'` and
  `Lavandula angustifolia`, two entries because `canonicalName` is the most
  specific accepted name at the granularity the entry exists at.
- **Two retired slugs, one of each redirect the entry page answers** (MB.82;
  M8.19). `insertMissingRetiredSlugs` writes them, both derived through
  `ingredientSlug` from the older name. Rosemary's slug under
  `Rosmarinus officinalis` is held by no entry, so that address answers a 308
  to Rosemary's current one. Hidcote Lavender's row carries the species
  entry's own slug, as if the cultivar had first been entered under the
  species' name: the species holds it live, so that address shows Lavender with
  a notice that Hidcote Lavender moved away. Keyed on the entry and slug, so a
  reseed writes nothing; `retired_at` is the last writing run's, and once the
  180 days lapse a compendium write deletes the rows and the next reseed
  writes them again, which fixtures can bear.
- **Three `none` entries and one `unknown`.** No system names graveyard dirt,
  moon water or black salt; one does name Devil's Shoestring and nobody has
  looked it up, which is the row `where nomenclature = 'unknown'` returns as a
  curation to-do.
- **Only curated values** in the four curated fields (MB.162): the sixteen
  in-use forms come from M4.3a's vocabulary, and every celestial body, zodiac sign and
  deity from MB.93's and MB.129's, each spelt as its curated row spells it
  (`Herb`, not `herb`), since the compendium may hold nothing else. A few
  entries carry signs and deities — Bay Laurel's `Leo` and `Apollo`,
  Lavender's `Gemini` and `Virgo`, Mugwort's `Artemis` and `Diana` — so
  each list is in use. §5's uncurated `rhizome`, a value a member writes
  before an admin curates it and the second bucket of M4.7a's suggestion list,
  is a coven's: `demo` seeds it on W's own Ginger, and Ginger here is
  `Root`.
- **One entry with two forms**: Rosemary is `Herb` and `Oil` (MB.222), the
  oil with its own description, "Sprigs steeped in olive oil for a month, then
  strained, for anointing.", and its own safety note, "Dry the sprigs first: a
  fresh herb in oil can grow botulism. Keep it cool, and never eat it." It is
  the variant model's own hard case: two forms of one plant are one entry, and
  a form adds to the entry without repeating it. Every other entry has one form.
- **Comfrey beside foxglove**, both `Leaf`, both carrying safety notes: §5's
  argument for demanding a formal name in the curated tier is that those two
  are confused in the field.

M4.7/M4.7a (fuzzy duplicates, scoped suggestions) and M8.3/M8.3a
(local-beats-compendium resolution, folk-name promotion) resolve against these
rows. None of those tasks can be tested against tidy data, which is why the
mess is seeded rather than left for each test to build.

Entries also carry folk names (M4.4a's child table — "Uña de Gato" on both
_Uncaria_ rows, which is the ambiguity that table exists to hold) and category
assignments into §6's vocabulary.

**MB.215: every entry gets a variant, and Rosemary a second.** MB.216 writes one variant beside each seeded entry's form, through `insertMissingBy` keyed `(ingredient_id, lower(form))`, so every entry has exactly one live variant and every seeded spell layer can name one. MB.222 moved the seed onto variants — `SeedIngredient.variants`, and `identityOf` keyed on the identity, the formal name or the label without one — and gave **Rosemary an Oil variant** with its own description and safety note: the new model's awkward case, one entry with two forms, added to the list above. The five Cat's Claws stay five entries, since their formal names differ; the claw from _Felis catus_ never needed its form to be told from the vine. MB.220 re-slugs the seeded entries without their forms on reseed and retires each compendium slug it moves, and MB.222 corrected this section and the entry key below ([`../design-decisions/mb.215-ingredient-variants.md`](../design-decisions/mb.215-ingredient-variants.md)).

**Every entry's forms are its variants (MB.216, MB.222).** An entry's literal
lists its forms as `variants`, each a `SeedVariant`: a form, and optionally
that form's own description and safety note. The literal has no form of its
own, and neither has the row. After the entries,
`insertMissingVariants(tx, entries, formIds?)` writes each one, given each
entry's id beside the forms its literal lists. With `formIds`, the curated
rows by name, each form is picked by name, as an admin's compendium form must
be (MB.162); without it, as for `demo`'s coven entries, a form is typed. It
keys on the entry and the folded form, `(ingredient_id, lower(form))`, the
variant's unique index, through `insertMissingBy`: a variant an admin removed
counts as present and is not restored, and one already there is not
rewritten. `tests/db/seed/demo.test.ts` proves, after a `demo` run with
`standard` inside it, that every seeded entry holds exactly the live variants
its literal names — Rosemary's `Herb` and `Oil`, W's Ginger's `rhizome` with
no pick — and that a second run writes no variant.

### One transaction, every vocabulary

`standard` is "a populated compendium", and that is all of it: M4.3a's forms
and M4.3's categories as well as the ingredients, and since MB.93 and MB.129
the celestial body, zodiac and deity vocabularies the autofills read. An assignment
points at a category by foreign key, so those rows have to exist first — which
is why both seeds land a task ahead of this one.

It seeds them **inside its own transaction** rather than calling
`seedCategories(db)`, `seedForms(db)` and the rest, which would open one
more each. Each of
those now splits into a public `seedX(db)` that opens a transaction and a
`seedXVocabulary(tx)` that assumes one — the GUC published and the bootstrap
user present. A half-applied scenario (categories seeded, users not) is worse
than one that never ran, and every extra transaction is another chance at one.

`standard` itself takes that same shape since M1.23: `seedStandard(db)` opens
the transaction, publishes the GUC and inserts the bootstrap user (the three
moves `beginSeedTransaction` makes), then hands over to
**`seedStandardContent(tx)`** — which is what `demo` calls, one level
up and for the same reason. Two of its internals are shared rather than copied
for the same argument: `categoryIdByName(tx)` moved into `categories.ts`, since
both scenarios file rows under §6's vocabulary by name, and `identityOf` is
exported, since `demo` keys W's own ingredients on the same identity. That
key says nothing about which tier a row is in, so a caller builds its map from
one tier's rows rather than from both at once.

Idempotency is the category seed's, keyed on identity and **ignoring
`deleted_at`**: users and workspaces by their fixed ids, memberships by their
composite key, compendium entries by identity (below), folk names
by ingredient plus `lower(name)`, assignments by their pair. Nothing already
present is updated, so a renamed workspace or a retitled entry survives a
reseed, and an entry an admin soft-deleted stays deleted rather than coming
back on the next run, since the partial unique indexes stop only a second
_live_ row and would let it through. `tests/db/seed/index.test.ts`'s sweep
asserts it of the production seeds this one shares its helpers with; a
developer scenario has no test of its own (MB.225). The one row a reseed of
`standard` puts back on purpose is a compendium deity pick (below).

The entry key is the entry's identity (MB.222): `identityOf(entry)`, the
formal name, or the label where there is none, lower-cased — what the row's
generated `identity_key` holds, and what the identity indexes keep once per
tier. A database row's key is read off that generated column, so Postgres's
own expression is the one that runs. A literal's key is folded in TypeScript,
which agrees with Postgres's lower-casing on the seed's names, all of them
ASCII. Where a deleted row and a live one hold the same key, the live one
wins, so what the seed writes beside an entry lands on the live row.

It was `(name, canonicalName, form)` until MB.222, and the identity was chosen
over `(name, canonicalName)` for two reasons. An entry a person relabelled is
still the one the seed wrote, where a key on the label would insert it again,
and the identity index would refuse that second row and fail the scenario.
And a `demo` database seeded when W's Ginger was "Fresh Ginger" finds it
present under the same formal name, so it keeps its old label rather than
failing ([demo-scenario.md](demo-scenario.md)).

### A reseed of `standard` puts a deity pick back; `demo` does not

The owner's call: `standard` is the fixture scenario, so a reseed resets the
fixtures, and a compendium deity pick an admin deleted comes back on the next
run. `demo` is explored by a person, so a deletion there is theirs and stays,
as a deleted spell does. Staging and production run neither — only the five
vocabulary seeds (`.github/workflows/migrate.yml`) — so the restoring run is
a local one.

Both run the same `seedStandardContent(tx)`; its
`restoreDeletedDeityPicks` option, on by default and passed `false` by
`demo`, decides which rows the picks are keyed over. On, over the live rows
alone: a deleted pick is missing, so it is inserted again, as a new row beside
the tombstone. Off, over every row, so the tombstone counts as present. Every
other seeded row ignores `deleted_at` in both scenarios.

A pick put back goes at the end of its list as the admin left it: the first
position above every live pick of its entry, several in the literal's order
(MB.192). Its literal index would collide. `replaceDeities` renumbers the
picks it keeps, so a pick removed through the app from anywhere but the end
leaves its index held by the pick below it, and an insert there would fail
`ingredient_deities_position_unique` and with it the whole scenario, on every
compose `db-init` until a `db:reset`. Resetting the list to the literal's
order instead would move rows an admin ordered, which a seed that adds what is
missing has never done. On an entry with no live pick the end is the literal
index, so a fresh database is seeded exactly as the literal reads, and a pick
deleted from the end of its list returns to the position it held.

So a last pick deleted is live again after the reseed, under a new id at the
same position; a first pick removed through the service, once the pick below
has taken its position, is live again at the end of the list, the pick below
unmoved.
