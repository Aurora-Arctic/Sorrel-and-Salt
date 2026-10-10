# 0059_drop-old-invitation-tables — destructive DDL

Destructive DDL acknowledged: this is the contract step of an expand/contract drop. MB.201 copied `workspace_invitations` and `admin_invitations` into the two-tier `invitations` table with their ids and stamps (0057), and MB.202 moved every reader and writer to it and stopped declaring the old tables, so no staging deploy that meets this migration reads or writes either. The migration sweeps both into `invitations` once more before it drops them.

## Findings this covers

| Rule              | Statement                                    |
| ----------------- | -------------------------------------------- |
| DROP (any object) | `DROP TABLE "workspace_invitations" CASCADE` |
| DROP (any object) | `DROP TABLE "admin_invitations" CASCADE`     |

The `INSERT` before them is not a finding. `CASCADE` reaches nothing beyond each table's own constraints, index and trigger: no view or foreign key depends on either. No enum is dropped: `workspace_role`, which `workspace_invitations.role` held, is held by `workspace_members.role` and `invitations.role` as well.

## Why no deploy breaks

Drizzle names every declared table it queries, and `migrate.yml` runs before `deploy.yml` promotes, so the risk in a table drop is the deploy still serving while the migration runs. On staging that deploy is MB.202's or later, and none of them declares either table: MB.202 removed their schema files, and no file under `src/` names them outside migrations 0012 and 0046, which made them, 0016, which gave `workspace_invitations` its trigger, 0057, which copied them, and this one.

Production does not hold the same way, and that is the owner's call rather than an oversight. v0.6.0, the latest release, still declares both tables, and no release has carried MB.202, so the release that carries this migration carries MB.202 with it and drops the tables under that deploy for the length of the rollout: its invitation reads and writes fail between `migrate.yml` and the promotion. MB.203's entry asked for a release carrying MB.202 to reach production first for exactly this reason, and was amended on 2026-10-10: production is not live, so nobody is inviting or accepting under that deploy, and the window costs nothing, as MB.168 argued for `ingredients.deities` (`0048_drop-deities-list.ack.md`).

## What is lost

No invitation. Every row of both tables is in `invitations` before the drop: 0057 copied them as they stood, and this migration copies whatever the deploy before MB.202 inserted after that, by the same mapping, skipping with `ON CONFLICT ("id") DO NOTHING` the rows 0057 already landed. What the skip can lose is a later change to a row already copied, an accept or a revoke the old deploy wrote mid-rollout: the copy keeps its earlier state rather than overwrite whatever MB.202's code has since written to it. Production holds no row in either table, so that window is staging's alone. A rollback to a deploy that predates MB.202 would find the tables gone, which CLAUDE.md rule 10's forward-only migrations already rule out: the way back is a forward fix.
