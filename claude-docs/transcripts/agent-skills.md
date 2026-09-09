# Agent skills — transcript

Append-only. Newest entry at the bottom. Summary:
[`../agent-skills.md`](../agent-skills.md).

## 2026-09-08 — M0.10 · port the Gitflow skills from resume-2026

- Reviewed `resume-2026/.claude/skills/`. It holds **six** skills, all Gitflow
  branch/PR workflow: `create-feature`, `create-hotfix`, `create-main-sync`,
  `create-pr` (+ `reference-hotfix.md`), `create-release`, `prune-branches`.
  None are Gatsby-specific, so all six ported and nothing was left behind on
  toolchain grounds.
- The M0.10 breakdown named "testing conventions, component documentation,
  commit and PR conventions, CI debugging" as things to port. Only the last is a
  skill — the other three are `claude-docs/` prose in `resume-2026`, not skills,
  and this repo already carries the equivalents in `CLAUDE.md` (Testing) and
  `claude-docs/`. Recorded that in [`../agent-skills.md`](../agent-skills.md)
  rather than creating empty skill directories.
- Adjustments on the way in: skills now cite `CLAUDE.md`'s Gitflow convention as
  the source of truth (the enforcing `gitflow` CI check lands with M0.17/M0.20);
  `.claude/settings.json` created with the `permissions.ask` entries the skills
  reference; `create-pr`'s test-plan guidance repointed at this repo's check
  surface; `prune-branches` protects `staging` instead of `develop`.
- `CLAUDE.md`'s Skills section rewritten from the placeholder to the trigger
  table.
