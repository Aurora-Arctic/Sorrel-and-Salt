## The standard scenario (M1.22)

`src/db/seed/standard.ts` implements DESIGN.md §"Seed data"'s second scenario:
seven fixture users, workspaces W and X, and a populated compendium. It is the
fixture every authorization test reads against, which is why the cast is fixed
rather than generated — `asUser(A)` (M1.26, `tests/support/as-user.ts`, which
re-exports this module's own `FIXTURE_USERS`) has to mean the same person in
every suite, and an id a test can name beats one this run happened to produce.

| User | Id      | Role      | Where                                   |
| ---- | ------- | --------- | --------------------------------------- |
| A    | `…0003` | `user`    | owner of W                              |
| B    | `…0004` | `user`    | member of W                             |
| C    | `…0005` | `user`    | viewer in W                             |
| D    | `…0006` | `user`    | member of unrelated X                   |
| E    | `…0007` | `admin`   | no workspace at all                     |
| F    | `…0008` | `curator` | no workspace at all (M11.20)            |
| G    | `…0009` | `user`    | no workspace; email unverified (MB.268) |

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

**Every fixture user is seeded with a verified email address (MB.268).** An unverified account reaches no page but `/account/email`, so an unverified fixture could not be used to browse the dev site signed in. The seed's system user (`…0001`) is the one unverified user, left so on purpose: it gives the dev site an account to try the unverified path with ([`seed-module.md`](seed-module.md), "minimal").

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
  each list is in use. Ginger here is `Root`, the curated value; the compendium
  holds nothing else (MB.162), and `demo` seeds no coven entry with an
  uncurated one.
- **One entry with two forms**: Rosemary is `Herb` and `Oil` (MB.222), the
  oil with its own description, "Sprigs steeped in olive oil for a month, then
  strained, for anointing.", and its own safety note, "Dry the sprigs first: a
  fresh herb in oil can grow botulism. Keep it cool, and never eat it." It is
  the variant model's own hard case: two forms of one plant are one entry, and
  a form adds to the entry without repeating it. Every other entry has one form.
- **Comfrey beside foxglove**, both `Leaf`, both carrying safety notes: §5's
  argument for demanding a formal name in the curated tier is that those two
  are confused in the field.

M4.7/M4.7a (fuzzy duplicates, scoped suggestions), M8.3a (folk-name
promotion) and the compendium matches an own entry's page offers (M12.12,
M12.22) resolve against these rows. None of those tasks can be tested against tidy data, which is why the
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
rewritten. Every seeded entry holds exactly the live variants its literal
names, Rosemary's `Herb` and `Oil` among them, and a second run writes no variant.

### W's cupboard

`standard` seeds six `workspace_compendium_entries` rows for W, five of them
annotated, so a member of W who opens those compendium entries sees the Annotate
action and an annotated entry (`STANDARD_CUPBOARD` in `src/db/seed/standard.ts`,
written by `insertMissingCupboardEntries`, which keys on the coven and the entry
and ignores `deleted_at`, so a row the coven removed stays removed):

| Entry (formal name)                 | Row says                                                                             |
| ----------------------------------- | ------------------------------------------------------------------------------------ |
| Rosemary (_Salvia rosmarinus_)      | label `Garden Rosemary`, a description                                               |
| Ginger (_Zingiber officinale_)      | none: held and not annotated                                                         |
| Mugwort (_Artemisia vulgaris_)      | label `Hedgerow Mugwort`, a safety note, celestial bodies `Moon` and `Neptune`       |
| Lavender (_Lavandula angustifolia_) | a description, elements `air` and `water`, zodiac sign `Pisces`                      |
| Comfrey (_Symphytum officinale_)    | a safety note                                                                        |
| Sea Salt (_Sodium chloride_)        | label `Kitchen Salt`, elements `[]` (cleared on purpose), colours `grey` and `white` |

Only compendium entries `standard` itself seeds can be named, since the curated
shards are `demo`'s. X and every coven a test creates start with an empty
cupboard, and no coven has any of its own ingredients, so a test that wants an
entry in one inserts the row itself
(`tests/support/db/insert-cupboard-entry.ts`). Until now `standard` seeded no
cupboard rows (M12.26), so that tests start from an empty cupboard; a test that
holds one of the six entries in W needs a coven of its own. `demo` adds German
Chamomile to W's rows ([demo-scenario.md](demo-scenario.md)).

### W's stock

`standard` seeds seven jars of stock for W (`STANDARD_STOCK` in `src/db/seed/standard.ts`, written by `insertMissingStock`), so the ingredients page's jar lines and Edit Stock button (M9.9) have something to show. Every jar sits on an entry in W's cupboard above, since a jar on a compendium variant needs its entry's cupboard row (M12.13, decision 11). Their ids are fixed in a block of their own, `…0003-…`; `demo` keeps `…0001`, `…0002`, `…0005` and `…0006` for its own jars ([demo-scenario.md](demo-scenario.md), "W's stock").

| Ingredient (form) | Id      | Quantity | Why it is there                                                                 |
| ----------------- | ------- | -------- | ------------------------------------------------------------------------------- |
| Rosemary (Herb)   | `…0003` | 60 g     | The first of Rosemary's two jar lines, with a source.                           |
| Rosemary (Oil)    | `…0004` | 45 ml    | Its second form, in a second dimension: two jar lines on one card.              |
| Ginger (Root)     | `…0007` | 6 piece  | Counted rather than weighed, with a date acquired.                              |
| Mugwort (Herb)    | `…0008` | 4 g      | Under the default 10 g threshold, so the Low badge shows.                       |
| Lavender (Flower) | `…0009` | none     | Held and never weighed: no quantity, no unit, so "Unmeasured" and no threshold. |
| Comfrey (Leaf)    | `…0010` | 30 g     | Under a threshold of its own (50 g) in place of the default 10 g.               |
| Sea Salt (Salt)   | `…0011` | 500 g    | A well-stocked jar, with a source.                                              |

A jar that sets no threshold gets its unit's default, from `defaultThreshold` in `src/modules/ingredients/validation/default-threshold.ts`, the rule `createStock` reads too. Idempotency is the pair the live-unique index guards, W and the variant, ignoring `deleted_at`, so a jar the coven threw out stays out and one it edited is not written over. A test that inserts a jar on one of these six variants in W meets that index, so it needs a coven of its own or a different form. X and every coven a test creates start with no stock.

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
And a database seeded when an entry carried an older label finds it present
under the same formal name, so it keeps that label rather than failing.

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

The pick's position is chosen so that a second run moves nothing. `insertMissingDeities`
matches a pick on the case-folded name the row holds, not on the deity picked,
over the live rows: a database that ran the earlier fill already holds these
deities as typed names at these positions, and a pick beside each would take a
position its typed twin holds. With `restoreDeleted` off it reads every row, so a
deleted pick counts as present. A missing pick goes after every live pick of its
entry, in the literal's order, not at its literal index, because the service
renumbers the picks it keeps and a pick removed from anywhere but the end leaves
its index held by the pick below. On an entry with no live pick that is the
literal index.

### Slug backfill

`reslugIngredients` runs on every seed over its own entries. Each live entry's slug
is re-derived and written where it differs, so a reseed with nothing to change
writes nothing. A compendium entry's old slug is retired for the 180-day redirect.
A slug another live row holds is left alone, so a reseed never fails on an
admin's row.

### Retired slugs

`insertMissingRetiredSlugs` writes the two retired slugs described under "The
compendium is awkward on purpose": Rosemary's old slug, which answers a 308, and
Hidcote Lavender's, which shows Lavender with a notice that Hidcote Lavender moved
away. Both are keyed on the entry and slug, so a reseed writes nothing. The rows'
`retired_at` defaults to the run's instant, so the 180-day window runs from the
last write.
