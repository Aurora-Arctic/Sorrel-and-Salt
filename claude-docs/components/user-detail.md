# UserDetail

`src/components/UserDetail/` is the body of the modal that opens over
`/keepers/users` when an admin presses a user's name (M9.19), and over `/keepers/support` (`?user=<id>`, on top of an open request) when an admin presses a sender's name (see [`support-requests.md`](support-requests.md)): the covens the user
belongs to, preceded by the facts the users table holds about them, and, where
impersonation is registered, Impersonate. It is render-only and a server component. The page reads the memberships through the
coven service and builds the modal around it; this draws only the body.

## Props

`UserDetailProps` (`types.ts`):

| Prop             | What it is                                                                                                                                                                  |
| ---------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `user`           | `UserDetailUser`: a `Pick` of the list's `UserListEntry` (id, name, email, emailVerified, role, primaryAdmin, canCreateWorkspace, providers, createdAt, agreedTermsVersion) |
| `memberships`    | The user's live covens as `UserCoven`s, in any order                                                                                                                        |
| `pauses`         | The user's access pauses as `AccessPauseEntry`s, newest first; left out for the primary admin and the viewing admin's own account                                           |
| `canImpersonate` | Whether impersonation is registered here (MB.53); off by default                                                                                                            |

A `UserCoven` is `workspaceId`, `name`, `slug`, the user's `role` there and
`joinedAt`.

## Contracts

- **Support Time-Out** (2026-10-31): when the page passes `timeouts`, a section after Covens and before Impersonate holds the same `TimeoutPanel` as the support request dialog (card, ledger and form), keyed by the user. Its form offers No End Date beside the dated spans and marks Note required, and its card says "with no end date" for an open-ended one; its fields, its end and its ledger are the site access pause's parts (`access-pause-parts.tsx`; [`../design-decisions/m15-support-review.md`](../design-decisions/m15-support-review.md), "Open-Ended Time-Outs"). This is the one place the ledger of earlier time-outs is drawn, titled Earlier Time-Outs: each entry the day it was set and its end day, or "No End Date", with a "Lifted {date}" badge where lifted, the note, then "Set by {name}" and, where lifted, " · Lifted by {name}" (the lifter is the row's `updated_by`, the lift being the only write after insert), with no list marker. The request dialog links here instead. The page reads them with `readTimeoutsOf`, which returns nothing for a non-admin.
- **Message to User** (M15.66): the support time-out form and Site Access each have a Message to User field after Note (Coven Access has Message to Member), drawn by `PauseFields`. It is required on the time-out form and Site Access, as Note is, and optional on Coven Access; Pause Access and Time Out Sender stay held until it has text. It says "Emailed to them, up to 500 characters." beneath it, and is sent as `message`, trimmed (null when a blank Coven Access message is left out). The email carries it and the end date, never the note.
- **Site Access** (M15.53): when the page passes `pauses`, a section after Support Time-Out and before Impersonate holds `AccessPausePanel` (`access-pause-panel.tsx`), a thin wrapper giving the site's words and writes to `PausePanel` (`pause-panel.tsx`), which the member modal's Coven Access is too (claude-docs/components/member-detail.md, "Coven Access"). The panel is laid out on the time-out panel's classes, its fields, end and Earlier Pauses list drawn from `access-pause-parts.tsx`. With no pause standing it shows a form: For (1 Day, 1 Week, 1 Month, Until a Date, No End Date), Until when a date is chosen, and Note, marked required, then Pause Access, which asks before it sends `pauseUserAccess` (`until` is null for No End Date, the note trimmed) and is held while Until a Date has no future day, by `pauseReady`, the rule the member modal's Pause shares, and while the note is blank. `AccessPausePanel` passes `noteRequired` to `PausePanel`, which hands it to `PauseFields`; the member modal's Coven Access leaves it off, so a coven pause's note stays optional. With a pause standing it shows a card instead: a Paused badge, the end or "with no end date", the note, who set it and when, and Lift Pause, which asks before it sends `liftUserAccessPause`. Pauses lifted or run out are listed beneath as Earlier Pauses, each with its days, the note, "Set by {name}" and, where lifted, " · Lifted by {name}". The page (`readOpenedUser`) reads the newest 25 through `listUserAccessPauses` and passes none for the primary admin, for the admin's own account and for a non-admin, so the action is absent there (`claude-docs/auth/admin-bootstrap.md`, "Pausing a user's access").

- **Laid out as the ingredient modal is, not as a table** (the owner's call,
  2026-10-12): two sections, Account and Covens, each under a small title in
  the heading face and parted by hairlines, with Impersonate under the last
  one, where the other modals stand their actions. A table at a modal's width
  stacks into cards that repeat every label on every coven.
- **The table's facts come first**: a `<dl>` of Email (verified
  or not, the word with the check or cross to its right), Role (bold for an admin or a curator, with the
  primary-admin crown), Coven Creation (Yes or No, the mark to its right),
  Sign-In Methods, Terms (the version agreed to most recently, or a red cross, read as "Not agreed" by a screen reader) and Signed Up, the terms in one column and their values in
  the next. The address itself is not repeated: the heading carries it, under
  the name.
- **The role and creation controls sit beside the facts they change, at the right edge**
  (the owner's call, 2026-10-12): Change Role beside Role, Approve or Revoke of coven creation beside Coven Creation (none for a curator or an admin, who each hold the flag). This modal is the one place an admin changes either: the users table's rows hold the facts alone, so a row is an index into this modal (the owner's call, MB.123 D38 for Revoke, 2026-11-02 for Change Role and Approve). They are `UserList`'s `RoleControl` and
  `CreationControl`, keyed by their action, locked by `changesPaused` while admin changes are paused (MB.63). With `inModal`, `ConfirmedAction` asks over this modal's
  body through `ConfirmOverlay`, its warning and Reason field included,
  rather than open a second modal on top; a success reads the page again, so
  the modal shows the new value and the other action. A refusal is the
  callout under the control, with its badge, as on the row, rather than a
  notice in the modal (`refusalInModal="callout"`; the owner's exception to
  M12.31's rule 6, 2026-10-20): it floats over the rows, so nothing below
  moves, and Escape closes it and leaves the modal open.
- **The marks are the list's own.** `ProviderLogo` lives in
  `UserList/marks.tsx` beside the table's `Mark`, and imports the list's
  stylesheet, so both draw the same; the check and cross are the list's icons
  in its `user-list__mark` colours; `PrimaryAdminMark` is `UserList/primary-admin-mark.tsx`.
- **A coven's name is text, never a link.** An admin is no member of the
  covens they read about, and `/coven/[slug]` answers a non-member 404.
- **The covens are a list, ordered here**: owners, then members, then
  viewers, each by coven name. The service's order is unspecified, and the list
  is bounded by the user's own memberships. Each item is the coven's name, then
  its role and the day they joined (a `<time>` with the UTC date, as the list's
  Signed Up is) in the muted ink at the caption size, as a folded ingredient
  section's summary reads. Role labels live in `roles.ts`; M6.13's members page
  may move them somewhere shared.
- **No memberships** draws a sentence in place of the list.
- **Impersonate shows only for a non-admin, where `canImpersonate`**, the
  list's own rule: Better Auth refuses an admin target whatever this shows.
- **It asks first inside the modal**, through `ConfirmQuestion`
  ([`modal.md`](modal.md)) rather than `ConfirmedAction`, which would open a
  second modal on top. `impersonate-action.tsx` is the one client file. The
  wording, landing and send are `UserList/impersonation.tsx`, shared with the
  list's row button, so the two cannot drift. A success does a full load of
  `/`, the question busy until it opens; a refusal closes the question and
  shows an error notice.
- **Tokens only**: spacing from `space()`; the button row is the page's own
  `btn btn--destructive`. No styling past the tokens before the section's
  design review.

## Stories

[`index.stories.tsx`](../../src/components/UserDetail/index.stories.tsx),
`Admin / User Detail`, on invented people. Impersonate reaches Better Auth,
which the workshop does not serve: the question can be seen, its answer cannot.

`States` has a control that chooses:

- Default: a user with three covens, each role once, and the red Impersonate.
- No Covens: the same user holding none.
- Several Providers: four sign-in methods and an unverified address.
- Admin: the primary admin, marked, with no Impersonate, as the endpoint
  refuses an admin. Curator and Other Admin are the other roles.
- Without Impersonation: the user where impersonation is not registered.
- Changes Paused and No Providers. May Create Covens: the plain Revoke of coven
  creation, beside the red Impersonate.
- Access Open: the Site Access form, with one earlier pause lifted. Access
  Paused: an open-ended pause standing, with Lift Pause.
- `InAModal`: the detail inside a `Modal`, in its own iframe, so Impersonate's
  question draws over it.

## Tests

`tests/components/UserDetail/index.test.tsx`, with the component inside a
`Modal` (the question draws into its layer): the facts (a term and definition each, the sign-up `<time>`, the providers, the primary-admin mark only on the primary admin), Change Role and Approve beside their facts and no creation control on a curator or an admin, each asking inside the one dialog and sending its write, Revoke with a trimmed reason and no unverified warning, every control locked while paused, each control's refusal in the callout under it, the order, role and joining date of each coven,
no links, no coven list when empty, Impersonate present for a user and absent for an
admin or when off, the question before any send, Cancel, a confirm sending
`{ userId }` then landing on `/`, and a refusal showing an alert and not
navigating.

`tests/components/UserDetail/role-and-creation.test.tsx`, the controls' own cases, moved from the users table's tests when the rows lost them: Revoke offered rather than Approve to a user who may create a coven, Approve's question and Cancel sending nothing, the unverified warning describing Approve and none for a verified user, a trimmed reason with the busy confirm and the announcement; Change Role offering every role but the one held, a promotion and a demotion sent with or without a reason, a curator moved either way, the warning on a promotion of an unverified user and on no demotion, the primary admin's `aria-disabled` Change Role described by its reason and raising an alert when tried, the lock while admin changes are paused and none while they are on, and the primary admin's own reason kept while paused.

`tests/components/UserDetail/access-pause-panel.test.tsx`: no Site Access section when no pauses are passed; a dated pause and an open-ended one, each sending nothing until confirmed and then the user, the end (or null) and the trimmed note; the note marked required, with Pause Access held while it is blank, for a dated and an open-ended pause; Pause Access held until a day is picked; a standing pause showing Lift Pause in place of the form and lifting once confirmed; lifted and run-out pauses listed as earlier ones with who set and who lifted each.

`tests/e2e/access-pause.spec.ts` walks it in a browser: an admin sets an open-ended pause from the modal (axe with the question open), the user's password sign-in lands on `/access-paused` with no session made (axe there), the admin lifts the pause, which moves to Earlier Pauses, and the same sign-in then succeeds.

## The modal body

The component is the body of the modal that opens over `/keepers/users` on a user, or over `/keepers/support` on a sender. It shows the facts the users table holds about them, read-only, then the covens they belong to and, where impersonation is registered, the action to act as them. Change Role, and Approve or Revoke, sit beside the facts they change, and each asks over this modal rather than opening another.

It is laid out as the ingredient modal is, in sections parted by hairlines, because a table's labels repeat on every card at a modal's width. It only renders: the page reads the memberships through the coven service.
