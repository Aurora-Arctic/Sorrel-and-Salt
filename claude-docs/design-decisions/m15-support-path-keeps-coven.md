# A support request keeps the coven in its page

**Decision (owner, 2026-10-31).** A request's `path` is stored as the address the visitor was on, for example
`/coven/whitethorn-coven/grimoire`, never `/coven/[coven]/grimoire`. A support agent needs the coven to triage.
This reverses the write-time redaction in `m15.1-support-form.md`.

**Who sees the slug (owner, 2026-10-31).** A site admin and the sender read the page as stored. A curator reads it with the
segment after `/coven/` replaced by `[coven]`, because a coven's existence is private to its members and a curator is not
an admin. The replacement is done at read, in `src/modules/support/services/staff.ts` (`redactPathForCurator`), on the
staff list, the staff read by id and the rows the staff acts return, so the GraphQL `path` field and the admin dialog
follow without a rule of their own. The sender's own reads (`own.ts`) return the page as stored.

**What still holds.** The query string and fragment are dropped on write, and the segment after `/invite/` is replaced by
`[token]` on write, since a token is a credential. Every other dynamic segment is stored as the address has it.

**Where the page comes from.** The Support dialog and Report This read the address bar, because the router answers
`/_not-found` on a 404. The crash page (`global-error.tsx`) adds the address bar's path as `from` when its link is
pressed. Existing rows keep `[coven]` until they are deleted.
