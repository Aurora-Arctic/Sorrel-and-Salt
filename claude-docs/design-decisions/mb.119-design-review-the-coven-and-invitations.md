# MB.119 — Design review: the coven and invitations (#576)

**Status:** decided and built. Only the decisions, the reasons and what they rule out are kept here.

## Where the build departed from the plan

Recorded as the lanes reported it. The plan above stays as approved.

- **The task runs in a worktree.** The build started on 2026-10-13 in `/home/node/worktrees/mb119`, at the owner's word. The plan had Lane 1 in `/app`. Lanes 1 and 2 each worked in their own worktree instead, and their commits were merged into the task branch as they landed.
- **The pager move touched more than three callers.** Six pages call `pagerHrefs`: the value, group and privilege-changes pages the plan names, plus the admin compendium, users and invitations pages. Eight component files imported `PagerCursor` and `PagerHrefs` from `admin/types.ts`. Every one now imports from `src/lib/`, with nothing re-exported, so each name has one import path.
- **`PagerHrefs` is generic.** `src/lib/types.ts` imports nothing (`claude-docs/modules.md`, "Where types live"), so it cannot name Next's `Route` type. It is `PagerHrefs<Href extends string = string>`, and each list component asks for `PagerHrefs<Route>`, so its links are still checked as routes.
- **Finding 12 missed two fixtures.** `SectionNav/index.stories.tsx` also drew the coven nav without `canReadMembers`. `.ladle/shell-frame.tsx` also passed a `workspaces` prop that `AppShell` no longer takes. Both are fixed. Stories sit outside the type check, which is why nothing caught either.
- **The context row's ground got its comment measured.** The plan pointed at a comment saying why no tokens-test row is needed, and none existed. In both themes the ground sits between the page and the card in every colour channel. Every text colour's contrast on it therefore lies between two contrasts the tokens test already holds to 4.5:1, and the comment now says so.
- **`FormActions` has a test file of its own.** `field.md`'s Testing section now says almost no shared piece has one, because the plan asked for this test.
- **Sub-hour fixes found on the way:** the Foundations page now shows the `tab` type size, and `workshop.md` counts five type roles. MB.124's entry names the floating-panel widths and the `ConfirmedAction` move, and M8.16's focus criterion notes `ModalButton`.
- **Wave B started on M10.32's finished branch, and the task moved into `/app`.** M10.32 (PR #947) also carries M10.34, declining an invitation. Once M10.32 was done, the branch was rebased onto it and checked out in `/app`, at the owner's word. Lanes 3 and 4 each ran in their own worktree.
- **M10.32 moved the received invitations to the account page.** `ReceivedInvitations` sits in `/account`'s Invitations section, and the coven landing shows a notice linking there. So the landing draws no table, its proposals show the page as it now is in four states (can or cannot create, invitations waiting or not), and decision (i), Create Coven's weight beneath the table, no longer arises.
- **Finding 20 was already met, and the table keeps its own name.** The account page's section is the region, named by its heading. The heading does not sit directly above the list, and naming the table from it would read "Invitations" twice in a row.
- **Finding 22's empty line is live.** The account page draws the list even when nothing waits, so "No invitations are waiting." shows, and a `NoInvitations` story draws it.
- **Two fixes beyond the plan.** `CreateWorkspaceForm` gave its name hint only to the description, so its tip was never drawn and the input pointed at a missing id; it now draws both, under a regression test. The workshop's shell viewer lacked the invitation count M10.32 added to the shell's viewer.
- **The invitations page already read its cursors with `readPageCursors`**; only its pager links moved to `pagerHrefs`. `PendingInvitations` keeps its stylesheet, which now styles M10.34's Declined mark, and its Revoke and Remove stay on `ConfirmedAction` for MB.124.
- **The acceptance page refuses a deleted coven as an invalid link today**, telling the reader to check they opened the whole link, which is wrong advice; `DeletedCovenAsBuilt` shows it beside the proposed sentence of decision (f). A declined invitation has its own sentence already, shown by `Declined`.
- **`AdminInvitations` is unchanged.** The only change the plan gave it there is the Revoke wording, decision (g), which waits for sign-off.

## Decisions taken at sign-off (2026-10-13)

The owner reviewed the proposals and the screenshots, and chose:

- **(a) The coven index:** the owner section, with Delete in a section only a steward sees. It also gains the Contents section, a list of the coven's pages, and a jump menu (`PageNav`) laid out as the account page lays its own: a sticky column to the left of the content on a wide screen, and the list above the sections on a phone.
- **(b) The landing:** named headings. "Welcome" becomes the eyebrow, and the heading says "Start a Coven" or "Join a Coven".
- **(c) The invitation page:** on a panel, as the sign-in page is.
- **(d) People or Members:** the page heading says "Members", matching the nav item. This is not the recommended option; the tabs stay Members and Invitations.
- **(e) Where Leave and Delete land:** the coven landing, `/coven`, followed by a refresh.
- **(f) A deleted coven's invitation:** its own refusal reason, `closed`, reading "The coven this invitation was for has been deleted, so it can't be accepted."
- **(g) Revoked or withdrawn:** the Revoke dialogs say "Its link will say it was withdrawn." The button stays Revoke.
- **(h) The role refusal:** "Your role in this coven doesn't allow that. Ask a steward if you need it."
- **(i):** void, as recorded above.
- **The Wave B fixes** were accepted as built.

Two Phase 2 lanes build these: an index lane (a, b, e, h, `styling.md`) and a people lane (c, d, f, g). The screen-noun lines in `DESIGN.md`, `CLAUDE.md` and the components rule now say the screens say _coven_.
