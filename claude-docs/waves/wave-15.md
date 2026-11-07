# Wave 15 — Launch

The row lists its finished tasks first, in the order they ran, and its open tasks after them (the owner's call, 2026-11-03), so the board reads as done work, then the schedule. The placements below give the order each open task was planned in. The reasoning for the finished tasks is in git history and `archive/tasks-closed-waves.tar.gz`.

Every other wave is complete first. This one is mostly verification, but not purely: M11.9 audits every wait against the loading standard of M12.33 and fixes the gaps it finds, so it changes code and is not a checklist pass.

**The order of the open tasks:**

- **M15.6, M15.7, M15.8** change code and the build, so they precede M11.8 and M11.11. M15.6 comes first because it is the larger freeze (the theme toggle's many colour fades become one cross-fade); M15.7 makes taps, dialogs and search respond sooner on a slow device; M15.8 follows it (codegen's compiler plugin cuts each page's GraphQL download to its own query). Each can be pulled earlier.
- **M11.9** audits the waits against the loading standard.
- **M11.8's axe sweep** depends on every page existing, so it runs after every open task that changes code (bar M11.16, which follows it), M15.8 the last, and directly before M11.11's verification passes: MB.124's design review and M15.6 and M15.7's changes to the theme toggle and the dialogs change what it scans.
- **MB.124** follows M11.9, the last of M5.4's design reviews, once the error pages exist, and runs ahead of the checks that close the release.
- **MB.90** (the Day 1 developer guide, root `.env.example` and `npm run setup`) is documentation and tooling, depends on nothing in the wave and can move to any wave.
- **M11.11, M11.12, M11.14** close the release: M11.11 verifies coverage and acceptance reporting, M11.12 is the `claude-docs` completeness pass, and M11.14 promotes `release/1.0.0` to `main`.
- **MW.15 closes the project.** It is the one close-out pass that survives, sized at 3h because it carries the v1 close-out ([`tasks/mw.md`](../tasks/mw.md)).
- **M7.A.1 and MB.78 are unscheduled by design.** M7.A.1 is trigger-based (its trigger is in [`tasks/m7a.md`](../tasks/m7a.md)); MB.78 is the OAuth proxy that lets a hotfix preview complete a real sign-in, post-launch, with its trigger the first hotfix after launch that needs a sign-in to check ([`tasks/mb.md`](../tasks/mb.md)). Each sits near the end of the row, ahead of M15.62 and M11.16 (the owner's call, 2026-11-06), because that is the latest point it could still fire before v1; the trigger, not the position, starts it.
- **M15.62** has a Washington lawyer review the terms' legal clauses; it builds no code and sits at the end of the row, after MB.78 and ahead of M11.16, so the review runs last (the owner's call, 2026-11-06).
- **M11.16** (the site's images) runs last, after M11.8's axe sweep and MB.124's design review. It therefore checks its own accessibility for the images it adds (alt text, an axe scan in both themes, contrast and forced colours). Nothing in it depends on the wave, so it can be pulled earlier if the front door wants a mark sooner.

**Moved out of this wave:** MB.163 and MB.175 are in [Wave 17](wave-17.md) (post-launch); M15.61 and M15.73 → M15.76 are in [Wave 18](wave-18.md) (the GDPR work). The legal-document tasks' reasoning is in [`../design-decisions/support.md`](../design-decisions/support.md).
