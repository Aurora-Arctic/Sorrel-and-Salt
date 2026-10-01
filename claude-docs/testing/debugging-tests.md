## Debugging tests (MB.22)

`npm run test:debug` runs Vitest single-worker under `--inspect-brk`, halted
on 9230 until a debugger attaches — single-worker specifically, so the
breakpoint lands inside a known `sorrel_test_${VITEST_POOL_ID}` clone rather
than an arbitrary one. `npm run test:ui` opens `@vitest/ui`. For Playwright,
`npm run e2e:ui` and `npm run e2e:trace` cover interactive and
recorded-run debugging respectively, and a local (non-CI) run now captures a
trace/screenshot/video on failure by default — see `playwright.config.ts`'s
comments. Running `npm run e2e` from inside the devcontainer at all needs a
remote browser (MB.22), and `PLAYWRIGHT_WS_ENDPOINT` — the variable that
selects it — is scoped to the `devcontainer` compose service alone, so
`make docker-e2e` and CI keep launching Chromium locally. That mechanism,
its trade-offs, and the full setup including VS Code attach configs:
`claude-docs/debugging.md`.
