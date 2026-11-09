## M7.A — PR gates

_1 task · 1 hour · unscheduled by design_

Not a wave. This gate is trigger-based: do it when a second contributor arrives, or when PR volume makes an untested merge combination a real risk. Nothing depends on it.

**M7.A.1 — Enable Require merge queue on main and staging** · 1h

_Story:_ As a developer, once other people are contributing, I want a merge queue so that `main` and `staging` never receive an untested merge combination.

Split off from M0.21, which ports `merge-queue.yml` but deliberately leaves the branch-protection switch off during solo development — a required queue forces the full CI suite before every merge, which is wasted time with one developer and no users. Enable **Require merge queue** in Settings → Branches on both `main` and `staging`.

_Acceptance criteria:_

- Merge queue enabled on `main` and `staging`
- A queued PR triggers the workflow
- The additional required checks from M0.22 are in place
- Setup step documented in claude-docs
