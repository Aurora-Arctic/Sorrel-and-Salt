## The standard scenario

`src/db/seed/standard.ts` is the second seed scenario of DESIGN.md §"Seed data": seven fixture users, workspaces W and X, and a populated compendium. Every authorization test reads against it, so the cast is fixed rather than generated: `asUser(A)` (`tests/support/as-user.ts`, which re-exports this module's `FIXTURE_USERS`) means the same person in every suite, and an id a test can name beats a generated one.

| User | Id      | Role      | Where                          |
| ---- | ------- | --------- | ------------------------------ |
| A    | `…0003` | `user`    | steward of W                   |
| B    | `…0004` | `user`    | practitioner in W              |
| C    | `…0005` | `user`    | observer in W                  |
| D    | `…0006` | `user`    | practitioner in unrelated X    |
| E    | `…0007` | `admin`   | no workspace at all            |
| F    | `…0008` | `curator` | no workspace at all            |
| G    | `…0009` | `user`    | no workspace; email unverified |

The ids continue the series `…0001` (the bootstrap user) and `…0002` (`minimal`'s plain user). W and X take `…0001-…0001` and `…0001-…0002`, a block of their own. Their slugs come from `slugify(name)`, not written down.

- **E and F belong to no workspace on purpose.** A site keeper or curator has no access to any workspace's ingredients or grimoire (CLAUDE.md), which is assertable only against a keeper who is in none; W and X sharing no member is what makes a cross-workspace denial test say something. F is the curator: it proves a curator reaches the compendium's writes and refuses the people ones.
- **Every fixture user has a verified email**, because an unverified account reaches no page but `/account/email` and could not browse the dev site. The seed's system user (`…0001`) is the one unverified user, so the dev site has an account to try the unverified path with ([`seed-module.md`](seed-module.md), "minimal"). G is unverified for the same reason.
- **`canCreateWorkspace` follows the invite gate.** A–D are seeded `true` because each is in a workspace, which is how the flag comes to be true. E and F are seeded `true` because the CHECK `users_privileged_can_create_workspace` refuses a keeper or curator without it, and the gate reads the flag alone ([`auth.md`, "Every admin holds `canCreateWorkspace`"](../design-decisions/auth.md#every-admin-holds-cancreateworkspace)).
- **The cast's privileges are in `user_privilege_changes` from the start.** The seed writes no ledger row itself: the trigger on `users` records each privilege a user is inserted holding, by the route the seed declares around the insert, `bootstrap` (`declaringBootstrapPrivileges`). A–D are inserted as the seed's own user, so each has one `create_workspace` grant stamped as it. E and F are each inserted alone with themselves published as the acting user, so their grants are stamped as themselves. A second run inserts no user, so the trigger records nothing more ([`auth.md`, "One privilege ledger, written by the database"](../design-decisions/auth.md#one-privilege-ledger-written-by-the-database)).

### The compendium is awkward on purpose

A clean list of herbs would exercise nothing the identity model exists for, so the 26 entries carry §5's hard cases. Fuzzy duplicates, scoped suggestions, folk-name promotion and the compendium matches an own entry's page offers resolve against these rows and cannot be tested against tidy data.

- **Five rows labelled "Cat's Claw"** (_Uncaria tomentosa_, _U. guianensis_, _Senegalia greggii_, _Dolichandra unguis-cati_ and a claw from _Felis catus_), told apart only by the generated `identityKey`, their formal names. Uniqueness on `lower(name)` could have held one of them.
- **Two mineral varieties**, `Quartz var. amethyst` and `Gypsum var. selenite`, plus `Lapis lazuli` as a rock rather than a species.
- **A cultivar beside its species**: `Lavandula angustifolia 'Hidcote'` and `Lavandula angustifolia`, two entries because `canonicalName` is the most specific accepted name at the granularity the entry exists at.
- **Two retired slugs, one of each redirect the entry page answers.** `insertMissingRetiredSlugs` writes both, derived through `ingredientSlug` from the older name. Rosemary's slug under `Rosmarinus officinalis` is held by no entry, so that address answers a 308 to its current one. Hidcote Lavender's row carries the species entry's own slug, which the species holds live, so that address shows Lavender with a notice that Hidcote Lavender moved away.
- **Three `none` entries and one `unknown`.** No system names graveyard dirt, moon water or black salt. One does name Devil's Shoestring and nobody has looked it up, which is the row `where nomenclature = 'unknown'` returns as a curation to-do.
- **Only curated values** in the four curated fields: the sixteen in-use forms, and every celestial body, zodiac sign and deity, each spelt as its curated row spells it (`Herb`, not `herb`; Ginger is `Root`), since the compendium may hold nothing else, and `demo` seeds no coven entry with an uncurated one. A few entries carry signs and deities so each list is in use (Bay Laurel's `Leo` and `Apollo`, Lavender's `Gemini` and `Virgo`, Mugwort's `Artemis` and `Diana`).
- **One entry with two forms**: Rosemary is `Herb` and `Oil`, the oil with its own description ("Sprigs steeped in olive oil for a month, then strained, for anointing.") and safety note ("Dry the sprigs first: a fresh herb in oil can grow botulism. Keep it cool, and never eat it."). Two forms of one plant are one entry, and a form adds to the entry without repeating it. Every other entry has one form.
- **Comfrey beside foxglove**, both `Leaf`, both carrying safety notes: §5 demands a formal name in the curated tier because those two are confused in the field.

Entries also carry folk names ("Uña de Gato" on both _Uncaria_ rows, the ambiguity the child table exists to hold) and category assignments into §6's vocabulary.

**Every entry's forms are its variants.** An entry's literal lists them as `variants`, each a `SeedVariant`: a form, and optionally that form's own description and safety note. Neither the literal nor the row has a form of its own. After the entries, `insertMissingVariants(tx, entries, formIds?)` writes each one, keyed through `insertMissingBy` on `(ingredient_id, lower(form))`, the variant's unique index. With `formIds` (the curated rows by name) a form is picked by name, as a keeper's compendium form must be; without it, as for `demo`'s coven entries, a form is typed. A variant a keeper removed counts as present and is not restored, one already there is not rewritten, and a second run writes none. So every seeded entry has exactly the live variants its literal names, and every seeded spell layer can name one. The five Cat's Claws stay five entries, since their formal names differ.

### W's cupboard

`standard` seeds six `workspace_compendium_entries` rows for W, five annotated, so a member of W sees the Annotate action and an annotated entry (`STANDARD_CUPBOARD` in `src/db/seed/standard.ts`, written by `insertMissingCupboardEntries`, which keys on the coven and the entry and ignores `deleted_at`, so a row the coven removed stays removed):

| Entry (formal name)                 | Row says                                                                             |
| ----------------------------------- | ------------------------------------------------------------------------------------ |
| Rosemary (_Salvia rosmarinus_)      | label `Garden Rosemary`, a description                                               |
| Ginger (_Zingiber officinale_)      | none: held and not annotated                                                         |
| Mugwort (_Artemisia vulgaris_)      | label `Hedgerow Mugwort`, a safety note, celestial bodies `Moon` and `Neptune`       |
| Lavender (_Lavandula angustifolia_) | a description, elements `air` and `water`, zodiac sign `Pisces`                      |
| Comfrey (_Symphytum officinale_)    | a safety note                                                                        |
| Sea Salt (_Sodium chloride_)        | label `Kitchen Salt`, elements `[]` (cleared on purpose), colours `grey` and `white` |

Only entries `standard` itself seeds can be named, since the curated shards are `demo`'s. X and every coven a test creates start with an empty cupboard and no ingredients of their own, so a test that wants one inserts the row itself (`tests/support/db/insert-cupboard-entry.ts`), and a test that holds one of these six in W needs a coven of its own. `demo` adds German Chamomile to W's rows ([demo-scenario.md](demo-scenario.md)).

### W's stock

`standard` seeds seven jars of stock for W (`STANDARD_STOCK` in `src/db/seed/standard.ts`, written by `insertMissingStock` in `src/db/seed/coven-content.ts`). Every jar sits on an entry in W's cupboard above, since a jar on a compendium variant needs its entry's cupboard row. Their ids are a block of their own, `…0003-…`; `demo` keeps `…0001`, `…0002`, `…0005` and `…0006` for its jars ([demo-scenario.md](demo-scenario.md), "W's stock").

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

`standard` is "a populated compendium": the forms, categories, celestial body, zodiac and deity vocabularies the autofills read, as well as the ingredients. An assignment points at a category by foreign key, so those rows exist first.

It seeds them **inside its own transaction** rather than calling `seedCategories(db)`, `seedForms(db)` and the rest, which would each open another. Each splits into a public `seedX(db)` that opens a transaction and a `seedXVocabulary(tx)` that assumes one, with the GUC published and the bootstrap user present. A half-applied scenario (categories seeded, users not) is worse than one that never ran.

`standard` takes the same shape: `seedStandard(db)` opens the transaction, publishes the GUC and inserts the bootstrap user (the three moves of `beginSeedTransaction`), then hands over to **`seedStandardContent(tx)`**, which `demo` calls too. `categoryIdByName(tx)` lives in `categories.ts` and `identityOf` is exported, since both scenarios file rows under §6's vocabulary by name and `demo` keys W's own ingredients on the same identity. That key says nothing about which tier a row is in, so a caller builds its map from one tier's rows, not both.

**Idempotency ignores `deleted_at`.** Users and workspaces are keyed by their fixed ids, memberships by their composite key, compendium entries by identity, folk names by ingredient plus `lower(name)`, assignments by their pair. Nothing already present is updated, so a renamed workspace or retitled entry survives a reseed, and an entry a keeper soft-deleted stays deleted, since the partial unique indexes stop only a second _live_ row and would let it through. `tests/db/seed/index.test.ts`'s sweep asserts this of the production seeds that share these helpers; a developer scenario has no test of its own. The one row a reseed of `standard` puts back on purpose is a compendium deity pick (below).

**The entry key is the entry's identity.** `identityOf(entry)` is the formal name, or the label where there is none, lower-cased: what the row's generated `identity_key` holds and what the identity indexes keep once per tier. A database row's key is read off that generated column, so Postgres's own expression runs. A literal's key is folded in TypeScript, which agrees on the seed's names, all ASCII. Where a deleted row and a live one hold the same key, the live one wins, so what the seed writes beside an entry lands on the live row. The identity is the key, not `(name, canonicalName)`, for two reasons: a relabelled entry is still the one the seed wrote, where a key on the label would insert it again and the identity index would refuse it and fail the scenario; and a database seeded when an entry carried an older label finds it present under the same formal name.

### A reseed of `standard` puts a deity pick back; `demo` does not

`standard` is the fixture scenario, so a reseed resets the fixtures: a compendium deity pick a keeper deleted comes back on the next run. `demo` is explored by a person, so a deletion there stays, as a deleted spell does. Staging and production run neither, only the five vocabulary seeds (`.github/workflows/migrate.yml`), so the restoring run is a local one.

Both run `seedStandardContent(tx)`; its `restoreDeletedDeityPicks` option, on by default and passed `false` by `demo`, decides which rows the picks are keyed over. On, over the live rows alone: a deleted pick is missing, so it is inserted again beside the tombstone. Off, over every row, so the tombstone counts as present. Every other seeded row ignores `deleted_at` in both scenarios.

`insertMissingDeities` matches a pick on the case-folded name the row holds, not on the deity picked, over the live rows, so a database that already holds these deities as typed names finds them present and gets no second pick beside each. A missing pick goes at the end of its list: the first position above every live pick of its entry, several in the literal's order. It cannot go at its literal index, because `replaceDeities` renumbers the picks it keeps, so a pick removed through the app from anywhere but the end leaves its index held by the pick below, and an insert there would fail `ingredient_deities_position_unique` and with it the whole scenario, on every compose `db-init` until a `db:reset`. Resetting the list to the literal's order would move rows a keeper ordered, which a seed that adds what is missing never does. On an entry with no live pick the end is the literal index, so a fresh database is seeded as the literal reads.

So a last pick deleted is live again under a new id at the same position; a first pick removed through the service is live again at the end of the list, the pick below unmoved. A second run moves nothing.

### Slug backfill

`reslugIngredients` runs on every seed over its own entries. Each live entry's slug is re-derived and written where it differs, so a reseed with nothing to change writes nothing. A compendium entry's old slug is retired for the 180-day redirect. A slug another live row holds is left alone, so a reseed never fails on an admin's row.

### Retired slugs

`insertMissingRetiredSlugs` writes the two retired slugs described under "The compendium is awkward on purpose". Both are keyed on the entry and slug, so a reseed writes nothing. `retired_at` defaults to the run's instant, so the 180-day window runs from the last write; once it lapses a compendium write deletes the rows and the next reseed writes them again, which fixtures can bear.
