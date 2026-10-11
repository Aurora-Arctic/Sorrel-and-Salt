## The category seed (M4.3)

`src/db/seed/categories.ts` seeds DESIGN.md §6: eight `category_groups` rows,
then the 63 `categories` that point at them. **It is not a scenario.**
`minimal` leaves the compendium empty by definition and M1.22's `standard`
consumes what this writes, which is why §6's seed lands a task ahead of it.
`npm run db:seed:categories` runs it; that is `scripts/db-seed.ts` with a
`categories` argument rather than a script of its own, because the client
import is one of the six pinned exemptions
(["Who may import the client"](client-imports.md)) and a seventh is a decision.

**Idempotency keys on the seed key and ignores `deleted_at`** (MB.172), which
is stronger than the partial unique index gives on its own: the index only
stops a second _live_ row, so a row an admin had soft-deleted would be
re-inserted on the next run. A row is the seed's by its `seed_key`, the slug
it was given at insert, so one an admin has since renamed is not met by its
original either; a live row an admin wrote under a seed name is taken as
present by its slug ([seed-module.md](seed-module.md), "The seed module"). Removing a category is a decision, and a seed that runs again on
every deploy would keep undoing it. Nothing already present is updated either,
so a retitled category and a retuned colour pair both survive — the point of
MB.35 is that the colour is the admin's from here on.

**The colours live here and nowhere else.** MB.35 made a group's colour a
pair of hexes on the row; the sixteen are the owner's hand-tuned pairs,
written out as literals in `CATEGORY_GROUPS`, in
`src/db/seed/category-groups.ts` — a file of its own, importing nothing at
runtime, so the workshop can render the pairs without bundling the seed
(MB.36). M0.7's `$category-groups` Sass map, which they were once resolved
from, is retired (M5.6b): it gave every group one saturation per theme, and
the hand-tuned pairs follow no single formula
([`styling.md`](../styling.md), "Category-group colours").

Each group sits on its own odd 22.5° step of the rotation off `$sorrel`'s
hue, both hexes within 2° of it; the widest drift is Love & Connection's dark
hex, at 1.04°. That is review's to hold, a matter of presentation (MB.225).
`categories.test.ts` holds what is functional: the WCAG ratio of each hex
against its own theme's ground (`$soot` dark, `$parchment` light), the
grounds read from `_variables.scss` itself, so a repalette cannot leave the
ratios measuring against the wrong thing. Worst pairing in the set is Mind &
Spirit's light hex at 4.52:1.

**A retuned colour needs a migration as well as a seed edit**, because the
seed inserts only missing rows and never reaches one already written.
`0052_retune-category-group-colours.sql` carries M5.6b's retune onto databases
the seed had already filled. It updates each colour column on its own, matched
by `seed_key`, and only where the column still holds the old seed's value
(compared case-insensitively) on a live row — so a colour an admin has since
chosen stays theirs, and an admin who retuned one half of a pair keeps it while
the other half moves. Only the values that changed are listed: six dark hexes
and all eight light ones. It stamps `updated_by` as the bootstrap user, whose
values these are.

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
package or name a slug character class, and a `no-restricted-imports` path in
`.oxlintrc.json` is the mechanical half: an import of the package anywhere
else fails `npm run lint` in the diff that adds it. The failure it exists to catch is quiet: two slug rules do not collide,
they disagree, and the disagreement surfaces only as a lookup that finds
nothing.

The visible consequence is in the group slugs: the package expands `&` to
"and", so "Protection & Defense" is `protection-and-defense`. DESIGN.md §6's
Slug column is corrected to match — it previously named eight hand-picked
short slugs, one of which (`grounding`, for "Craft & Change") collided with a
category slug inside its own group. Deriving removes that class of mistake
rather than fixing this instance of it.

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

`tests/db/seed/index.test.ts` is the `db`-project test, against the worker's
clone with every table emptied first: it hands `seed()` a handle of its own
and asserts that `minimal` leaves a bare install no admin, then the shape
every production seed shares — the category, form, astrology, deity and
sources seeds `migrate.yml` runs, each alone; the dev-only scenarios are a
developer's to see working (MB.225) — once over all of them in an
`it.each(SEED_ENTRIES)` (MB.183;
[`testing/layer-ownership.md`](../testing/layer-ownership.md)): from empty
tables, the bootstrap user inserted as a plain user, every row of the seed's
own tables stamped as it and, through one `AFTER INSERT` trigger on every
table recording `current_setting('app.current_user_id', true)` — the
observation trick `tests/db/repository/write.test.ts` uses — published as the
acting user of every insert; a second run that changes no row anywhere; and a
row an admin soft-deleted left deleted. Each entry names the tables it is the
seed of.
`categories.test.ts` keeps what is the category seed's alone: every group's
colours clearing 4.5:1 on the page grounds `_variables.scss` defines, each
category filed under its group, and a reseed over a colour pair an admin
changed. Whether the literal matches §6 is review's, not a test's (MB.225).
