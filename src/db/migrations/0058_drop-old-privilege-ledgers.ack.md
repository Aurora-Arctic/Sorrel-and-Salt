# 0058_drop-old-privilege-ledgers — destructive DDL

Destructive DDL acknowledged: this is the contract step of an expand/contract drop. MB.194 copied both one-privilege ledgers, `admin_role_changes` and `workspace_creation_changes`, into `user_privilege_changes` with their ids and stamps (0055), MB.195's trigger on `users` has written the new ledger since, and MB.196 stopped declaring the old ones, so no staging deploy that meets this migration reads or writes either. The migration sweeps both into `user_privilege_changes` once more before it drops them and their enums.

## Findings this covers

| Rule              | Statement                                         |
| ----------------- | ------------------------------------------------- |
| DROP (any object) | `DROP TABLE "admin_role_changes" CASCADE`         |
| DROP (any object) | `DROP TABLE "workspace_creation_changes" CASCADE` |
| DROP (any object) | `DROP TYPE "public"."admin_role_change"`          |
| DROP (any object) | `DROP TYPE "public"."workspace_creation_change"`  |

The `INSERT` before them is not a finding. `CASCADE` reaches nothing: no view, foreign key or other table depends on either ledger, and each enum is used by its own table alone.

## Why no deploy breaks

Drizzle names every declared table it queries, and `migrate.yml` runs before `deploy.yml` promotes, so the risk in a table drop is the deploy still serving while the migration runs. On staging that deploy is MB.196's or later, and none of them declares either table: MB.196 removed their schema files, and no file under `src/` names them outside migrations 0043, 0054 and 0055, which made and copied them, and this one.

Production does not hold the same way, and that is the owner's call rather than an oversight. Its deploy still declares `admin_role_changes`, and no release has carried MB.196, so the release that carries this migration carries MB.196 with it and drops the table under that deploy for the length of the rollout: its admin-ledger reads and writes fail between `migrate.yml` and the promotion. MB.197's entry asked for a release carrying MB.196 to reach production first for exactly this reason, and was amended on 2026-10-10: production is not live, so no member is reading or writing under that deploy, and the window costs nothing, as MB.168 argued for `ingredients.deities` (`0048_drop-deities-list.ack.md`).

## What is lost

Nothing. Every row of both ledgers is in `user_privilege_changes` before the drop: 0055 copied them as they stood, and this migration copies whatever the deploy before MB.196 wrote after that, by the same mapping, skipping with `ON CONFLICT ("id") DO NOTHING` the rows 0055 already landed. `user_privilege_changes` is append-only, so a copied row cannot have been edited since and the skip loses no newer value. A rollback to a deploy that predates MB.196 would find the tables gone, which CLAUDE.md rule 10's forward-only migrations already rule out: the way back is a forward fix.
