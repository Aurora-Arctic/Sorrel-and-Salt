# 0034_drop-ingredient-singles — destructive DDL

Destructive DDL acknowledged: this is the contract step of an expand/contract drop. MB.135 added `planets`, `zodiac_signs` and `colors` beside the single `planet`, `zodiac` and `color` columns and filled them (0030), MB.136 moved every reader and writer to the lists, stopped declaring the singles and filled the lists again (0031), and this migration drops the singles once no deploy that meets it declares them.

## Findings this covers

| Rule              | Statement                                        |
| ----------------- | ------------------------------------------------ |
| DROP (any object) | `ALTER TABLE "ingredients" DROP COLUMN "planet"` |
| DROP (any object) | `ALTER TABLE "ingredients" DROP COLUMN "zodiac"` |
| DROP (any object) | `ALTER TABLE "ingredients" DROP COLUMN "color"`  |

Nothing else is in the migration. `substitutes`, which MB.140 stopped declaring, stays in the table and in the snapshot: its drop is MB.141's.

## Why no deploy breaks

Drizzle names every declared column in a `SELECT`, and `migrate.yml` runs before `deploy.yml` promotes, so the risk in a column drop is the deploy still serving while the migration runs. On staging that deploy is MB.136's or later, and none of them declares the singles: MB.136 removed them from `src/modules/ingredients/schema/ingredients.ts`, and no file under `src/` names them outside migrations 0030 and 0031.

Production is different. v0.4.0 stops at migration 0029, and its deploy still declares all three. A release carrying both MB.136 and this migration would drop the columns while v0.4.0 is serving, so its ingredient reads would fail until the promotion finished, and a rollback to v0.4.0 would fail for good. **This migration therefore merges into `staging` only after a release carrying MB.136 has reached production.** That release runs 0030 and 0031, and the release after it runs this migration against an MB.136 deploy, just as staging does.

## What is lost

Nothing the app still reads. Between a release's migrations and its promotion, the previous deploy kept writing to the singles: on staging, between 0031 and MB.136's promotion; on production, between 0030–0031 and the promotion of the release carrying them. A single written in that window never reached a list, and has been invisible since MB.136 went live. The drop removes it, and does not fill the lists one last time first. MB.136's deploy writes the lists, so a single that disagrees with its list could hold either the old deploy's newer write or the stale value of a list a member has since edited, and the row's contents cannot tell those apart. A fill would overwrite that member's edit to recover a write from a deploy-length window (claude-docs/db/identity-model.md, "The ingredient identity model"). A rollback to a deploy before MB.136 would find the columns gone, which CLAUDE.md rule 10's forward-only migrations already rule out: the way back is a forward fix.
