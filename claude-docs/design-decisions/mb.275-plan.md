# Plan: clear the 142 oxlint warnings and stop new ones landing

## Context

CI run 40927631845 (PR #1321, M13.18) passed lint but carried warnings. GitHub shows only the first 10 as annotations. The full count is **142 warnings, 0 errors, across 73 files**. I reproduced it locally with oxlint 1.89.0, the version CI runs.

**None of the 142 are in a file M13.18 changed.** They all come from staging. They build up because `oxlint .` exits 0 on warnings, so nothing stops them.

This is not M13.18 work and is not a sub-hour fix. Under the one-task-per-PR rule it gets its own task and its own branch off staging. M13.18's PR stays as it is.

The full list is in `/app/.reports/oxlint-189.log`.

## Breakdown and treatment

| Rule                                                                                                                         | Count | Treatment                                                                                                                                                                                                                                                                                                                                                       |
| ---------------------------------------------------------------------------------------------------------------------------- | ----- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `eslint(no-unused-vars)`                                                                                                     | 33    | Delete the unused imports and bindings. Mechanical: try `oxlint --fix` first, then do the rest by hand.                                                                                                                                                                                                                                                         |
| `eslint(no-console)`                                                                                                         | 17    | 16 are deliberate CLI output: 13 in `.design-sync/overrides/source-storybook.mjs` and 3 in `.github/scripts/merge-playwright-coverage.mjs`. Add both paths to the existing `scripts/**` override in `.oxlintrc.json` (node env, `no-console: off`). The 17th is `tests/support/db/bounded-postgres.ts:27`, a deliberate diagnostic: line disable with a reason. |
| React rules: `refs`, `immutability`, `set-state-in-effect`, `globals`, `preserve-manual-memoization`, `incompatible-library` | 54    | These are mostly React Compiler advisories. The compiler is off in `next.config.ts`. Fix the real ones (list below) and silence the rest with a reason.                                                                                                                                                                                                         |
| `react-hooks(exhaustive-deps)`                                                                                               | 5     | Fix all five (list below).                                                                                                                                                                                                                                                                                                                                      |
| `jsx-a11y(*)`                                                                                                                | 32    | Mostly intended: `role="group"`, `role="status"` on block content, `role=` props on app components in stories. Fix three, silence the rest with a reason.                                                                                                                                                                                                       |
| `eslint(no-unsafe-optional-chaining)`                                                                                        | 1     | Fix.                                                                                                                                                                                                                                                                                                                                                            |

### Real fixes (code changes)

1. **Curried handlers called during render.** In `src/components/IngredientEntry/annotate-more.tsx` (6 hits) and `src/components/IngredientEntry/cupboard-actions.tsx:308,312`, `ask('own')` runs during render. Change it to `() => ask('own')`.
2. **State set inside an effect when it can be derived during render.** Applies to `cupboard-actions.tsx:211` and `src/components/CompendiumCards/card-more.tsx:83`. Replace each effect with `if (…) setAsking(undefined)` during render.
3. `src/lib/navigation/use-navigation.ts:67`: change the `owner` ref to `useState(() => Symbol('navigation'))[0]`.
4. `src/components/SkeletonFade/index.tsx:33`: keep the last skeleton in state, using the existing `wasShown` adjust-during-render pattern.
5. `src/components/SpellBuilder/jar-details.tsx:45`: hoist a module-level empty-array fallback.
6. `src/components/StockDialog/index.tsx:278`: compute the index during render and depend on it.
7. `src/components/SpellBuilder/steps/index.tsx:63,91,126`: if `keys` is derived from `fields`, wrap it in `useMemo([fields])` and depend on `keys`.
8. `src/components/IngredientForm/delete-users.tsx:30`: change `<p role="status">` to `<output>`, after checking the CSS, because `<output>` is inline.
9. `src/components/MenuButton/index.tsx:287`: add `tabIndex={-1}` to `role="menu"`.
10. `tests/app/(shell)/admin/compendium/page.test.tsx:123`: replace the unsafe optional chain with `?.entry`.
11. `.storybook/navigation-bar.stories.tsx:90` and `tests/lib/navigation/pending-navigation.test.tsx:224`: change `<p role="status">` to `<output>`. Both still match `getByRole('status')`.

### Config-level silencing in `.oxlintrc.json`

- In the `tests/**` override, turn off `react/globals`, `react/immutability`, `react/refs` and `react/incompatible-library`. That clears 11 hits. Test harnesses pass state out of components on purpose.
- Set `jsx-a11y/aria-role` to `ignoreNonDOM: true`. That clears 5 hits where stories pass `role="owner"` as a prop to app components.

### Per-site silencing

Each site gets a line disable with a reason, worded the way `src/components/CategoryChips/category-more.tsx:158` already words its own:

- **Callback refs from `useTip`, floating-ui and `anchorRef` (11 sites).** Destructure the setter where that clears the warning. Disable the rest.
- **The two `sortable.tsx` files.** One file-level disable each: dnd-kit callbacks write refs after render.
- **The remaining intended patterns:**
  - `pointer-held.ts`, `edited-fields.ts`, `use-autosave.ts:293` and `modal.tsx:390`: deliberate ref reads during render.
  - `use-form-history.ts`: `preserve-manual-memoization` and the DOM dataset write.
  - `summary-description.tsx`: the hydration gate.
  - `navigation-bar.tsx:28`: the timer state machine.
  - `StockDialog:277`: the focus reset.
  - `ListFrame:55`: the held-height reset. If moving the reset into render works, do that instead.
  - The `role="group"` sites in `MenuButton`, `jar-details`, `picker` and `references`.
  - The `role="status"` sites that wrap block content: `copy.tsx`, `duplicates.tsx` and `Notice/index.test.tsx`.
  - `reference-panel.tsx`: `role="list"` inside phrasing content.
  - `StockDialog:90`: a glyph given `role="img"`.
  - The `IconTip`, `StepRow` and `step-row.tsx` click wrappers.
  - The menu separator.
  - `modal.tsx:384`: `tabIndex` on a scrolling body.
  - `emails/parts/layout.tsx:128`: an `<a>` with no `href`, for Zoho Night mode.

### Which rules become errors (owner's decision, 2026-10-29)

Every one of the 142 warnings is cleared in this task. After that, `.oxlintrc.json` makes the rules below `"error"`, so CI and pre-commit refuse a new hit. Every other rule stays a warning. There is no blanket `--deny-warnings`.

- **Error:**
  - `no-unused-vars`
  - `no-console`, with the existing `scripts/**` override extended to `.design-sync/**` and `.github/scripts/**`
  - `no-unsafe-optional-chaining`
  - `react-hooks/exhaustive-deps`
  - `react/set-state-in-effect`
  - jsx-a11y interaction rules: `click-events-have-key-events`, `no-static-element-interactions`, `no-noninteractive-element-interactions`, `interactive-supports-focus`, `no-noninteractive-tabindex`
  - jsx-a11y labels and anchors: `control-has-associated-label`, `anchor-is-valid`
- **Stay warnings:**
  - `react/refs`
  - `react/immutability`
  - `jsx-a11y/prefer-tag-over-role`
  - `jsx-a11y/aria-role`, set to `ignoreNonDOM: true`
- **React Compiler rules** (`react/globals`, `react/preserve-manual-memoization`, `react/incompatible-library`): warnings in `src/`, and off in the `tests/**` override along with `react/refs` and `react/immutability`.

Rules made errors must also hold in the `tests/**`, `.storybook` and `scripts/**` overrides, unless an override turns them off on purpose. Check each override after the edit.

Record the error-versus-warning split and the reason for each in `claude-docs/`, in commands.md or the lint doc it points to.

## Tracking and branch

1. Mint a bug task via `/create-bug-task` (owner's choice): Bugfixes milestone, next free MB id, checked against the board and TASKS.md.
2. Branch `feature/<slug>` off the latest staging, in a worktree.
3. Set the task to In Progress.
4. Give the work to one Sonnet agent in that worktree. The brief names this plan, the log path, and the rule that every disable carries a reason.
5. Commit in three steps, each after `npm run pre-commit`:
   - mechanical (unused-vars, console, config);
   - real fixes;
   - silencing plus the error promotions in `.oxlintrc.json`.

## Verification

- `npm run lint` exits 0 and prints 0 warnings.
- A deliberately added unused import must make lint fail. Check that once, then revert it.
- `npm run typecheck`.
- `npm run test:coverage`, because behaviour changed in `cupboard-actions`, `card-more`, `SkeletonFade`, `StockDialog`, the SpellBuilder steps and `use-navigation`.
- Run the e2e specs that cover the touched components (ingredient entry cupboard actions, stock dialog, spell builder steps), one run each. Set `E2E_PORT_BASE` away from 8000 and 8001.
- Run `npm run build` with a separate `NEXT_DIST_DIR`, never into `.next`.
