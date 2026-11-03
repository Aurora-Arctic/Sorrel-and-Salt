# 0133_drop-terms-version — destructive DDL

Destructive DDL acknowledged: this is the contract step of moving the terms an account agreed to from the date string `users.terms_version` to the number `users.agreed_terms_version` (M15.72). `0129` added the number, `0130` filled it from the date, and PR #1502 moved every reader and writer onto it, so no deploy that meets this migration reads or writes the old column.

## Findings this covers

| Rule              | Statement                                         |
| ----------------- | ------------------------------------------------- |
| DROP (any object) | `ALTER TABLE "users" DROP COLUMN "terms_version"` |

## Why no deploy breaks

`migrate.yml` runs before `deploy.yml` promotes, so the risk in a drop is the deploy still serving while the migration runs. This task merges into `staging` only after a release carrying PR #1502 has reached production (its task entry, and `claude-docs/db/expand-contract.md`), so on staging and on production that deploy is #1502's or later. #1502 removed the column from the Drizzle schema, which names every declared column in a `SELECT`, and no file under `src/` outside migrations names it. The tests named the column in `PENDING_DROPS` until now, and that list is empty here.

## What is lost

Nothing a reader still sees. `0130` copied the date to the number, as version 1, on every account that agreed to the terms dated 2026-11-02, and every agreement since is written to `agreed_terms_version` alone. The date string itself is dropped with the column; `terms_accepted_at` keeps when each account agreed.
