# Design review: the coven and invitations

**Status:** decided. Live home: the screens and their copy in `src/app/(shell)/coven/` and `src/components/`; the screen-noun rule is `CLAUDE.md`, "Vocabulary".

## Decision

The owner chose, on reviewing the proposals and screenshots:

- **Coven index.** The owner section, with Delete in a section only a steward sees; a Contents section listing the coven's pages; a jump menu (`PageNav`) laid out as the account page lays its own, a sticky column beside the content on a wide screen and the list above the sections on a phone.
- **Landing.** Named headings: "Welcome" is the eyebrow, and the heading says "Start a Coven" or "Join a Coven".
- **Invitation page.** On a panel, as the sign-in page is.
- **Members.** The page heading says "Members", matching the nav item; the tabs stay Members and Invitations. (Not the recommended option.)
- **After Leave or Delete.** The coven landing, `/coven`, followed by a refresh.
- **A deleted coven's invitation.** Its own refusal reason, `closed`, reading "The coven this invitation was for has been deleted, so it can't be accepted."
- **Revoke.** The dialogs say "Its link will say it was withdrawn."; the button stays Revoke.
- **Role refusal.** "Your role in this coven doesn't allow that. Ask a steward if you need it."
- **Received invitations** sit in `/account`'s Invitations section, and the coven landing shows a notice linking there, so the landing draws no table.
- **Pager types** live in `src/lib/` with one import path and no re-exports. `PagerHrefs<Href extends string = string>` is generic because `src/lib/types.ts` imports nothing, so it cannot name Next's `Route`; each list component asks for `PagerHrefs<Route>`.
- **Screens say _coven_; code, schema and prose say _workspace_.**

## Why

Each choice follows the owner's reading of the proposals: a deleted coven's invitation was telling the reader to check they opened the whole link, which is wrong advice, and a role refusal should say who can grant the access. The pager types stay free of Next imports so `src/lib/types.ts` stays import-free.

## Rules out

- **A coven landing table of received invitations**, and with it the weight of Create Coven beneath the table.
- **Naming the invitations table from the account page's section heading**, which would read "Invitations" twice in a row.
- **Re-exporting the pager types from `admin/types.ts`**: every name has one import path.
