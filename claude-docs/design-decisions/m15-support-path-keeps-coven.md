# A support request keeps the coven in its page

**Decision (owner, 2026-10-31).** A request's `path` is stored as the address the visitor was on, for example
`/coven/whitethorn-coven/grimoire`, never `/coven/[coven]/grimoire`. A support agent needs the coven to triage.
This reverses the redaction in `m15.1-support-form.md`, which hid the slug because a coven's existence is private to its members.

**What the cost is.** A reviewer who is not a member can now read a coven's slug from a request. The sender chose to
send that page, and the slug is no more than the address they were on.

**What still holds.** The query string and fragment are dropped, and the segment after `/invite/` is replaced by
`[token]`, since a token is a credential. Every dynamic segment is stored as the address has it.

**Where the page comes from.** The Support dialog and Report This read the address bar, because the router answers
`/_not-found` on a 404. The crash page (`global-error.tsx`) adds the address bar's path as `from` when its link is
pressed. Existing rows keep `[coven]` until they are deleted.
