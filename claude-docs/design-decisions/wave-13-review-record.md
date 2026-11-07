# Wave 13 review: workings, editing and deleting spells

**Status:** decided. Live home: `claude-docs/design/` (spell and working sections) and `src/modules/grimoire/`.

## Decision

- **Story numbers 65–69 are taken** by earlier bug-report and sign-in tasks, and stories 67 and 68 had no text anywhere. The grimoire workings stories are renumbered to 76–80 (record a working, step units, complete and deduct, workings on the recipe page and the count, steps). Each owning task writes its story's one-line text, the `story-sections.ts` row (`'Coven - Spells - Workings'`) and the count statements in `CLAUDE.md`, `claude-docs/testing/acceptance.md` and `claude-docs/ci/reusable-checks.md`. `tests/guards/story-sections.test.ts` fails on an unmapped story.
- **Editing a saved spell is its own task**: `/coven/[slug]/grimoire/[id]/edit` reusing the spell builder, an Edit control on the recipe page for practitioners and stewards and never observers, and `updateSpell` in the data-access list. (A complete spell is later refused by `updateSpell` and edited through a draft copy: `CLAUDE.md`, "Domain invariants".)
- **Deleting a spell is its own task**: a service under `spell: ['delete']`, a soft delete that carries the spell's steps and workings with it, a mutation, and a Delete control on the recipe page that follows the existing destructive pattern (`.btn--destructive`, `ConfirmQuestion`).
- **A working pins the revision it was made from**, so an existing working keeps its record and deductions. No new working can be recorded until the spell is complete, with an explaining error.
- **The working permission is its own statement.** `access-control.ts` gains `working` (`read create update delete` for practitioner and steward, `read` for observer), so observers write nothing and the check reads as what it is.

## Why

A permission is a per-role statement, never a rank. Reusing `spell: ['update']` for recording a working would read as editing the recipe, which a working is not. Folding delete into the edit task would break one task per PR.

## Rules out

- Reusing `spell: ['update']` for workings.
- Refusing a reopen merely because a working exists.
- Moving the bug-report and sign-in stories instead of renumbering the new ones.
