<!--
Archived 2026-09-10 by the doc consolidation pass over M0's working docs.
Verbatim pre-pass copy of claude-docs/components/README.md. What the pass cut:
port provenance (what carried over from resume-2026 and what was dropped in
the port), and the change-by-change narrative behind settled decisions.
Current truth is the live doc; this file is write-once and is allowed to be
out of date.
-->

# Component docs

One Markdown file per standalone component, lower-kebab-named after the
component directory (`theme-toggle.md` ↔ `src/components/ThemeToggle/`).

Several tasks name a component doc as an acceptance criterion, and the M0.30
component workshop discovers components by their `index.stories.tsx`; a
component that ships without its doc is an incomplete task.

A component doc records what someone needs to know before changing the
component that is not obvious from the code:

- what it is ported from (`resume-2026`) and what was deliberately changed or
  dropped in the port, with the reason;
- contracts it shares with other code (a storage key, an exported helper, an
  attribute another module also writes);
- styling constraints (which tokens and mixins it is allowed to use);
- what its tests cover, and anything that could not yet be verified through the
  repo's own runner.

Longer, blow-by-blow history goes in
[`../transcripts/components/<name>.md`](../transcripts/); this file stays a
summary.
