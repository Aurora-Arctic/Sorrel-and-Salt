## Ingredient slugs (MB.80; table MB.81, rule MB.82)

Every ingredient carries a URL slug, and a compendium entry's is its public
address, `/compendium/ingredients/[slug]`. MB.81 landed the columns, the
indexes and the retirements table, and MB.82 the rule on top. The argument is
[`mb.80-public-compendium.md`](../design-decisions/mb.80-public-compendium.md),
superseded in part by
[`mb.82-slug-takeover.md`](../design-decisions/mb.82-slug-takeover.md); what
follows is what exists.

- **`slug` is the label, the form and the formal name, always.**
  `ingredientSlug(name, form, canonicalName)` in `src/lib/slugify.ts` is
  `slugify` of the three joined by spaces, an undeclared part left out:
  `Cat's Claw` / `bark` / _Uncaria tomentosa_ is
  `cats-claw-bark-uncaria-tomentosa`; graveyard dirt, which declares no formal
  name, is `graveyard-dirt-earth`. Every declared part goes in for every entry
  rather than only on a clash, so an address never depends on which entry was
  added first. The column is
  `NOT NULL` with **no default** — a default would be a second slug rule,
  written in SQL — so whoever writes a row derives it, the seed and the test
  fixtures included (`ingredientColumns` derives it the same way).
- **Two partial unique indexes.** The address is unique per tier among live
  rows — `ingredients_compendium_slug_unique` on `(slug)` where
  `workspace_id IS NULL AND deleted_at IS NULL`, and
  `ingredients_workspace_slug_unique` on `(workspace_id, slug)` where
  `deleted_at IS NULL`. The workspace index carries no tier predicate, as
  DESIGN.md §5 writes it: a null `workspace_id` collides with nothing in a
  btree, so compendium rows pass through it unconstrained. Soft-deleting an
  entry releases its slug, as every partial index here releases what it
  reserved.
- **MB.81's pending claims are gone.** `pending_slug`,
  `pending_slug_effective_at` and their two partial unique indexes held the
  claim a relabel made when its slug was reserved. MB.82 dropped the
  reservation and the schema's declarations, and MB.107's
  `0028_drop-pending-slugs.sql` dropped the four from the database once that
  had deployed: a column drop is two PRs ("Expand/contract").
- **Two entries may share a label and a form; the formal name tells them
  apart, in the slug as in the identity key.** The `standard` seed's two
  _Cat's Claw_ barks, _Uncaria tomentosa_ and _U. guianensis_, are
  `cats-claw-bark-uncaria-tomentosa` and `cats-claw-bark-uncaria-guianensis`.
  What the slug index still refuses is the pair `slugify` folds together and
  `canonical_key` does not — two formal names differing only in punctuation or
  accents (`Lavandula angustifolia 'Hidcote'` beside
  `Lavandula angustifolia Hidcote`), or words shifting between the label and
  the formal name — and the answer there is to distinguish the formal name.
  Because the formal name is in the address, changing it recomputes the slug
  exactly as a relabel does (MB.82).
- **`retired_ingredient_slugs`** — `id`, `ingredientId` (FK), `workspaceId`
  (nullable FK, the ingredient's own scope mirrored, so a retirement is per
  tier as the slug is), `slug`, `retiredAt` (`DEFAULT now()`), the generated
  `expiresAt`, + audit, with its `set_updated_at` trigger. One plain btree
  index on `slug`, **not unique**: a slug may be retired more than once over
  the years, by one entry or several, and the redirect is a predicate on
  `expires_at`, not a row's uniqueness. Only the compendium writes one.
- **`expires_at` is `date_trunc('day', retired_at) + interval '180 days'`**,
  generated and stored: midnight of the retirement's UTC calendar date, plus
  180 calendar days, so the window closes at the same instant for every slug
  retired that day whatever the hour of the rename, and nothing has to run at
  that instant — the redirect ends by a date comparison.
  It is legal as a stored generated column only because the column is
  `timestamp`: `date_trunc(text, timestamp)` and `timestamp + interval` are
  IMMUTABLE, where both are STABLE on `timestamptz`.

**The rule (MB.82).** The slug follows the label, the form and the formal
name: both services recompute it on every update, not only on create.

- **A compendium entry's old slug is retired as the admin's.**
  `updateCompendiumEntry` reads the row first, for the slug it holds, and
  when the new one differs it writes a retirement in the same transaction,
  `retired_at` the write's own instant. Two admins saving one entry at the
  same instant can retire the older slug rather than the one the other just
  wrote; with only admins writing the compendium, that is accepted rather
  than locked.
- **A retired slug redirects while its window is open and nobody holds it.**
  `findCompendiumSlugRedirect(slug, at, excluding?)` answers the live entry
  that moved off `slug` most recently, at its current slug, while
  `expires_at` is after `at` and no live compendium entry holds `slug` —
  an entry at the address is what the address answers. The entry is joined
  through `existsIn`, so a soft-deleted one answers nothing. `excluding`
  leaves one entry out on both sides, as the one that moved and as the one
  holding the slug.
- **`resolveCompendiumSlug(slug)` is the public route's one read,** taking no
  session: the live entry at `slug` (`findCompendiumEntryBySlug`), with
  `movedAway` naming an entry whose redirect from it would still be running
  but for this one, else `{ kind: 'moved', slug }` for a 308 to the current
  slug, else `NotFound` — a coven's slug included, since a coven entry's
  existence is private.
- **Taking a slug another entry redirects from asks first.** A create or a
  rename whose slug such a redirect runs from is refused as a
  `ValidationError` on `endRedirect`, naming the entry and the instant its
  window closes, unless the input carries `endRedirect: true`. The check is
  read before the write, as the collision naming is after it; two admins
  saving at once can both pass it. Confirmed, the write takes the slug, and
  the retirement stays, so the page at the address can link to the entry
  that moved. An entry taking back its own old slug is left out of the check
  and needs no confirmation.
- **A slug collision names the entry holding the address**, looked up by
  `findCompendiumEntryBySlug` after the write rolled back: the pair
  `slugify` folds together is not always visible in either input.
- **Lapsed retirements are hard-deleted on the next compendium write**, by
  `write.deleteLapsedSlugRetirements(admin, at)` inside it — the writer's one
  hard delete of a table carrying `deleted_at`, named for it as the
  provisional-account delete is, since `delete` is typed to refuse such a
  table. A redirect that has ended answers nothing, so there is nothing to
  tombstone.
- **Every instant is the caller's clock,** `new Date()` in the service, passed
  down rather than read from `now()`, so a test pins the window exactly and a
  retirement's `retired_at` is the same instant the check compared against.
- **A coven ingredient's slug retires nothing.** No route reads it — the
  in-app page is `/ingredients/[id]` — so `updateWorkspaceIngredient` moves
  it and writes no retirement, and a collision is refused on `name` as on
  create.

**The migration adds `slug` nullable and then sets it `NOT NULL` with no
backfill between** (`0025_ingredient-slugs.sql`, and its sidecar for the one
destructive statement). A backfill in SQL would be a second slug rule, and one
in TypeScript cannot run between two statements of one `drizzle-kit migrate`.
The task settles it: while no deployed code writes an ingredient, the table is
empty wherever the migration meets real data, and the seed is the backfill. A
local database the `standard` or `demo` scenario has already filled refuses
the step — `column "slug" of relation "ingredients" contains null values` —
and `npm run db:reset` (`make db-reset` from the host) rebuilds it. The test
and e2e databases are built from an empty schema every run and never meet it.
