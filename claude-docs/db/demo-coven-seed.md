# The demo coven seed

`src/db/seed/demo-coven.ts` seeds the one demo coven: a workspace flagged
`workspaces.demo`, and a seat in it for every account. It is the seventh
reference seed, so it runs on every environment, after the compendium. The
decisions behind it are in
[`m15.9-demo-coven.md`](../design-decisions/m15.9-demo-coven.md).

## What it writes

In one seed transaction, as the bootstrap system user:

1. **The workspace.** If no live row has `demo = true`, it inserts one with id
   `DEMO_WORKSPACE_ID`, name "Sorrel & Salt Demo" and the slug `slugify` makes
   of the name, `sorrel-and-salt-demo`. If a row with that id exists but is
   soft-deleted, the seed stops quietly and writes nothing more.
2. **Owner seats** for `BOOTSTRAP_USER_ID` and for every live user whose role
   is `admin`.
3. **Viewer seats** for every other live user. `invited_by` is null.

A seat is inserted only when no `workspace_members` row exists for the pair
(demo coven, user). A soft-deleted row counts as existing. This is the
never-re-add rule: someone who used Leave stays out, and so does an ex-admin
whose seat was removed, until another owner invites and promotes them. The seed
never updates a row, so a second run inserts nothing.

A new account is seated as a viewer at sign-up by
`databaseHooks.user.create.after`; the seed's step 3 backfills any account that
hook missed.

The contents are written by `src/db/seed/demo-coven-content.ts`, described under "Contents" below.

## Contents

`seedDemoCovenContent(tx)` runs right after the seats, from `seedDemoCoven`, `seedReferenceData` and `seedDemo`. Everything is authored or recorded by the system user. It is written against the real compendium (the approved files under `compendium/`), never the `standard` fixtures, and every compendium ingredient is named by its formal name and a form its file lists.

- **Cupboard:** seven compendium entries: Bay Laurel, Salt, Lavender, Basil, Cinnamon, German Chamomile and Hyssop.
- **Own entry:** House Hearth Blend (invented, form `blend`).
- **Jars:** six, in grams: Salt, Bay Laurel (Leaf), Hyssop (Herb), Lavender (Flower), Basil (Leaf) and the House Hearth Blend. Cinnamon and German Chamomile have no jar. Each jar's form is the first form alphabetically, because a linked step lays that form.
- **Spells:** Doorway Protection Jar and Cleansing Salt Bowl (complete, shared with the coven), Prosperity Bowl (complete, private), Sleep Sachet (draft, private), Peace for the Table (draft, shared).
- **Workings:** a complete one on the Doorway Protection Jar that deducts its four stocked layers from the jars, and a draft on the Cleansing Salt Bowl.

Every ingredient in a spell carries a compendium category that matches one of the spell's assigned categories, bar the entries in `DEMO_COVEN_EXCEPTIONS`. There is one: lavender in the Prosperity Bowl, left in on purpose so the spell shows assigned categories narrower than its derived ones. The test fails on a third. Step text is plain instruction and claims nothing the compendium does not say.

An entry the environment's compendium lacks, or lacks a jar's form of, is skipped with the cupboard row, jars and spells that name it, and the run prints one `SKIPPED <formal name>: <reason>` line for it and one for each spell dropped. A missing entry never fails the run. migrate.yml and seed-environment.yml include `SKIPPED` lines in their seed summaries.

### Changing the contents

The seed is additive: a row that exists is never updated, so an admin's hand edit to a live row stands, and an admin edits the live rows by hand. A new row, or a change every environment should get, is a PR to `demo-coven-content.ts` that adds it; a change to a row already seeded does not reach environments that hold it.

## How an admin gains and loses the seat

Making someone an admin seats them as `owner` of the demo coven, in the same
`withAudit` transaction as the role change. If the role write fails, no seat is
written. This covers every admin grant: `setUserRole`, the primary admin's
promotion, and an accepted admin invitation.

- No seat row: it is inserted as `owner`.
- A soft-deleted seat: it is revived as `owner`. Unlike the seed, the grant
  does re-seat a pair that left.
- A `viewer` or `member` seat: it is promoted to `owner`.
- No demo coven: nothing is written.

Demoting an admin sets their live seat back to `viewer`. Making or unmaking a
curator changes no seat. The writer for the role change is `setSeatRole`, a
write that takes no `Membership` proof, because a site-tier action has none.

## Three refusals

Each throws `Forbidden` with a message that explains it.

- `deleteWorkspace` refuses a workspace with `demo = true`: "The demo coven
  can't be deleted."
- `removeMember` refuses `BOOTSTRAP_USER_ID`: "The system user's seat can't be
  changed."
- `updateMemberRole` refuses `BOOTSTRAP_USER_ID` with the same message.

These hold even when another owner exists, so the last-owner guard is not what
stops them.

## The slug refusal

If a coven that is not the demo coven already holds the slug, the seed throws an
error naming that coven and writes nothing. It does not take `-2`. An admin
renames one of the two and seeds again. The seed cannot reuse `freeSlug`
because that lives in a `server-only` service.

## Where it runs

- `npm run db:seed:demo-coven` runs it alone, and takes `--dry-run`.
- `seedReferenceData` runs it last, so `npm run db:seed:reference` and the
  hand-started `seed-environment.yml` include it.
- `migrate.yml` runs it after the compendium seed. `deploy.yml`'s
  `seed-changed` path list names its file.
- `seedDemo` runs it after the curated compendium, so `npm run db:reset:demo`
  shows it. The `standard` scenario does not: fixture users A to G would gain a
  membership and shift every memberships test. A test that needs the demo coven
  seeds it itself, as `tests/db/seed/demo-coven.test.ts` does.

## Running it by hand

Against a local database: `npm run db:seed:demo-coven`. Add `-- --dry-run` to
run it in full and roll back. Against staging or production, start "Seed an
environment" from the Actions tab.
