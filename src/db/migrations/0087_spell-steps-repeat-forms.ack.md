# 0087_spell-steps-repeat-forms — destructive DDL

Destructive DDL acknowledged: a spell may hold the same variant in several steps (owner, 2026-10-28)

## Findings this covers

| Rule              | Statement                                             |
| ----------------- | ----------------------------------------------------- |
| DROP (any object) | `DROP INDEX "spell_steps_spell_id_variant_id_unique"` |

## Why it is one PR

Rule 10 asks two PRs for an index drop; the owner chose one for this (`.claude/rules/database.md`, "Rule 10"). No query names the index, and none uses it in an `ON CONFLICT`, so the deploy before this one runs unchanged against a database without it. The index only ever refused a row.

## The rollout window

The deploy before this one still refuses a repeated form in its own validation, so nothing writes one until the new deploy is live.

## What is lost

Nothing. The index held no data; it refused repeats.
