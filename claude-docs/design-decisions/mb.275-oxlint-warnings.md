# Oxlint rules that are errors

**Status:** decided. Live home: `claude-docs/commands.md`, "Oxlint" paragraph (the error and warning split, with a reason for each).

## Decision

- **Selected rules are `"error"` in `.oxlintrc.json`**, so CI and pre-commit refuse a new hit. Every other rule stays a warning, and there is no blanket `--deny-warnings`.
- **Errors:** `no-unused-vars`, `no-console` (the `scripts/**` override is extended to `.design-sync/**` and `.github/scripts/**`), `no-unsafe-optional-chaining`, `react-hooks/exhaustive-deps`, `react/set-state-in-effect`, the jsx-a11y interaction rules (`click-events-have-key-events`, `no-static-element-interactions`, `no-noninteractive-element-interactions`, `interactive-supports-focus`, `no-noninteractive-tabindex`) and the jsx-a11y label and anchor rules (`control-has-associated-label`, `anchor-is-valid`).
- **Warnings:** `react/refs`, `react/immutability`, `jsx-a11y/prefer-tag-over-role`, and `jsx-a11y/aria-role` with `ignoreNonDOM: true`. The React Compiler rules (`react/globals`, `react/preserve-manual-memoization`, `react/incompatible-library`) warn in `src/` and are off in the `tests/**` override with `react/refs` and `react/immutability`.
- **A rule made an error must also hold in the `tests/**`, `.storybook` and `scripts/**` overrides**, unless an override turns it off on purpose.

## Why

A rule that only warns is enforced by nothing. The advisory rules are the ones the compiler being off makes noisy.

## Rules out

- `--deny-warnings` across the board.
