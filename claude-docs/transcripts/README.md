# Transcripts

Append-only narratives of how each subsystem reached its current shape.

**M0's transcripts are archived** under `../archive/m0/transcripts/`, Wave 1's
`auth.md` under `../archive/wave-1/transcripts/`, and Wave 2's `debugging.md`
plus `db.md`'s M1.19 entry under `../archive/wave-2/transcripts/`. None is
required reading — anything still true was written into a live summary before
they moved. A transcript moves out when the wave whose work it records closes
(`MW.<n>`), so this directory holds transcripts for waves still open.

`db.md`'s remaining entries (M1.2, M1.15) and the whole of `ci.md` and
`testing.md` record M1 work that landed before the wave order existed, so no
`MW.<n>` owns them; they stay here until a pass claims them explicitly.

- One file per subsystem, sharing a name with its summary in the parent
  directory (`styling.md` ↔ `../styling.md`).
- Add an entry as work lands; do not edit or reorder earlier entries. If
  something was wrong, say so in a new entry.
- Newest entry at the bottom. Each entry names its date and task, says what
  changed, and says why. Detailed reasoning belongs in a decision record — link
  to it rather than restating it.
- A subsystem worked on across several waves has its transcript archived in
  pieces, one per wave. That is expected: the live summary, not the
  transcript, is what has to read continuously.
- Component-level history goes in `components/<name>.md` here, mirroring
  [`../components/<name>.md`](../components/).
