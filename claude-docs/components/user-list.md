# UserList

`src/components/UserList/` — `/admin/users`' filter, table and pager (MB.52).
It is render-only and a server component: the page reads one page of users
through the identity service and hands it over, with the filter as asked and
the hrefs of the pages either side
([`auth/admin-users.md`](../auth/admin-users.md), "The user list").

## Props

`UserListProps` (`types.ts`):

| Prop               | What it is                                                                         |
| ------------------ | ---------------------------------------------------------------------------------- |
| `users`            | This page's `UserListEntry` rows, in the list's order                              |
| `query`            | The name-or-email filter as asked, blank for none                                  |
| `awaitingApproval` | Whether the list is narrowed to `canCreateWorkspace = false`                       |
| `previousHref`     | The page before this one, absent on the first                                      |
| `nextHref`         | The page after this one, absent on the last                                        |
| `canImpersonate`   | Whether impersonation is registered here (MB.53); off by default                   |
| `adminChanges`     | `{ paused, canToggle }`, the pause on admin changes (MB.63); no switch when absent |

A `UserListEntry` is the user row's name, email, role, `canCreateWorkspace`,
`createdAt` and `emailVerified`, plus `providers`, the provider ids the service
read beside it, and `primaryAdmin`, which the page asks of the identity
service's `isPrimaryAdmin` for each row as it reads it (MB.59).

## Contracts

- **The filter is a GET form to `/admin/users`**, named "Filter users" inside
  a `<search>` landmark: a search box labelled "Name or Email" (`query`), a
  native Role select (`role`: All roles, Admin or User), a "Needs Approval"
  checkbox (`awaiting`), each label in title case on the owner's call, and a
  Filter button. All roles submits natively as `role=`, which the page reads
  as no role. A
  filtered page is an address, and filtering starts again from the first page,
  since the form carries no cursor. It is `filter.tsx`, one of three client files
  here.
- **Filter is offered only when there is a new filter to apply** (MB.53, on
  the owner's word). It is `disabled` while the trimmed query and the checkbox
  match the filter the page shows, enabled once either differs, and disabled
  again when they are put back. `disabled` rather than `aria-disabled`, as
  the primitives reserve it for a submit with nothing to send.
- **`awaiting` is a bare flag**, read by its presence (MB.53, on the owner's
  word). A submit builds the address itself with `href.ts`'s `userListHref`,
  the pager's builder too, so it reads `?query=bo&awaiting` rather than
  `awaiting=1`, and opens it as a full load, as the pager's anchors do. Before
  hydration the form submits natively, with the checkbox as `awaiting=`, which
  the page reads the same, as it does an older link's `awaiting=1`.
- **Six columns, in the owner's order**: Name, Email, Role, Coven Creation,
  Sign-In Methods and Signed Up, each heading in title case (DESIGN.md §9).
  The two columns with a control, Role and Coven Creation, sit together, and
  the two facts read rather than changed follow them (reordered during MB.59,
  on the owner's call). The Email
  cell leads with whether the address is verified, then the address, so the
  two are one column. Sign-in methods and the verified mark are what an admin
  granting admin judges a person by (MB.59). A yes-or-no is a mark, on the
  owner's call: a green check (`$accent`) or a red cross (`$secondary`), from
  `icons.tsx`, its word beside it in `.visually-hidden` since the mark is
  drawn alone, and the icon `aria-hidden`. The email's says Verified or
  Unverified, and on hover in a tip bubble too (`tip-bubble`, the form tips'
  look, opened by `tip-bubble-open`), so the eye learns what it marks: a
  native `title` showed too late to be seen, on the owner's review. The bubble
  is `aria-hidden`, the reader having the hidden word. The creation flag's
  says Yes or No, which its heading asks, and has no bubble.
  An admin's role is bold, on the owner's call. The signup is the UTC
  date, in a `<time>` carrying the full instant. A provider shows as its
  logo, on the owner's call: the sign-in page's own mark (`SignInPanel/icons.tsx`)
  on a small circle of its brand's ground, white for Google and Microsoft,
  blurple for Discord. Facebook's is `FacebookMark`, Meta's circle filled its
  own blue with no chip, the "f" a hole the row's band shows through in
  either theme, on the owner's call (MB.63); the panel's `FacebookIcon`, white
  over a blue chip, suits its blue button instead. The colours are hex literals
  as the panel's are. Each is named by its `SOCIAL_PROVIDERS` label in hidden text and
  in the same tip bubble on hover as the email's mark (`.user-list__hint`). A
  provider the roster no longer has keeps its id as text, so an account linked
  by one since removed still says so; an account with none has an empty cell.
- **No match is a sentence, not an empty table**: "No users match."
- **The pager is `Pager`** ([`pager.md`](pager.md)), with plain anchors:
  Prev and Next, an end with no page disabled, and nothing at all on a list of
  one page. A plain anchor is a full load, so the page's guard runs again, as with
  `AdminNav`.
- **A history icon leads each name** (MB.200, on the owner's call: an
  icon rather than a column), on every row, an admin's included: a link to
  `/admin/privilege-changes?query=<email>`, the privilege ledger searched for
  that user's address, lower-cased as every address is held, built by `PrivilegeLedger`'s `privilegeLedgerHref`
  ([`privilege-ledger.md`](privilege-ledger.md)). It is `history-link.tsx`,
  a client file, and `icons.tsx`'s `HistoryIcon`, a clock with a
  counter-clockwise arrow in `currentColor`, `aria-hidden`. The link is
  named "Permissions history for <name>", and a tip reading Permissions
  History shows above it on
  hover, focus or a tap, stays while the pointer is on it, and closes on
  Escape, blur or the pointer leaving: InfoTip's behaviour, through the same
  `useTip` ([`info-tip.md`](info-tip.md)), the tip `role="tooltip"` and
  `aria-hidden` while closed. The icon is 1.5rem, WCAG 2.2's 24px minimum, in
  the muted ink, and its hit area reaches `$control-height`, WCAG 2.5.5's
  44px, through a pseudo-element, so the row is no taller for it; its focus
  ring is the `focus-ring` mixin's.
- **Impersonate is a seventh column, only where impersonation is registered**
  (MB.53, [`auth/impersonation.md`](../auth/impersonation.md)). The page
  passes `canImpersonate` from `impersonationEnabled()`, so at production the
  column does not exist. Each non-admin row holds an Impersonate button named
  "Impersonate <name>", from `impersonate-button.tsx`, a client file. An admin's row holds none, because the endpoint refuses to
  impersonate an admin. A success is a full load of `/` as the user. A refusal
  says "<name> could not be impersonated." in the row, and the page stays.
  The endpoint is the guard: the button only puts it where an admin looks.
  The column, heading and cells, has a red rule down its left. The column is
  tinted a faded red with red text, and its heading's hairline is red where
  every other is the muted ink. It is sticky at the table's right edge, so on
  a narrow screen the other columns scroll beneath it (on the owner's call,
  during MB.59): its tint is therefore mixed into the ground it sits on, the
  page or a banded row's card, rather than laid over transparent. The table's
  borders are separate rather than the primitive's collapsed ones, so each
  rule belongs to its cell and the headings' hairline scrolls beneath the red
  one rather than being drawn across it. No cell wraps: the table scrolls
  instead, and only a tip's text wraps, within its bubble.
  Its
  button is `.btn--destructive`, on the owner's call: it is the one control
  that acts as someone else.
- **Coven Creation holds its control** (M5.8,
  [`auth/admin-users.md`](../auth/admin-users.md), "Approving workspace
  creation"), from `creation-control.tsx`, beside the mark it changes: one
  column rather than a second saying the same thing, on the owner's review,
  and the heading says what is approved so the buttons stay one word. A user
  who may not yet create a coven has Approve, quiet, named "Approve <name>";
  one who may has Revoke, red, named "Revoke approval for <name>", on the
  owner's call; an admin's row has the
  mark alone, since every admin holds the flag (MB.177). Each asks first, in a
  `Modal` ([`modal.md`](modal.md)) titled "Approve Coven Creation" or "Revoke
  Coven Creation", on the owner's call, the name in bold: "Let <name> create
  covens?", or "Stop <name> from creating covens? Covens they own stay
  theirs.", then the same optional Reason field as the role control's (below;
  added beside MB.59's on the owner's call), under the warning where there is
  one, sent as the ledger row's note, and the action again, which takes focus, and a quiet Cancel, which closes it and hands focus
  back to the row's button. The modal's Revoke is `.btn--destructive`, its
  Approve `.btn--solid`. Every button in the table, Impersonate included, is
  `.btn--small`, so a row is no taller than its text. The modal's action sends
  the mutation and stays busy, spinner and "Approving" or "Revoking", until
  `router.refresh()` re-reads the page, whose row then offers the other
  action: the control is keyed by its action, so the refreshed row mounts a
  fresh one, without the modal, rather than keeping the busy state. A refusal
  closes the modal, puts the service's message in the row as an alert, and
  offers the action again. The service is the guard.
- **Approving or granting to an unverified address warns first** (MB.205,
  MB.59). When the row's `emailVerified` is false, the Approve modal says,
  under its question, in a `.notice--warn`: "This email address has not been
  verified, so nobody has proved who holds it. Approving keeps the account
  rather than letting it lapse." Grant's says the same with "Granting": the
  one sentence is `warning.ts`'s `unverifiedWarning(verb)`, and a grant's
  ledger row keeps the account from the sweep as an approval's does. An approval vouches for whoever holds the address, and the vouching
  keeps the account from MB.67's sweep of lapsed unverified accounts (MB.204).
  It is a warning, not a refusal: the modal's Approve still approves, since
  M2.9 leaves confirming who someone is to the admin. The modal's Approve is
  `aria-describedby` the warning, so a screen reader reads it as the focus
  lands there on opening. A verified user's Approve or Grant, and every Revoke, carries
  none. The control takes `emailVerified` from the row for it.
- **The Role cell holds the role's control** (MB.59,
  [`auth/admin-users.md`](../auth/admin-users.md), "Granting and revoking
  admin"), from `role-control.tsx`, beside the role it changes: one column
  rather than a second saying the same thing, as Coven Creation holds its
  own. A user's row has Grant, quiet, named "Grant admin to <name>"; an
  admin's has Revoke, red, named "Revoke admin from <name>". Each asks first
  in a `Modal` titled "Grant Admin" or "Revoke Admin", the name in bold:
  "Make <name> an admin? Admins curate the compendium and its lists, and can
  grant and revoke admin. They will also be able to create covens.", or "Stop
  <name> being an admin? They keep their covens, and everything they wrote
  stays as it is." Under the question is an optional Reason field, its hint
  saying it is optional and kept with the change; a blank reason is sent as
  none, and the service stores what is sent as the ledger row's note. The
  modal, its focus, Cancel, the busy confirm and a refusal in the row behave
  as the creation control's: both are `confirmed-action.tsx`'s
  `ConfirmedAction`, each control only its words and its write. Grant warns
  on an unverified address as Approve does, in its own verb (below).
- **The switch on admin changes sits beside the page's heading** (MB.63,
  [`auth/admin-users.md`](../auth/admin-users.md), "Pausing admin changes"),
  from `pause-control.tsx`, exported beside the list as `PauseControl`: the
  page draws it as the second child of its `.page-header`, as the other admin
  pages put their primary action beside their heading, and keys it by the
  state so the refresh after a flip mounts a fresh one (all on the owner's
  call). It is one row, `.user-list__pause`, centred with a `space(3)` gap,
  which the primitive wraps beneath the heading on a narrow screen. While
  changes are on it shows the button alone; while paused it first says so in
  a `.notice--warn`: "Admin changes are paused: only the primary admin can
  make someone an admin or stop them being one." The notice is a plain
  paragraph, compounded as `.notice.user-list__pause-state` past the
  `body .notice` primitive, and is the page's one sentence about the pause.
  Then Pause Admin Changes or Resume Admin Changes, both full size and
  `.btn--destructive`, big and red on the owner's call, so the control keeps
  its look as it flips. For the primary admin (`canToggle`) it sends the
  mutation at once, with no modal, since pausing takes nothing away and
  resuming is the way back, and stays busy, spinner and "Pausing" or
  "Resuming", until `router.refresh()` re-reads the page; a refusal says why
  beside it. For any other admin it is `locked-control.tsx`'s
  `LockedControl`, as the primary admin's Revoke is: in view,
  `aria-disabled`, its reason in a tip, "Only the primary admin can pause or
  resume admin changes.", that describes it and that each try mounts afresh as
  an alert.
- **While paused, an admin the pause binds cannot use Grant or Revoke**
  (MB.63, on the owner's call). The page passes the pause it already read,
  and every row's control, for a viewer who is not the primary admin
  (`canToggle`), is locked as the primary admin's Revoke is: in view,
  `aria-disabled`, described by the service's own refusal in a tip,
  `ADMIN_CHANGES_PAUSED_REFUSAL` (`src/lib/primary-admin.ts`, one string for
  both): "Admin changes are paused, so no one can be made an admin or stop
  being one until they are resumed." Activating it opens nothing, sends
  nothing and mounts the reason afresh as an alert. The primary admin's
  controls stay usable, since the pause exempts it, and its own Revoke keeps
  its own reason. The service still refuses: the lock only reflects it.
- **The primary admin's row is marked by a crown** beside the role
  (`primary-admin-mark.tsx`), a button named "Primary Admin" with a tip
  saying so, as InfoTip's ⓘ is a button with its tip, and through the same
  `useTip`: opened by hover, focus or a tap, kept open while the pointer is on
  it, closed on Escape (on the owner's call, in place of an outlined tag). Its
  Revoke stays in view but is `aria-disabled` rather than `disabled`, so it
  keeps its place in the tab order and a click still lands. The reason is in a
  tip on the button, opening as the crown's does: the service's own refusal in
  the same words (`PRIMARY_ADMIN_REFUSAL`, `src/lib/primary-admin.ts`, one
  string for both), "This is the primary admin and can't be removed. Changing
  who the primary admin is takes a change to the site's configuration." It
  names no variable; how to change it is the docs'. The button is described by
  it, and activating it opens nothing and sends nothing but opens the tip and
  mounts it afresh as an alert, so a screen reader hears it each time, rather
  than doing nothing.

## Styling

Layout only, until the admin area's design review (MB.115). Its cells are centred on the row rather than on the text's baseline, the
primitive's rule, since its rows mix text with logo circles, marks and
buttons whose baselines sit at different heights, and the signup date never
breaks at its hyphens (the owner's review). The filter is a
wrapping row of the field, the checkbox and the button. The creation cell is
a wrapping row of the mark and the control, and the role cell a wrapping row
of the role, with the primary admin's crown in `$text-muted` beside it, on the
left and the control on the right, centred on one line (MB.59, on the owner's
call). Both of the role cell's tips, the crown's and the locked Revoke's, are
the `tip-bubble` mixin's, above their mark from its left edge, as InfoTip's.
The confirmation is the
`Modal`'s own layout, its buttons in `.modal__actions`, all built on the
`.field`, `.input`, `.checkbox` and `.btn` primitives. The table is the
`.data-table` primitive, filling the layout's width and scrolling inside its
`.data-table-frame` on a narrow screen rather than widening the page: its rows
are banded and its header carries a hairline, as every admin list's does, and its pager is the shared `.pager` primitive: Prev and Next, centred ([`styling.md`](../styling.md), "Buttons"). Tokens: `space()`, `$text-muted` and `$surface-card`.

## Stories

[`index.stories.tsx`](../../src/components/UserList/index.stories.tsx) —
`Default`, `Filtered`, `NoMatch`, `WithImpersonation`, `UnverifiedApproval`,
`AdminRoles`, `AdminChangesPaused` and `AdminChangesNotPrimary`,
inside the admin layout's frame, each name led by its permissions history
icon, whose tip shows on hover or focus; the list holds an admin, a user awaiting
approval and an approved user, so each control shows. `UnverifiedApproval`
holds two users awaiting approval, one unverified and one verified, so the
first's Approve opens the warning (MB.205) and the second's does not.
`AdminRoles` holds the primary admin, its Revoke unusable with the reason
beside it, a second admin whose Revoke opens its modal, and users whose Grant
opens theirs, Bo's with the warning (MB.59). `AdminChangesPaused` shows
the switch paused with the primary admin's Resume, and
`AdminChangesNotPrimary` the switch on, unusable, with its reason (MB.63). In the workshop neither Impersonate nor Approve or Revoke reaches a
server, so a click shows the refusal.
Render-only, no test ids, no snapshots.

## Testing

`tests/components/UserList/index.test.tsx` covers the Filter button's
disabled and enabled states, the bare `awaiting` it opens, the Role select
and the `role` it opens, the column headers, each
row's cells, the `<time>`, a provider outside the roster, the empty list, the
form's action, method, names and kept values, the pager's links, and the
history link before every name, its tip on hover, focus, Escape and blur,
the Impersonate column: absent when off, on non-admin rows only, the call and
the landing, and the refusal; the yes-or-no marks and their words; and the creation cell: Approve on rows awaiting
approval, Revoke on approved ones and nothing on an admin's, each modal
and its focus, Cancel sending nothing, each call and its busy state until the
refresh, and the refusal; and the unverified warning: in Approve's modal and
describing its Approve for an unverified user, which still approves, and
absent for a verified one and from Revoke; and the role cell (MB.59): Grant
on a user's row and Revoke on an admin's, each modal, the reason sent
trimmed or not at all, Cancel sending nothing, Grant's warning for an
unverified user, the refusal in the row, the fresh control after the
refresh, and the primary admin's tag and its `aria-disabled` Revoke, described
by the reason and stating it as an alert each time it is tried, sending
nothing; and the switch on admin changes (MB.63): none inside the list, no sentence
while on and the warning while paused, Pause and Resume big and red, busy
until the refresh, a refusal beside it, and another admin's locked switch,
its reason a tip and an alert when tried; and while paused, every Grant and
Revoke locked for another admin with the pause's reason, none for the
primary admin or while changes are on, and the primary admin's Revoke kept on
its own reason. `tests/app/admin/users/page.test.tsx` finds the switch in
the heading's `.page-header`. `tests/e2e/admin.spec.ts` approves
and revokes a user against the built server, approves an unverified one
through the warning, grants admin with a reason and revokes it, and tries
the primary admin's Revoke, with axe over each open modal.
`tests/app/admin/users/page.test.tsx` covers what the page hands it, the
impersonation gate and the primary admin's flag included, and `awaiting` read by its presence.
