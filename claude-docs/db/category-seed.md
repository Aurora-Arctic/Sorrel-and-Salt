## The category seed (M4.3)

`src/db/seed/categories.ts` seeds DESIGN.md §6: eight `category_groups` rows,
then the 63 `categories` that point at them. **It is not a scenario.**
`minimal` leaves the compendium empty by definition and M1.22's `standard`
consumes what this writes, which is why §6's seed lands a task ahead of it.
`npm run db:seed:categories` runs it; that is `scripts/db-seed.ts` with a
`categories` argument rather than a script of its own, because the client
import is one of the six pinned exemptions
(["Who may import the client"](client-imports.md)) and a seventh is a decision.

**Idempotency keys on the slug and ignores `deleted_at`**, which is stronger
than the partial unique index gives on its own: the index only stops a second
_live_ row, so a slug an admin had soft-deleted would be re-inserted on the
next run. Removing a category is a decision, and a seed that runs again on
every deploy would keep undoing it. Nothing already present is updated either,
so a retitled category and a retuned colour pair both survive — the point of
MB.35 is that the colour is the admin's from here on.

**The colours are resolved once, here.** MB.35 made a group's colour a pair of
hexes on the row, so M0.7's `$category-groups` Sass map is a seed source
rather than a runtime lookup; the sixteen hexes are written out as literals in
`CATEGORY_GROUPS`. `categories.test.ts` compiles M0.7's own
`category-group-color($slug, $theme)` and compares all sixteen, so retuning
the map without reseeding fails a test instead of drifting silently, and
recomputes the WCAG ratio for each against its own theme's ground (`$soot`
dark, `$parchment` light) rather than trusting M0.7's published table. Worst
pairing in the set is wellbeing's light hex at 4.74:1.

**Slugs are derived, not written down.** Every slug in the seed is
`slugify(name)` — `src/lib/slugify.ts`, the `slugify` package under pinned
options (`lower`, `strict`, `trim`, plus one charmap extension so an
underscore separates rather than vanishing). There is no second list to keep
in step, and no way to seed a row whose slug and name disagree. The rule is
shared rather than the seed's own because M4.3a's form vocabulary and M5.6's
admin mutations slug an admin-typed name with the same function, so a category
an admin adds lands in the same shape as a seeded one.

That is now a repo-wide rule rather than this seed's habit (CLAUDE.md,
Conventions): `src/lib/slugify.ts` is the only file that may import the
package or name a slug character class, and `tests/guards/slug-rule.test.ts` is
the mechanical half — it scans untracked files as well as tracked ones, so a
second implementation fails in the diff that adds it rather than after it
ships. The failure it exists to catch is quiet: two slug rules do not collide,
they disagree, and the disagreement surfaces only as a lookup that finds
nothing.

The visible consequence is in the group slugs: the package expands `&` to
"and", so "Protection & Defense" is `protection-and-defense`. DESIGN.md §6's
Slug column is corrected to match — it previously named eight hand-picked
short slugs, one of which (`grounding`, for "Craft & Change") collided with a
category slug inside its own group. Deriving removes that class of mistake
rather than fixing this instance of it.

`SASS_TOKEN_BY_GROUP_NAME` is where §6's vocabulary and M0.7's map keys meet,
and the only place they do. It is keyed by group _name_ rather than slug,
because the slug is derived and a map keyed on a derived value would need
rewriting every time the rule changed. M0.7's keys stay M0.7's words: renaming
one moves a token and the `--group-*` custom property generated from it, for
no gain now that nothing looks a colour up by slug (MB.35).

**It reaches staging and production on its own**, unlike every scenario seed:
`migrate.yml` runs `npm run db:seed:categories` against the deployed database
as a step after its own migrations, gated on a diff so it only fires when a
push actually changed a reference seed's files. Deploys are CI-only
and there is no shell on either database, so a vocabulary nobody can run by
hand has to arrive with the deploy that needs it. M4.3a's form vocabulary
and MB.93's planet and zodiac vocabularies share that step, that gate and
that summary — see ["The form vocabulary seed"](form-vocabulary-seed.md),
["The astrology vocabulary seed"](astrology-vocabulary-seed.md) and
`claude-docs/ci/deploy.md`.

One rule a later scenario inherits: write through the handle, stamping via
`applyAudit`, in `minimal.ts`'s shape.

`tests/db/seed/index.test.ts` is the `db`-project test: it applies the full
migration set into the worker's clone (the M1.18 pattern — the seed writes
into the real `users` table with its real self-referencing FKs, and "the
compendium is empty" needs tables to count), hands `seed()` a handle of its
own, and asserts the two rows, the fixed ids, the creator chain, idempotency,
and — through an `AFTER INSERT` trigger recording `current_setting('app.
current_user_id', true)` — that the GUC was published, the same
observation trick `tests/db/repository/write.test.ts` uses.
