# clear the 142 oxlint warnings and stop new ones landing

**Status:** decided and built. Only the decisions, the reasons and what they rule out are kept here.

## Which rules become errors (owner's decision, 2026-10-29)

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
