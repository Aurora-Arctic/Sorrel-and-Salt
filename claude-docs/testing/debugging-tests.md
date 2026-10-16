## Debugging tests (MB.22)

`npm run test:debug` runs Vitest single-worker under `--inspect-brk`, halted
on 9230 until a debugger attaches — single-worker specifically, so the
breakpoint lands inside a known `sorrel_test_${VITEST_POOL_ID}` clone rather
than an arbitrary one. `npm run test:ui` opens `@vitest/ui`. For Playwright,
`npm run e2e:ui` and `npm run e2e:trace` cover interactive and
recorded-run debugging respectively, and a local (non-CI) run captures a
trace and a screenshot on failure by default, never a video (M11.18) — see
`playwright.config.ts`'s comments. Running `npm run e2e` from inside the devcontainer at all needs a
remote browser (MB.22), and `PLAYWRIGHT_WS_ENDPOINT` — the variable that
selects it — is scoped to the `devcontainer` compose service alone, so
`make docker-e2e` and CI keep launching Chromium locally. That mechanism,
its trade-offs, and the full setup including VS Code attach configs:
`claude-docs/debugging.md`.

React's "not wrapped in act(...)" warning means a test asserted before an update it caused had landed (M11.24). Under Claude Code Vitest hides a passing test's output, so run `env -u CLAUDECODE npx vitest run --project dom` to see them. The fix is to wait for that update and assert the same state: an action that sends a request is pressed inside `await act(async () => …)`, a native `.focus()` or `.click()` goes through `act` or `fireEvent`, and `waitFor` in `tests/support/ingredient-form.tsx` settles first. Never set `IS_REACT_ACT_ENVIRONMENT` or silence the warning.
