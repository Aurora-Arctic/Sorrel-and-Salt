# Token efficiency — summary

How to keep a working session cheap and its context useful. The rules are the
"Spending tokens" section of [`CLAUDE.md`](../CLAUDE.md); this is their reason
and the recipes. Every token figure below is an estimate, not a measurement.

## Why a long session costs more per turn

A model keeps no memory between turns. Each turn sends the whole conversation
again: the instructions, every message, and every tool result so far. So the
cost of a turn grows with the length of the session, and a reply late in a long
session costs several times one near the start.

The prompt cache softens this. Text the model has already read, sent again in
the same order, is billed at a lower rate and read faster. It does not make the
text free, it does not shrink the context, and it expires after a short idle
spell, so a pause can bring the full price back. Keeping output short helps
more than any cache does.

## Why a test or build run stays in the context

Whatever a command prints is returned to the model as a tool result, and that
result stays in the conversation for every later turn. A green Vitest run once
printed ~12,000 lines of notices and warnings, tens of thousands of tokens
(an estimate), re-read on every turn after it. A passing run needs only its
verdict; a failure needs only the failing part.

A fresh subagent starts with its own instructions and the project's files read
anew, roughly 35–40k tokens of startup context each (an estimate). Brief it
once, with paths and what is ruled out, and send follow-on steps to the same
agent.

## The build-log recipe

Never pipe a build straight into `tail`: the pipe's exit status is `tail`'s,
which is always 0, so a failed build looks like a success. Write the output to a
file, print the real exit code, then read the end of the file:

```sh
npm run build > .reports/build.log 2>&1; echo "exit $?"; tail -n 40 .reports/build.log
```

On a failure, `grep -n error .reports/build.log` or `tail` further back reaches
the cause without the rest. `.reports/` is gitignored (`.gitignore` ignores
`.reports`), so a log there is never committed. In `zsh`, read a pipeline's
statuses from `pipestatus`, not `PIPESTATUS`.

Do not build into `.next/`, which the owner's dev server uses; give another
`NEXT_DIST_DIR`.

## Quiet reporters

Under Claude Code, Vitest prints dots, a coverage summary and only a failing
test's console output. `claude-docs/testing/where-tests-live.md`, "Quiet under
Claude Code (MB.142)", has the behaviour and `env -u CLAUDECODE`, which turns
it off when a test's console output is the thing being read. Playwright's
equivalent arrives with M12.37, in a separate PR; until it merges, redirect a
Playwright run to a log as above.

## When a full suite is worth running

Run one spec at a time while working: it is fast and its output is small. Run
the full coverage, stories and e2e suites only when the owner says so, because
the 80% threshold and cross-file breakage only show there. Saving tokens never
justifies a thinner test.

## At a task boundary

A new task needs none of the last one's tool output. The owner can type
`/clear` between tasks and `/compact` at a change of phase; an agent cannot, so
it suggests them.
