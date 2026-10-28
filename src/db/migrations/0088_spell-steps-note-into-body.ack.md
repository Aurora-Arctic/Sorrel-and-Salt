# 0088_spell-steps-note-into-body — destructive DDL

Destructive DDL acknowledged: the amount CHECK is rewritten without `note`, because the step note is retired (owner, 2026-10-28)

## Findings this covers

| Rule              | Statement                                                                                           |
| ----------------- | --------------------------------------------------------------------------------------------------- |
| DROP (any object) | `DROP CONSTRAINT "spell_steps_amount_on_ingredient"`, re-added in the same migration without `note` |

## Why it is one PR

The CHECK is dropped and added back in the same migration, so there is no moment without it. The column `note` is not dropped here: M13.9 drops it, per rule 10 (`claude-docs/design-decisions/pr1308-step-note-retired.md`).

## The rollout window

The deploy before this one writes a note only on a step with an ingredient or a name, which the narrower CHECK allows too. The migration copies each live note into `body` and leaves the note in place.

## What is lost

Nothing. The CHECK only stops being a rule about `note`.
