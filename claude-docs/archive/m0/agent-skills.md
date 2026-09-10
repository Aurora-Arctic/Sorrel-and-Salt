# Archived from claude-docs/agent-skills.md — end of M0 (M0.34)

Text the M0.34 compression pass removed from
[`../../agent-skills.md`](../../agent-skills.md).

---

## 1. The skill count

```
Six Gitflow branch/PR skills, ported from `resume-2026` in M0.10:
```

```
These implement the Gitflow lane described in `CLAUDE.md` → Conventions:
```

Accurate about the M0.10 port — six skills were ported, and those six are the
Gitflow lane. But `start-task` was written for this repo afterwards and appears
in `CLAUDE.md`'s Skills table and in `.claude/skills/`, while this page (under
a heading reading "What is here") listed only six. A reader would conclude
there are six skills. The live text now says seven, marks `start-task` as not a
port, and narrows the Gitflow-lane sentence to "the first six".

## 2. The gitflow-check hedge

```
- **The `gitflow` CI check does not exist yet.** It arrives with M0.17/M0.20
  (`.github/workflows/gitflow.yml`). Until then the skills name `CLAUDE.md`'s
  Gitflow convention as the source of truth for branch-source rules, and say so.
```

Wrong milestone and wrong tense. `.github/workflows/gitflow.yml` landed in
**M0.22** — see `m0.22-gitflow-rulesets.md` and `../../ci.md` — not M0.17/M0.20.
Reworded to the past tense about the state at port time.

## 3. The "when it lands" section

```
## When the CI workflow lands

M0.17/M0.20 add `.github/workflows/gitflow.yml`. When it does, that file becomes
the source of truth for the branch-source table, and the "until then" hedges in
`create-pr`, `create-release`, `create-main-sync` and `create-pr/reference-hotfix.md`
should be tightened to point at it.
```

The heading described a future event that has happened. Retitled to "Hedges
still to tighten", because the _hedges themselves_ really are still there — the
skill files continue to name "M0.17/M0.20" and `create-pr` still warns that the
repo is "pre-scaffold":

- `create-pr/SKILL.md` lines 26, 74, 94
- `create-pr/reference-hotfix.md` line 3
- `create-release/SKILL.md` line 62
- `create-main-sync/SKILL.md` line 54

This pass deliberately did **not** edit those skill files. M0.34 is a
documentation compression pass; rewriting skill instructions is a different
task with a different blast radius, and the live summary now says so rather
than claiming the tightening is done.
