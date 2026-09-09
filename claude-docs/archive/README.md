# Archive

Where superseded text goes when a live doc is trimmed — never deleted outright.
Fed by the end-of-milestone compression pass described in
[`CLAUDE.md`](../../CLAUDE.md)'s Conventions section.

## Rules

- **Write-once.** A file placed here is never edited again. If a later pass
  needs to remove something that itself already lived in the archive, it adds
  a new file rather than touching the old one.
- **One subdirectory per milestone**, `m0/`, `m1/`, … , mirroring the live
  layout beneath it: a `CLAUDE.md` for text cut from the root file, and
  `<subsystem>.md` files for text cut from a `claude-docs/<subsystem>.md`
  summary, named the same way the live file is.
- **Transcripts are the one exception to "moves in."** A transcript
  (`claude-docs/transcripts/<subsystem>.md`) is never rewritten, so there is
  nothing to cut from it during a compression pass. It is _copied_ — not
  moved — into `archive/<mN>/transcripts/<subsystem>.md` only once, when that
  subsystem is finished (no further milestones will touch it). The live
  transcript keeps a pointer to the copy rather than being emptied.
- Every file here carries enough header context (which live doc it came from,
  which pass removed it, and why) to be read on its own — the point of
  archiving instead of deleting is that this stays legible later.

## Why this exists

`CLAUDE.md` is guidance for _current_ work, not a history of the project. Text
that was true and useful mid-milestone — "does not exist yet" caveats, a
placeholder Commands table, in-progress framing — stops being useful the
moment it resolves, and left in place it makes the live doc both longer and
less trustworthy. Moving it here instead of deleting it keeps the reasoning
behind past decisions recoverable without cluttering the doc every task reads
first.
