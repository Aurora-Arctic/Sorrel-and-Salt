## The demo scenario

`src/db/seed/demo.ts` implements DESIGN.md "Seed data"'s third scenario: `standard` plus spells in W's grimoire, W's cupboard, stock and workings. It is the scenario a screenshot is taken against, so its content is written out the way a member would write it (an intent in a sentence, instructions that read like instructions, a stack that names what went in and in what order), never "Spell 1". The exact rows are the files' own: `demo.ts`, `demo-workings.ts`, `invitation-cards.ts`, `sanctioned-users.ts`, `support-requests.ts`, all under `src/db/seed/`. This file keeps the rules the data is built to.

- **Ids** are fixed and each kind takes a block of its own: users `…0000-`, workspaces `…0001-`, spells `…0002-`, stock `…0003-`, workings `…0004-`, the pause `…0006-`. The two jars are `…0001` (Hearth Warding Jar, complete) and `…0002` (Dreaming Sachet, draft); a draft sits beside a finished spell because the status badge needs both to show.
- **One layer carries no quantity**, because a sprig laid on top is not a measurement and `quantity` and `unit` are nullable for that reason.
- **Layer order is the position in the `layers` array**, never a number written beside it: one list, so the stack and its depths cannot disagree, and each jar is numbered from 1.
- **One custom, one-off layer**, "Dust from the front step" (`form` `dust`, no `ingredient_id`), sits between two linked layers in the Hearth Warding Jar. It is never an `ingredients` row, and `dust` is in no curated vocabulary: free text is what lets a member write it. It is the row of the second kind that rendering, reordering and printing must handle.
- **A layer finds its ingredient by tier and identity** (`ingredientIdByIdentity`), the same key the cupboard rows use. A linked layer lays its ingredient's first live variant in form order, read back after the variants are written.

### The content helpers

The helpers that write a coven's content live in `src/db/seed/coven-content.ts`, not in `demo.ts`: `insertMissingWorkspaceIngredients`, `insertMissingVariants`, `insertMissingCupboardEntries`, `insertMissingSpells`, `insertMissingSteps`, `insertMissingSpellCategories`, `insertMissingStock` and `insertMissingWorkings`. Each takes the coven it fills as `{ workspaceId, authorId }` (`CovenTarget`, in `types.ts`) and the data arrays, and reads no constant of W's, so any coven can be filled with them. `authorId` stamps the coven's private spells and need not be a member. `demo.ts` keeps W's data and calls them with W and B.

W's own entries list their forms as `variants`, as the compendium's do, written typed rather than picked and lower-case as the literals spell them. No coven entry in the demo shares a compendium entry's identity except Cat's Claw, which has no formal name.

### The grimoire shelf

`demo` seeds 54 more spells in W (`…0003` to `…0056`) so the grimoire page has a real shelf. It pages 24 cards at a time (`CARD_PAGE_SIZE`). W holds 56 spells, 28 complete and 28 drafts. Four are private to Fixture B, so every other member reads 26 and 26, B reads all 56, and both tabs run past one page for every member. The shelf is built to exercise:

- **Ranking.** Several titles share "Hearth", and Threshold Salt Line matches "hearth" only through its intent, so a search shows a title match ranked above an intent match.
- **Accent folding.** Rêverie Pillow Mist is a draft, found by "reverie".
- **An untitled draft** (`…0030`): the table allows no title for a draft only (`spells_complete_has_title`).
- **Private spells**, marked `byAuthor` in the data and written as B (`created_by` is the `authorId`). A, the steward, does not read them, so signing in as A shows what an ordinary member sees.
- **Categories** spread across several groups, so the category filter has more than one group to offer.

### The curated compendium comes with it

After `seedStandardContent`, in the same transaction, `demo` calls `seedCompendiumContent(tx, COMPENDIUM)`, so a person exploring finds every curated entry and its sources beside standard's fixture entries. The fixture entries go in first and keep their rows; a curated entry of the same identity, name or slug is skipped as present. `assertCompendiumValid` runs before the transaction opens, so an invalid literal writes nothing. `standard` stays without it: it is the test fixture cast. The layers name fixture entries by tier and identity, so the extra entries make none ambiguous.

`demo` passes `restoreDeletedDeityPicks: false` to `seedStandardContent`, so the one row a reseed of `standard` puts back, a compendium deity pick a keeper deleted, stays deleted here (standard-scenario.md, "A reseed of `standard` puts a deity pick back; `demo` does not").

### W's cupboard, own entries and stock

- **W's cupboard** is nine compendium entries held as `workspace_compendium_entries` rows ([workspace-compendium-entries.md](workspace-compendium-entries.md)), inserted directly, stamped like every other row, not through the cupboard service. Six are `standard`'s rows ([standard-scenario.md](standard-scenario.md), "W's cupboard"); `demo` adds German Chamomile, Black Salt and Amethyst, held because a spell lays each and a step names only what the coven holds (the recipe service checks it; the seed writes raw). They are built to show every kind of annotation: a label with a text override (Garden Rosemary), a label with an array override the compendium lacks (House Chamomile's `colors`), no override at all (Ginger, Black Salt, Amethyst), a safety note alone (Comfrey), and `elements` as an empty array, an answer rather than an absence (Sea Salt). Every other column is null, so it reads as the compendium's value. The jars lay compendium variants (Rosemary's `Herb`, Chamomile's `Flower`), and a jar on a compendium variant needs its entry's row ([`ingredients.md`, "A coven's cupboard names the compendium's entry, rather than hiding it"](../design-decisions/ingredients.md#a-covens-cupboard-names-the-compendiums-entry-rather-than-hiding-it), decision 11).
- **W's own ingredients**, the coven tier of §5's one table: `Hearth Ash` and `Cat's Claw`. A grimoire that reached only the compendium would exercise half of §5.
- **Cat's Claw is the "Similar in the Compendium" case.** W's entry has no formal name (nomenclature `unknown`, one `bark` variant); `standard` seeds five compendium Cat's Claws. It stays an own stub with no cupboard row, for a member to declare it to be one of the five.
- **Eleven jars of stock** (`DEMO_STOCK`): the seven `standard` seeds (["W's stock"](standard-scenario.md)) spread in, and four of its own. Each names its ingredient and the form it holds, and the seed looks the variant up by that pair. The four are built to show: an own entry with a weight, source and date acquired (Hearth Ash 250 g); a jar never weighed, so "Unmeasured" and no threshold (Cat's Claw); one under the default threshold, so the Low badge shows (German Chamomile Flower, 8 g under 10 g); and a count unit with a threshold of its own (German Chamomile Oil, 20 drop, threshold 12 not 3). A jar that sets no threshold gets its unit's `defaultThreshold` (`src/modules/ingredients/validation/default-threshold.ts`), the rule `createStock` reads, so the seed carries no second table. Every compendium entry stocked is in W's cupboard. `minimal` writes no stock. Idempotency is the pair the live-unique index guards, W and the variant, ignoring `deleted_at`: a jar the coven threw out stays out, one it edited is left as edited, and one it added itself for the same form is met rather than collided with.

### W's workings

`DEMO_WORKINGS` (`src/db/seed/demo-workings.ts`) writes eleven workings on five complete spells and none of the drafts, so the Workings section has rows to show. They mix complete and draft, workspace and private (never wider than the spell), recorders A and B (an observer cannot record), with and without participants and notes, dates from July to October 2026, none in the future.

Completing a working takes each deducted amount from its jar. The seed does the same once, when it first writes a working, so a re-run adds nothing and decrements nothing. A complete working's deductions are written out in the data, not computed by `planDeductions` at seed time; a test replays them against the spell steps and `DEMO_STOCK` in date order to prove they match what the service would take. Five spells' steps use grams so a deduction exists at all, since a step and a jar convert only within one dimension and a step in tablespoons against a jar in grams would be skipped. Hearth Warding Jar's draft working is built to show a completion that skips layers: Black Salt (no stock), the dust (a custom layer), the ash (pinches against a jar in grams) and the rosemary (no amount); Mugwort Seeing Wash's second working is 2 g short. Idempotency is the working's fixed id: a working present, deleted or not, is left alone with its participants and deductions.

### Idempotency, and a jar's stack seeded whole or not at all

The demo inserts what is missing, keyed on identity and ignoring `deleted_at`: spells by fixed id, W's ingredients by `identityOf`, assigned categories by the pair, cupboard rows by the coven and the entry (a row the coven removed counts as present), and stock by the coven and the variant. A database seeded before a content change keeps its old rows; `npm run db:reset` is what brings it to the scenario. A developer scenario, so no test holds the idempotency.

**`spell_ingredients` is the exception: the unit keyed on is the spell, not the layer.** A layer's identity is a depth in a shared sequence. Patch one row back into a stack a member has since edited and the arithmetic fails both ways: a layer pulled from the middle renumbers the ones below it, so the depth the seed wants is held by a different ingredient (the layer index), and the ingredient it wants is already at another depth. Either collision fails the whole scenario rather than the row. So a jar that already has layers is left exactly as it is, removed ones included, since a tombstone is a layer the jar has had and a jar a member emptied has been edited. What that gives up is a demo jar healing itself after someone empties it, which `npm run db:reset` does anyway; what it buys is that a reseed over an edited grimoire is a no-op rather than an error.

### Invitation cards, held-back accounts and support requests

These three run only in `demo`: not in `standard`, which every db test clones, and not in a reference seed, which runs on staging and production. Every row has a fixed id (or is found again by its natural key), so a second run adds nothing; times are set from the first run's clock, so a long-lived dev database shows them ageing; seeded rows are written past `withAudit`, as every seed row is.

- **Invitation cards** (`invitation-cards.ts`): three batches with fixed ids and different first blocks (a live batch of two sheets, 20 cards, a revoked batch and an expired batch of one sheet each), four accepted cards (Fixtures A, B, C, D) and eight refused opens covering `revoked`, `expired` and `accepted`. Tokens are random and thrown away; only the hashes are stored, so no seeded card can be redeemed. A card is found again by its batch and position, an attempt by its card, account and reason. The "live" batch expires 21 days after the first run.
- **Held-back accounts** (`sanctioned-users.ts`): Fixture H (`…000a`) has a site access pause with no end date, set by E; Fixture I (`…000b`) has sent one request and is timed out of support with no end date. Both are verified, have agreed to the terms and may create no coven. They are not fixtures A to G, since stories and specs sign in as those, and they run before the support seed, which needs I.
- **Support requests** (`support-requests.ts`): nineteen requests covering every state the screens show: open and unassigned, assigned to the admin (E) or curator (F), shared with the curators, linked to a GitHub issue (named by number and not checked against the repository), resolved, waiting on the sender, closed, and anonymised. E and F hold no card invitation, so they stand for senders who are not beta testers, and A to D for ones who are. Requests following the lifecycle (`src/modules/support/services/lifecycle.ts`) carry the times the service would set (`last_sender_activity_at`, `last_staff_activity_at`). Two are older than the twelve months a closed request keeps its words (`src/modules/support/services/retention.ts`): one already anonymised exactly as `anonymiseClosedSupportRequests` leaves a row, and one not yet, so the sweep a visit to `/keepers/support` starts anonymises it. A curator's reply is only ever on a request assigned to them. Time-outs in force, lifted, run out and lifted early are covered across B, C, D and I.

## The demo coven seed

`src/db/seed/demo-coven.ts` seeds the one demo coven: a workspace flagged `workspaces.demo`, and a seat in it for every account. It is the seventh reference seed, so it runs on every environment, after the compendium ([`auth.md`, "One demo coven on every environment"](../design-decisions/auth.md#one-demo-coven-on-every-environment)).

In one seed transaction, as the bootstrap system user:

1. **The workspace.** If no live row has `demo = true`, it inserts one with id `DEMO_WORKSPACE_ID`, name "Sorrel & Salt Demo" and the slug `slugify` makes of it, `sorrel-and-salt-demo`. If a row with that id exists but is soft-deleted, the seed stops quietly and writes nothing more.
2. **Owner seats** for `BOOTSTRAP_USER_ID` and every live `admin`.
3. **Viewer seats** for every other live user, `invited_by` null. A new account is seated as an observer at sign-up by `databaseHooks.user.create.after`; step 3 backfills any account that hook missed.

A seat is inserted only when no `workspace_members` row exists for the pair, a soft-deleted row counting as existing. This is the never-re-add rule: someone who used Leave stays out, and so does an ex-admin whose seat was removed, until another steward invites and promotes them. The seed never updates a row, so a second run inserts nothing.

**Slug refusal.** If a coven that is not the demo coven already holds the slug, the seed throws an error naming that coven and writes nothing; it does not take `-2`. A keeper renames one of the two and seeds again. The seed cannot reuse `freeSlug`, which lives in a `server-only` service.

### Contents

`seedDemoCovenContent(tx)` (`src/db/seed/demo-coven-content.ts`) runs right after the seats, from `seedDemoCoven`, `seedReferenceData` and `seedDemo`. Everything is authored or recorded by the system user, and written against the real compendium (the approved files under `compendium/`), never the `standard` fixtures; every compendium ingredient is named by its formal name and a form its file lists. It holds seven cupboard entries, one own entry (House Hearth Blend, form `blend`), six jars in grams, five spells (shared and private, complete and draft) and two workings, one complete deducting its four stocked layers and one draft. Each jar's form is the first form alphabetically, because a linked step lays that form.

Every ingredient in a spell carries a compendium category that matches one of the spell's assigned categories, bar the entries in `DEMO_COVEN_EXCEPTIONS`. There is one, lavender in the Prosperity Bowl, left in on purpose so the spell shows assigned categories narrower than its derived ones; the test fails on a third. Step text is plain instruction and claims nothing the compendium does not say.

An entry the environment's compendium lacks, or lacks a jar's form of, is skipped with the cupboard row, jars and spells that name it. The run prints one `SKIPPED <formal name>: <reason>` line for it and one for each spell dropped, and a missing entry never fails the run. `migrate.yml` and `seed-environment.yml` include `SKIPPED` lines in their seed summaries.

**Changing the contents.** The seed is additive: a row that exists is never updated, so a keeper's hand edit to a live row stands. A new row, or a change every environment should get, is a PR to `demo-coven-content.ts` that adds it; a change to a row already seeded does not reach environments that hold it.

### How a keeper gains and loses the seat

Making someone a keeper seats them as `owner` of the demo coven, in the same `withAudit` transaction as the role change, so if the role write fails no seat is written. This covers every keeper grant: `setUserRole`, the primary keeper's promotion, and an accepted admin invitation. No seat row is inserted as `owner`; a soft-deleted seat is revived as `owner` (unlike the seed, the grant does re-seat a pair that left); a `viewer` or `member` seat is promoted; with no demo coven nothing is written. Demoting a keeper sets their live seat back to `viewer`. Making or unmaking a curator changes no seat. The writer is `setSeatRole`, which takes no `Membership` proof, because a site-tier action has none.

### Three refusals

Each throws `Forbidden` with a message that explains it, and holds even when another steward exists, so the last-owner guard is not what stops them.

- `deleteWorkspace` refuses a workspace with `demo = true`: "The demo coven can't be deleted."
- `removeMember` and `updateMemberRole` refuse `BOOTSTRAP_USER_ID`: "The system user's seat can't be changed."

### Where it runs

- `npm run db:seed:demo-coven` runs it alone and takes `-- --dry-run` (the full run, rolled back). Against staging or production, start "Seed an environment" from the Actions tab.
- `seedReferenceData` runs it last, so `npm run db:seed:reference` and the hand-started `seed-environment.yml` include it. `migrate.yml` runs it after the compendium seed, and `deploy.yml`'s `seed-changed` path list names its file.
- `seedDemo` runs it after the curated compendium, so `npm run db:reset:demo` shows it. `standard` does not: fixture users A to G would gain a membership and shift every memberships test. A test that needs the demo coven seeds it itself, as `tests/db/seed/demo-coven.test.ts` does.
