## The standard scenario (M1.22)

`src/db/seed/standard.ts` implements DESIGN.md §"Seed data"'s second scenario:
five fixture users, workspaces W and X, and a populated compendium. It is the
fixture every authorization test reads against, which is why the cast is fixed
rather than generated — `asUser(A)` (M1.26, `tests/support/as-user.ts`, which
re-exports this module's own `FIXTURE_USERS`) has to mean the same person in
every suite, and an id a test can name beats one this run happened to produce.

| User | Id      | Role    | Where                 |
| ---- | ------- | ------- | --------------------- |
| A    | `…0003` | `user`  | owner of W            |
| B    | `…0004` | `user`  | member of W           |
| C    | `…0005` | `user`  | viewer in W           |
| D    | `…0006` | `user`  | member of unrelated X |
| E    | `…0007` | `admin` | no workspace at all   |

The ids continue the series `…0001` (the bootstrap admin, MB.5) and `…0002`
(`minimal`'s plain user) opened; W and X take `…0001-…0001` and `…0001-…0002`,
a block of their own so a stray id is never ambiguous about what it names.
Their slugs are not written down — `slugify(name)`, through the one shared
implementation, exactly as every other slug in the repo.

**E's absence from every workspace is the fixture, not an omission.** "A site
admin has no access to any workspace's ingredients or grimoire" (CLAUDE.md,
asserted by M6.6) is only assertable against an admin who is in none, and W and
X sharing no member is what makes a cross-workspace denial test say something.

**`canCreateWorkspace` follows the invite gate rather than convenience.** A–D
are seeded `true` because each is in a workspace, and under §5 that is how the
flag comes to be true — an invitation was accepted. E is seeded `false`: E has
never been invited, and creates workspaces by being an admin instead. Seeding E
`true` would erase exactly the distinction M6.7's gate turns on.

### The compendium is awkward on purpose

A clean list of herbs would exercise nothing the identity model exists for, so
the 26 entries carry §5's own hard cases:

- **Five rows labelled "Cat's Claw"** — _Uncaria tomentosa_, _U. guianensis_,
  _Senegalia greggii_, _Dolichandra unguis-cati_ and a claw from _Felis catus_
  — told apart only by the generated `canonicalKey`. Under uniqueness on
  `lower(name)` the compendium could have held one of them.
- **Two mineral varieties**, `Quartz var. amethyst` and `Gypsum var. selenite`,
  plus `Lapis lazuli` as a rock rather than a species.
- **A cultivar beside its species**: `Lavandula angustifolia 'Hidcote'` and
  `Lavandula angustifolia`, two entries because `canonicalName` is the most
  specific accepted name at the granularity the entry exists at.
- **Three `none` entries and one `unknown`.** No system names graveyard dirt,
  moon water or black salt; one does name Devil's Shoestring and nobody has
  looked it up, which is the row `where nomenclature = 'unknown'` returns as a
  curation to-do.
- **One uncurated form**, `rhizome` on Ginger — §5's own example of a value a
  member writes before an admin curates it, and the second bucket of M4.7a's
  suggestion list. The other fifteen in-use forms come from M4.3a's vocabulary.
- **Comfrey beside foxglove**, both `leaf`, both carrying safety notes: §5's
  argument for demanding a formal name in the curated tier is that those two
  are confused in the field.

M4.7/M4.7a (fuzzy duplicates, scoped suggestions) and M8.3/M8.3a
(local-beats-compendium resolution, folk-name promotion) resolve against these
rows. None of those tasks can be tested against tidy data, which is why the
mess is seeded rather than left for each test to build.

Entries also carry folk names (M4.4a's child table — "Uña de Gato" on both
_Uncaria_ rows, which is the ambiguity that table exists to hold) and category
assignments into §6's vocabulary.

### One transaction, three vocabularies

`standard` is "a populated compendium", and that is all of it: M4.3a's forms
and M4.3's categories as well as the ingredients. An assignment points at a
category by foreign key, so those rows have to exist first — which is why both
seeds land a task ahead of this one.

It seeds them **inside its own transaction** rather than calling
`seedCategories(db)` and `seedForms(db)`, which would open two more. Each of
those now splits into a public `seedX(db)` that opens a transaction and a
`seedXVocabulary(tx)` that assumes one — the GUC published and the bootstrap
admin present. A half-applied scenario (categories seeded, users not) is worse
than one that never ran, and three transactions is three chances at one.

`standard` itself takes that same shape since M1.23: `seedStandard(db)` opens
the transaction, publishes the GUC and inserts the bootstrap admin (the three
moves `beginSeedTransaction` makes), then hands over to
**`seedStandardContent(tx)`** — which is what `demo` calls, one level
up and for the same reason. Two of its internals are shared rather than copied
for the same argument: `categoryIdByName(tx)` moved into `categories.ts`, since
both scenarios file rows under §6's vocabulary by name, and `identityOf` is
exported, since `demo` keys W's own ingredients on the same three columns. That
key says nothing about which tier a row is in, so a caller builds its map from
one tier's rows rather than from both at once.

Idempotency is the category seed's, keyed on identity and **ignoring
`deleted_at`**: users and workspaces by their fixed ids, memberships by their
composite key, compendium entries by `(name, canonicalName, form)`, folk names
by ingredient plus `lower(name)`, assignments by their pair. Nothing already
present is updated, so a renamed workspace or a retitled entry survives a
reseed, and an entry an admin soft-deleted stays deleted rather than coming
back on the next run — asserted by test, since the partial unique indexes stop
only a second _live_ row and would let it through.

The entry key is `(name, canonicalName, form)` rather than `canonicalKey`
deliberately: those are the three columns §5's generated expression reads, and
recomputing that normalisation in TypeScript would be a second implementation
to keep in step — the one that lies is the one nobody runs.
