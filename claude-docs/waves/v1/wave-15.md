# Wave 15 — Launch

The row lists its finished tasks first, in the order they ran, and its open tasks after them (the owner's call, 2026-11-03), so the board reads as done work, then the schedule. The placements below give the order each open task was planned in. The reasoning for the finished tasks is in git history and `archive/tasks-closed-waves.tar.gz`.

Every other wave is complete first. This one is mostly verification, but not purely: M11.9 audits every wait against the loading standard of M12.33 and fixes the gaps it finds, so it changes code and is not a checklist pass.

**The order of the open tasks:**

- **M15.6, M15.7, M15.8** change code and the build, so they precede M11.8. M15.6 comes first because it is the larger freeze (the theme toggle's many colour fades become one cross-fade); M15.7 makes taps, dialogs and search respond sooner on a slow device; M15.8 follows it (each page downloads only its own GraphQL documents, sent as text). Each can be pulled earlier.
- **M15.82, M15.83, M15.84, M15.85** follow M15.8 and also change code, so they precede M11.8: M15.82 traces one search keystroke on `/compendium` and records what the browser redoes, M15.83 removes the suggestion field's work on each key that changes nothing, M15.84 sends `/compendium`'s vocabularies once and each card's second copy in a smaller form, and M15.85 loads the date field, the sortable list field and the add-to-coven form separately from first load, starting before each is opened.
- **M11.9** audits the waits against the loading standard.
- **M11.8's axe sweep** depends on every page existing, so it runs after every open task that changes code, M15.85 the last, and directly before M11.12: MB.124's design review and M15.6 and M15.7's changes to the theme toggle and the dialogs change what it scans.
- **MB.124** follows M11.9, the last of M5.4's design reviews, once the error pages exist, and runs ahead of the checks that close the release.
- **MB.90** (the Day 1 developer guide, root `.env.example` and `npm run setup`) is documentation and tooling, depends on nothing in the wave and can move to any wave.
- **M11.12** is the `claude-docs` completeness pass.
- **MW.15 closes the project.** It is the one close-out pass that survives, sized at 3h because it carries the v1 close-out ([`tasks/v1/mw.md`](../../tasks/v1/mw.md)).

**Moved out of this wave:** MB.175, M11.14 (promoting `release/1.0.0` to `main`) and M7.A.1 are in [Wave 17](wave-17.md); M11.11's coverage verification is part of M17.10 there; MB.78 is last in the Bugfixes milestone; MB.163 is in the Deferred milestone; M15.62 and M11.16 are in the Outside the Website milestone (work done outside the website); M15.61 and M15.73 → M15.76 are in [Wave 18](../v1-next/wave-18.md) (the GDPR work). The legal-document tasks' reasoning is in [`../../design-decisions/support.md`](../../design-decisions/support.md).
