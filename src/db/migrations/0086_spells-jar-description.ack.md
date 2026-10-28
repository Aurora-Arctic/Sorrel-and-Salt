# 0086_spells-jar-description — destructive DDL

Destructive DDL acknowledged: rename jar_size to jar_description, the owner's call on 2026-10-27; no screen has written the column yet, M10.12 is the first

## Findings this covers

| Rule                     | Statement                                                            |
| ------------------------ | -------------------------------------------------------------------- |
| RENAME (column or table) | `ALTER TABLE "spells" RENAME COLUMN "jar_size" TO "jar_description"` |

## Why it is one PR

Rule 10 asks two PRs for a column or index drop; a rename is destructive DDL that needs this sidecar, and the owner chose one PR for it (`.claude/rules/database.md`, "Rule 10"). The field is the spell builder's Jar Description, which M10.12 adds, and no screen before it wrote the column.

## The rollout window

`migrate.yml` runs before `deploy.yml` promotes, so the deploy before this one meets the renamed column until the new one is live, and again after any rollback to it. That deploy's spell finders and spell mutations name `jar_size`, so a spell read or write through `/api/graphql` fails in that window. No screen of that deploy reads or writes a spell, so no page breaks; only a direct GraphQL call would.

## What is lost

Nothing. Every row keeps its value under the new name.
