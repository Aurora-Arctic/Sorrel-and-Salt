## MW — Wave close-out

_2 done, 12 retired, 1 live: MW.15 at 3 hours_

One per wave, each compressing the live docs and archiving that wave's transcripts and decision records — as MW.1 and MW.2 did. **MW.3 through MW.14 are retired without being done (MB.31)** — ids kept, per the MB.19 precedent. Why is [`TASKS.md`](../TASKS.md)'s "Wave close-out and the MW namespace".

**MW.1 — Compress and archive the working docs for Wave 1** · 1h

**MW.2 — Compress and archive the working docs for Wave 2** · 1h

Both ran, at the size every pass was sized at before MB.31 retired the rest.

**MW.15 — Compress and archive the working docs for Wave 15 and v1** · 3h

**MW.15 is not retired.** It is not a compression pass with a bigger diff — it is the pass that ends the mechanism, and the only one whose job cannot be done incrementally: a v1 reader needs the whole set checked against the shipped code at once, and the archive needs retiring exactly once.

**MW.15 carries the v1 close-out** that M11.15 held, which is why it is sized at 3h rather than 1h. The docs a v2 reader opens must be short, true, and the only thing they have to open. Three parts, in this order, because verifying a doc you are about to rewrite wastes the verification, and retiring the archive before the live docs are settled hides what is missing:

1. **Verify.** Walk every live doc in `claude-docs/` and CLAUDE.md against the shipped code. Commands in the Commands table are run, not read; ports, script names, file paths, table and column names are checked to exist. Each disagreement is settled per CLAUDE.md's rule — establish which side is wrong _before_ reconciling them, so a bug is not laundered into documented behaviour by editing the doc to match it.
2. **Compress and close out v1.** The usual Wave 15 compression, plus: rewrite CLAUDE.md as a description of the shipped system rather than of the work, and turn the "Out of scope for v1" list into the v2 backlog it always was. The test of that pass is that nothing a v2 task still needs to read has left CLAUDE.md.
3. **Retire the archive.** Read every file under `claude-docs/archive/` and confirm each settled decision and binding constraint in it is already stated in a live doc — moving it into one where it is not. Then `git rm -r claude-docs/archive/`, and amend CLAUDE.md's compression-pass and archive rules in the same PR, since they would otherwise describe a directory that no longer exists: post-v1, text leaving a live doc either moves to another live doc because it still binds, or is deleted because it does not, and git history is the record.

Part 3 replaces the earlier plan to _fold_ the per-wave archives into a v1 archive with an index. It now carries **more** weight than when it was written, not less: MW.1 and MW.2 each asserted that nothing lives only in the archive before filling it, but the twelve passes that would have re-asserted it are retired, so MW.15 is the one place that claim is checked against the whole directory. Check it a line at a time rather than trusting the two passes that ran. Keeping a directory nobody reads as insurance is the failure mode, not the safeguard, and git history keeps every archived file retrievable in any case — which is what makes this a compression decision rather than a destructive one. MB.31 froze the archive, so its contents are fixed and there is no wave still feeding it.

CLAUDE.md already says nothing new goes into the archive (MB.31); part 3 is what makes the directory itself go. The docs will have changed substantially by the time MW.15 runs, so scope it against the docs as they are then, not as they are today.

MW.15 carries the criteria every pass carried:

- Every statement in every live doc is true as of v1
- Forward-looking rules that still bind later work are kept, not trimmed for reading like background
- History that is still true is kept
- Nothing ends up living only in the archive
- Where a doc and the code disagree, which one is wrong is established before they are reconciled

**MW.15 adds:**

- Every command in CLAUDE.md's Commands table has been run and behaves as documented
- Each doc/code disagreement found is recorded in the PR body with which side was wrong and why — never silently reconciled toward the code
- Every settled decision and binding constraint in `claude-docs/archive/` is demonstrably stated in a live doc before deletion; the PR body lists anything that had to be moved out
- `claude-docs/archive/` no longer exists, and no live doc or code comment links into it — `grep -r 'claude-docs/archive' .` returns nothing outside git history
- CLAUDE.md is a description of the shipped system, its compression-pass and archive rules describe the post-v1 mechanism, and "Out of scope for v1" has become the v2 backlog
- `claude-docs/README.md` describes the layout as it now is
- Nothing a v2 task still needs to read has been trimmed
- `npm run pre-commit` and `npm run test:coverage` are green
