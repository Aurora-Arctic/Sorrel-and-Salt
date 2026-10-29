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
| `position`         | Where this page stands, `{ page, pages }`, the pager's "Page X of Y" (MB.115)      |
| `canImpersonate`   | Whether impersonation is registered here (MB.53); off by default                   |
| `adminChanges`     | `{ paused, canToggle }`, the pause on admin changes (MB.63); no switch when absent |

A `UserListEntry` is the user row's name, email, role, `canCreateWorkspace`,
`createdAt` and `emailVerified`, plus `providers`, the provider ids the service
read beside it, and `primaryAdmin`, which the page asks of the identity
service's `isPrimaryAdmin` for each row as it reads it (MB.59). Since M9.19
it also carries `openHref`, this page with the user's modal open over it
(`?user=<id>`, the filter and cursor kept), and `heading`, that modal's
head, both built by the page per row, as the other admin lists carry
`editHref` and `editHeading` ("The user modal is the page's" under [Contracts](#contracts)).

## Contracts

- **The filter is a GET form to `/admin/users`** (`USERS_PATH`, `href.ts`), named "Filter Users" inside
  a `<search>` landmark: a search box labelled "Name or Email" (`query`), a
  Role dropdown, a native select from the server and the select-only box once
  hydrated (`role`: All Roles, then `ROLE_LABELS`: Admin, Curator or User;
  a `FilterSelectField`, [`field.md`](field.md)), a "Needs Approval"
  switch (`awaiting`), each label in title case on the owner's call, and no
  Filter button (MB.115). The switch is `SwitchField`, a slide toggle with its label
  above as the other fields have, over a native checkbox; it was a checkbox
  until the owner found it out of place in the row, and the compendium's
  No Refs changed with it, so the filters match (MB.115;
  [`field.md`](field.md)). All Roles submits natively as `role=`, which the page reads
  as no role. A
  filtered page is an address, and filtering starts again from the first page,
  since the form carries no cursor. It is `filter.tsx`, a client file: the
  search text, held in state, inside the shared `FilterForm`
  ([`filter-form.md`](filter-form.md)). The search applies from its
  magnifier or Enter; the Role dropdown and the switch apply the moment
  they change, each carrying the search text and starting from the first page.
  Its Clear link, offered only while the page shows a query, a role or
  Needs Approval, opens `/admin/users` with none. How every filter navigates
  and loads is [`filter-form.md`](filter-form.md#contracts).
- **A new filter applies without a button** (MB.115, replacing MB.53's Filter
  button, disabled until something differed): the search’s magnifier is
  always live, and the role and the switch send on change.
- **`awaiting` is a bare flag**, read by its presence (MB.53, on the owner's
  word). A submit builds the address itself with `href.ts`'s `userListHref`,
  a thin typed wrapper over the shared `listHref` (`src/lib/list-href.ts`),
  the pager's builder too, so it reads `?query=bo&awaiting` rather than
  `awaiting=1`, and opens it softly. Before
  hydration the form submits natively, with the switch as `awaiting=`, which
  the page reads the same, as it does an older link's `awaiting=1`.
- **Six columns, in the owner's order**: Name, Email, Role, Coven Creation,
  Sign-In Methods and Signed Up, each heading in title case (DESIGN.md §9).
  The table is [`StackTable`](data-table.md), so each heading is also the
  `data-label` its cells carry as a card at phone width, and the table writes
  out its roles (MB.115, "Tables at phone width" in
  [`styling.md`](../styling.md)). Admin and User are `ROLE_LABELS`
  (`roles.ts`), the one option list the role filter, the Role column and the
  page's reading of `?role` share.
  The two columns with a control, Role and Coven Creation, sit together, and
  the two facts read rather than changed follow them (reordered during MB.59,
  on the owner's call). The Email
  cell leads with whether the address is verified, then the address, so the
  two are one column. Sign-in methods and the verified mark are what an admin changing a role judges a person by (MB.59, M11.20). A yes-or-no is a mark, on the
  owner's call: a green check (`$accent`) or a red cross (`$secondary`), from
  `icons.tsx`, its word beside it in `.visually-hidden` since the mark is
  drawn alone, and the icon `aria-hidden`. The email's says Verified or
  Unverified, and on hover in a tip bubble too (`tip-bubble`, the form tips'
  look, opened by `tip-bubble-open`), so the eye learns what it marks: a
  native `title` showed too late to be seen, on the owner's review. The bubble
  is `aria-hidden`, the reader having the hidden word. The creation flag's
  says Yes or No, which its heading asks, and has no bubble.
  An admin's or a curator's role is bold, on the owner's call. The signup is the UTC
  date, in a `<time>` carrying the full instant. A provider shows as its
  logo, on the owner's call: the shared provider mark, `ProviderMark`
  ([`provider-mark.md`](provider-mark.md)), which draws the sign-in page's own
  mark on a small circle of its brand's ground. Google's and Microsoft's are
  white, edged in their brand's grey, and Discord's blurple. Facebook's is its
  own blue circle with a white "f", its standard mark in either theme, on the
  owner's call (MB.63); the sign-in button's white "f" on a blue chip suits
  only its blue button. The colours come from the brand map, `$brand-palettes`
  (MB.116), which the sign-in buttons read too; until then this list kept its
  own copy of the hexes, and Google's and Microsoft's edge, `#dadce0`, all but
  vanished on the light page. Each is named by its `SOCIAL_PROVIDERS` label in hidden text and
  in the same tip bubble on hover as the email's mark (`.user-list__hint`). A
  provider the roster no longer has keeps its id as text, so an account linked
  by one since removed still says so; an account with none has an empty cell.
- **No match is a sentence, not an empty table**, naming the filters in use
  and then what to do (MB.115, on the owner's call): "No users match
  “ada”, the role Admin and Needs Approval. Change or clear the filter to see
  more.", each filter named only when it is set, through `noMatchText`
  (`src/lib/text.ts`), the one wording every admin list uses. With none set,
  it says there are no users yet.
- **The pager is `Pager`** ([`pager.md`](pager.md)), with plain anchors:
  Prev and Next, an end with no page disabled, "Page X of Y" between them
  from `position`, which the page counts as every admin list does (MB.115),
  and nothing at all on a list of one page. A plain anchor is a full load, so the page's guard runs again, as with
  `AdminNav`.
- **A history icon leads each name** (MB.200, on the owner's call: an
  icon rather than a column), on every row, an admin's included: a link to
  `/admin/privilege-changes?query=<email>`, the privilege ledger searched for
  that user's address, lower-cased as every address is held, built by `PrivilegeLedger`'s `privilegeLedgerHref`
  ([`privilege-ledger.md`](privilege-ledger.md)). It is `history-link.tsx`,
  a client file, and `icons.tsx`'s `HistoryIcon`, a clock with a
  counter-clockwise arrow in `currentColor`, `aria-hidden`. The link is
  named "Privilege changes for <name>", and a tip reading Privilege Changes,
  the ledger's one name everywhere (MB.115), shows above it on
  hover, focus or a tap, stays while the pointer is on it, and closes on
  Escape, blur or the pointer leaving: InfoTip's behaviour, through the same
  `useTip` ([`info-tip.md`](info-tip.md)), the tip `role="tooltip"` and
  `aria-hidden` while closed. The icon is 1.5rem, WCAG 2.2's 24px minimum, in
  the muted ink, and its hit area reaches `$control-height`, WCAG 2.5.5's
  44px, through a pseudo-element, so the row is no taller for it; its focus
  ring is the `focus-ring` mixin's.
- **Each name opens the user's modal** (M9.19,
  [`design-decisions/m9.19-admin-sees-user-covens.md`](../design-decisions/m9.19-admin-sees-user-covens.md)).
  The name, after the history icon, is a link to the row's `openHref`,
  `/admin/users?<filter>&user=<id>`, its accessible name the user's name.
  It is `user-link.tsx`, a client file, so the list stays a server
  component, and its press is `useOpenModalClick(openHref, heading)`: a plain
  press opens the modal at once over a skeleton, a press with a modifier or
  before the script loads follows the link
  ([`modal.md`](modal.md), "Opening at once"). `userListHref` (`href.ts`)
  takes the user's id as an optional third argument, written after the
  cursor; the pager and the filter leave it out, so paging or filtering
  closes the modal, as they drop `?edit=` elsewhere.
- **The user modal is the page's, not the list's.** The page renders
  `UserDialog` (`src/app/(shell)/admin/(people)/users/user-dialog.tsx`), a
  `RouteModal` at one fixed place, whatever the address opens. Its head is
  `userHeading(user)` (`user-heading.tsx` beside the page): eyebrow User,
  the name as title and the address as qualifier, on a line beneath the name, so the dialog is named
  "User, <name>, <email>". The page builds each row's `heading` with the
  same helper, so the head a press shows at once is the one that stays. Its
  body is [`UserDetail`](user-detail.md): the row's facts, shown read-only, then the user's covens and, where
  impersonation is registered, Impersonate. On `?user=<id>` the page reads
  the user through `usersForAdmin` and their covens through the coven
  service's `membershipsOf`, with the navigation and never through GraphQL
  (CLAUDE.md rule 1). An id that is not a UUID, no live user, or the seed's
  bootstrap user (live, but `listedOnUserList` leaves it out) is _missing_:
  `MissingNotice` over the list and no dialog, never an error or a 404, as
  a stale `?edit=` is on the other admin lists. Closing returns to
  `userListHref(filter, cursor)`, the list as it stood, with no `?user=`.
- **Impersonate is a seventh column, only where impersonation is registered**
  (MB.53, [`auth/impersonation.md`](../auth/impersonation.md)). The page
  passes `canImpersonate` from `impersonationEnabled()`, so at production the
  column does not exist. Each non-admin row holds an Impersonate button named
  "Impersonate <name>", from `impersonate-button.tsx`, a client file. An admin's row holds none, because the endpoint refuses to
  impersonate an admin. It asks first, as every other row action does
  (MB.115, on the owner's call): a `ConfirmedAction` (below) whose `Modal` is
  titled "Impersonate User" and says "Impersonate <name>? You will see the
  site as they do, and act as them, until you press Stop Impersonating at the
  top of the page." Its Impersonate, `.btn--destructive` and focused as it
  opens, calls the endpoint and stays busy, a `BusyButton`
  ([`busy-button.md`](busy-button.md)) with the spinner and "Impersonating",
  until the site opens as the user: a success is a full load of `/`. Cancel
  sends nothing and hands focus back to the row's button. A refusal closes
  the modal and says "You couldn't impersonate <name>. Please try again." in
  a callout under Impersonate, which has the focus back, and the page stays.
  The endpoint is the guard: the button only puts it where an admin looks.
  The column, heading and cells, has a red rule down its left, and its
  heading's hairline is red where every other is the muted ink, with a faded
  red tint and red text (kept at MB.115 on the owner's call). It is sticky at the table's right edge, so on a narrow
  frame the other columns scroll beneath it (on the owner's call, during
  MB.59), until the table stacks into cards at phone width, where it sits at the
  card's top right instead (Styling, below), placed by the table primitive's `data-table__card-action` grid. Its ground is therefore opaque: the
  tint mixed into the band it sits on, the page or a banded row's card. Every tip
  in the table sits one layer above it (`$tip-layer`, the column's
  `$sticky-column-layer` plus one): a tip reaches into its own row, whose
  Impersonate cell comes later in the DOM, and at the same layer the cell
  painted over the tip's corner (fixed in MB.63's PR; presentation, so
  no test pins the layers). The table's
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
  owner's call; a curator's or an admin's row has the mark alone, since each holds the flag (MB.177, M11.20): the control shows for a `user` only. Each asks first, in a
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
  fresh one, without the modal, rather than keeping the busy state. Once the
  action has worked, the page's status region says so: "<name> may now
  create covens." or "<name> may no longer create covens.". A refusal closes
  the modal, gives the focus back to the button that opened it, says the
  service's sentence, read by `readGraphqlFailure` (MB.116), in a callout
  under that button ([`click-feedback.md`](click-feedback.md)), and offers the action again. The service is the
  guard.
- **Approving or promoting an unverified address warns first** (MB.205,
  MB.59). When the row's `emailVerified` is false, the Approve modal says,
  under its question, in a quiet warning `Notice`: "Nobody has confirmed this
  email address yet. Approving also keeps the account from lapsing." A promotion's says the same with "Promoting": the
  one sentence is `warning.ts`'s `unverifiedWarning(verb)`, and a grant's
  ledger row keeps the account from the sweep as an approval's does. An
  approval vouches for whoever holds the address, and the vouching keeps the
  account from MB.67's sweep of lapsed unverified accounts (MB.204).
  It is a warning, not a refusal: the modal's Approve still approves, since
  M2.9 leaves confirming who someone is to the admin. The modal's Approve is
  `aria-describedby` the warning, so a screen reader reads it as the focus
  lands there on opening. It is quiet, `<Notice kind="warn" quiet>`, so it
  renders as an `<output>`, a status, with the warning's look: an alert would
  be read a second time. The `id` the Approve names is the notice's `id`
  prop, and `.user-list__warning` its layout class. A verified user's Approve or promotion, and every Revoke and demotion, carries none. The control takes `emailVerified` from the row for it.
- **The Role cell holds one Change Role control** (MB.59, M11.20,
  [`auth/admin-users.md`](../auth/admin-users.md), "Changing a site role"),
  from `role-control.tsx`, beside the role it changes: one column
  rather than a second saying the same thing, as Coven Creation holds its
  own. It replaces the Promote and Revoke pair the row had before the curator
  role: every row has one quiet button, named "Change Role for <name>". It
  opens a `Modal` titled "Change Role", with the question "Choose a role for
  <name>." (the name in bold) over a "New Role" radio group of every role but
  the one the user holds, in the order user, curator, admin (`SITE_ROLES`),
  each with a line saying what it allows. The first of those roles is chosen
  when the dialog opens. The confirm reads **Promote** when the chosen role is
  higher on the ladder user < curator < admin than the one held, solid, and
  **Demote** when lower, `.btn--destructive`, changing as the choice does.
  Under the choice is a Reason field, labelled plainly "Reason": a field is
  optional unless it carries the required mark, so no label says "(Optional)".
  What it is for, "Kept with the change in the record of who changed what.",
  is its hint, behind an `InfoTip` beside the label (the shared field shell's
  `hint`, MB.115 on the owner's call), and read with the field. A blank
  reason is sent as none, and the service stores what is sent as the ledger
  row's note. The modal, its focus, Cancel, the busy confirm ("Promoting" or
  "Demoting"), the announcement ("<name> is now <role>.") and a refusal under the button behave as the creation control's: both
  are `confirmed-action.tsx`'s `ConfirmedAction`, each control only its words
  and its write. Impersonate, Pause Admin Changes and the invitations' Revoke
  build one too; Impersonate passes `onSent`, its full load in place of the
  refresh, and `refusal`, its own sentence in place of the service's.
  `ConfirmedAction` is built on `useClickFeedback` (M12.31, [`click-feedback.md`](click-feedback.md)).
  Its `announcement` is the sentence the status region says once the action
  has worked, and is left out where the success leaves the page. Its
  `refusal`, when given, is a sentence in place of the service's. A refusal gives the focus back to the button that opened
  the modal and floats under it, with the badge on the button. With
  `inModal`, where the button already sits in a dialog, the refusal stays in
  that dialog as a plain `Notice` (the owner's call): on its own line above a
  dialog's button row, through the shared `.modal__actions` style. A control
  passing `refusalInModal="callout"` says it in the callout under it even
  there: the user modal's `RoleControl` and `CreationControl`, which stand
  beside a fact rather than in a button row (the owner's exception to
  M12.31's rule 6, 2026-10-20). A
  promotion warns on an unverified address as Approve does, in its own verb
  (above); a demotion does not.
- **The switch on admin changes is the Users tab's action** (MB.63,
  [`auth/admin-users.md`](../auth/admin-users.md), "Pausing admin changes"),
  from `pause-control.tsx`, exported beside the list as `PauseControl`: the
  People page draws it beside its heading while Users is open, where the
  other admin tabs put their primary action, from
  `src/app/(shell)/admin/(people)/@action/users/page.tsx`
  ([`tabbed-page.md`](tabbed-page.md)), and keys it by the state so the
  refresh after a flip mounts a fresh one (all on the owner's call). That
  page and the Users page read the pause through
  `src/app/(shell)/admin/(people)/pause-state.ts`, cached per request, so it is
  read once. It is
  one row, `.user-list__pause`, centred with a `space(3)` gap. At a phone's
  width, where the heading line spans its action, the warning and the switch
  take a line each, the switch across it, locked or not (the `.page-header`
  primitive, and `controls.scss` for a locked control as a page's action). While
  changes are on it shows the button alone; while paused it first says so in
  a quiet warning `Notice`: "Admin changes are paused.", on the owner's
  call. Quiet makes it an `<output>`, a status rather than an alert, because
  it arrives with the page and is read in its order rather than announced.
  It takes `.user-list__pause-state` as its layout class, compounded past the
  `body .notice` primitive, and is the page's one sentence about the pause.
  Then Pause Admin Changes or Resume Admin Changes, both full size and
  `.btn--destructive`, big and red on the owner's call, so the control keeps
  its look as it flips. For the primary admin (`canToggle`), Pause asks
  first, a `ConfirmedAction` whose `Modal` is titled "Pause Admin Changes"
  and says whom it stops: "Pause admin changes? Until you resume them, no other admin can change a role, approve or revoke coven creation, or
  invite an admin." That reverses MB.63's call that pausing needs no
  confirmation, on the owner's call at MB.115's sign-off
  ([`m2.9-granting-admin.md`](../design-decisions/m2.9-granting-admin.md)).
  Resume gives back what the pause stopped, so it sends at once. Either stays
  busy, spinner and "Pausing" or "Resuming", until `router.refresh()`
  re-reads the page, and the status region then says changes are paused or
  resumed. A refusal says why in a callout under the button pressed, which
  keeps the focus: Resume is `aria-disabled` while it sends, not
  `disabled`, so the focus is not lost. For any other admin it is `locked-control.tsx`'s
  `LockedControl`, as the primary admin's Change Role is: in view,
  `aria-disabled`, its reason in a tip, "Only the primary admin can pause or
  resume admin changes.", that describes it and that each try mounts afresh as
  an alert.
- **While paused, an admin the pause binds cannot use Change Role, nor coven creation's Approve or Revoke** (MB.63, on the owner's call; the
  creation controls amended 2026-10-10). The page passes the pause it already read,
  and every row's role and creation control, for a viewer who is not the primary admin
  (`canToggle`), is locked as the primary admin's Change Role is. That reading,
  paused and not the primary admin, is `changesLocked` (`lock.ts`), which the
  Invitations tab's lock reads too. Locked means in view,
  `aria-disabled`, described by the service's own refusal in a tip,
  `ADMIN_CHANGES_PAUSED_REFUSAL` (`src/lib/primary-admin.ts`, one string for
  both): "The primary admin has paused admin changes. Ask them to resume
  changes." Activating it opens nothing, sends
  nothing and mounts the reason afresh as an alert. The primary admin's
  controls stay usable, since the pause exempts it, and its own Change Role keeps its own reason. The service still refuses: the lock only reflects it.
- **The primary admin's row is marked by a crown** beside the role
  (`primary-admin-mark.tsx`), a button named "Primary Admin" with a tip
  saying so, as InfoTip's ⓘ is a button with its tip, and through the same
  `useTip`: opened by hover, focus or a tap, kept open while the pointer is on
  it, closed on Escape (on the owner's call, in place of an outlined tag). Its
  Revoke stays in view but is `aria-disabled` rather than `disabled`, so it
  keeps its place in the tab order and a click still lands. The reason is in a
  tip on the button, opening as the crown's does: the service's own refusal in
  the same words (`PRIMARY_ADMIN_REFUSAL`, `src/lib/primary-admin.ts`, one
  string for both), "You can't revoke the primary admin. The site's
  configuration sets who that is." It names no variable; how to change it is the docs'. The button is described by
  it, and activating it opens nothing and sends nothing but opens the tip and
  mounts it afresh as an alert, so a screen reader hears it each time, rather
  than doing nothing.

## Styling

The list is built from the shared list primitives ([`styling.md`](../styling.md),
"Designing a section"): its root is a `.list-frame`, its filter
`FilterForm`'s `.filter-row`, its table [`StackTable`](data-table.md), a
`.data-table` with the `--stack`, `--roomy` and `--nowrap` modifiers inside
a `.data-table-frame`, and its pager the `.pager`.
Its own stylesheets hold only what is the list's, on the tokens. At desktop
width the seven columns keep their order, restyled at MB.115's sign-off.

- **Cells are centred on the row** rather than on the text's baseline, the
  primitive's rule, since its rows mix text with provider marks, check marks
  and buttons whose baselines sit at different heights; the signup date never
  breaks at its hyphens (the owner's review).
- **At desktop width no cell wraps** (`data-table--nowrap`): the table
  scrolls inside its frame instead (the owner's call, during MB.59), with
  separate borders so each rule
  belongs to its own cell. Its rows are banded and its header carries a
  hairline, as every admin list's does.
- **Above the stacking width** (a container query on the table's frame,
  MB.115 on the owner's call) each row's cells take `space(3)` above and
  below (`data-table--roomy`), a step more than the primitive's, since a row holds buttons as well
  as text, and the two facts no control changes, Sign-In Methods and Signed
  Up (`.user-list__fact`), are `$text-muted` at the caption size, so the eye
  goes to what can be acted on. Every control sits at the end of its cell. A
  card already leads each fact with its muted label, so the cards keep the
  body ink.
- **The marks** are 1.25em, a ratio of the text beside them rather than a
  fixed size. **The history link and the crown** are `$icon-size` boxes,
  WCAG 2.2's 24px target, around a `$glyph-size` icon, in `$text-muted`;
  the history link's hit area reaches `$control-height` through a
  pseudo-element.
- **The tips** are placed by `useTip` (Floating UI: flipped and shifted to stay on screen; a mark's or logo's hover is `Hint`, `hint.tsx`, which uses it with hover only), and drawn by the `tip-bubble` mixin: a mark's or logo's centred
  above it (`.user-list__tip`), the history link's, the crown's and a locked
  control's from its left edge, no wider than `$tip-width` capped at the
  window. Each sits one layer above the sticky column (`_layers.scss`).
  The history link's, the crown's and a locked control's tips stay on
  `useTip` rather than [`IconTip`](icon-tip.md) (MB.115): IconTip centres its
  word above a row's control and puts it to the left on a card, where the
  history icon, a card's first item, would be clipped, so these two sit above
  from their left edge; and a locked control's reason is the button's
  description, re-announced as an alert and placed against the viewport,
  where IconTip's word is decoration hidden from a screen reader.
- **The Impersonate column** is the shared `row-action-column` mixin
  (`src/scss/_mixins.scss`; its pinning and card resets are `sticky-action-column`, which the red layer wraps), which MemberList's Remove column includes too, and has a 1px red rule down its left, red text and
  a wax tint mixed into its opaque ground: 6% into the page, 5% into a banded
  row's `$surface-card`, since at 6% the dark card leaves the wax label at
  4.48:1, under the text floor (`tests/scss/tokens.test.ts` holds both). It
  is sticky at the table's right edge (above). The ground stays with the admin
  column at 80rem, since the seven columns need about 77rem of frame before
  they stop scrolling, so any window narrower than that, above the stacking
  width, still scrolls them beneath it.
- **At phone width each row is a card.** Under `$table-stack-width` (40rem)
  of its frame the primitive turns each row into a card on `$surface-card`,
  every fact led by its column's name from its `data-label`. The list's own
  rule, under the same named container query, lets the cells wrap, sets the
  Impersonate cell back to `position: static`, on the card's own ground, and
  places it at the card's top right beside the name (MB.115, the owner's
  call): the card's grid takes two tracks, the name and Impersonate share the
  first line and every other cell spans both. The grid places it, not the
  markup, so the columns and the keyboard order stay the desktop's. An
  admin's card, with no Impersonate, hides the empty cell.
- **The role and creation cells** each hold the value or mark on the left and
  the control on the right, centred on one line (MB.59, MB.63, on the
  owner's call). **The pause** is a row, `.user-list__pause`, centred with a
  `space(3)` gap.
- **`controls.scss`** holds the rules of the controls that also stand outside
  the table: the confirmation's warning and its Reason field's room (a step
  above, `space(6)` below), and the locked control's and the crown's tips.
  `confirmed-action.tsx`, `locked-control.tsx` and `primary-admin-mark.tsx`
  each import it, so `AdminInvitations`, which uses the first two, takes
  their rules with them rather than the list's whole stylesheet.
- Each provider mark is the `.provider-mark` primitive's circle, held in its
  `.user-list__hint` as a flex box so the circle sets the hint's height. The
  confirmation is the `Modal`'s own layout, its Reason the shared
  [`ReasonField`](field.md).

## Stories

[`index.stories.tsx`](../../src/components/UserList/index.stories.tsx),
`Admin / User List`, every story inside the admin layout's frame (the nav in its
context row above the column) and the People page with its Users tab open:

- **States**, one story with a control that chooses: Without Filters, the page as a signed-in admin who is not the primary one sees it (the site's resting state: Pause Admin Changes dashed and locked, in the app shell); Primary Admin, the same page with a usable Pause Admin Changes and each row's Impersonate opening their
  confirmations; Awaiting Approval And Query; Role Filter; No Matches, with every filter set, so the
  sentence names all three; Without Impersonation, where impersonation is
  not registered; Unverified Approval, Admin Roles, Admin Changes Paused
  and Admin Changes Not Primary, each name led by its privilege changes icon,
  whose tip shows on hover or focus; the list holds an admin, a user awaiting
  approval and an approved user, so each control shows. Unverified Approval
  holds two users awaiting approval, one unverified and one verified, so the
  first's Approve opens the warning (MB.205) and the second's does not.
  Admin Roles holds the primary admin, its Change Role unusable with the reason beside it, a second admin, a curator (bold, with no coven-creation control) and users, each Change Role opening its modal, Bo's with the warning on a promotion (MB.59, M11.20). Admin Changes Paused
  shows the switch paused with the primary admin's Resume, and
  Admin Changes Not Primary the switch on, unusable, with its reason (MB.63).
  Middle Page is a middle page of 25, both pager ends live and
  "Page 2 of 3" between them (MB.115).
- **Phone width**: the toolbar viewport menu shows any story at 375px, every row a card, with Clear offered on the filtered states and the pager on one line beneath the last card on Middle Page.
  In the workshop no confirmation reaches a server, so confirming one shows the
  refusal. Render-only, no test ids, no snapshots.

## Testing

`tests/components/UserList/index.test.tsx` covers each row's name, address,
coven-creation flag and signup date in the order given, the flag's and the
address's marks the one rendering of their state; a provider outside the
roster; no table when no user matches; through the shared filter rows (`tests/support/filter-form.tsx`, [`filter-form.md`](filter-form.md)) the filter form's action, method,
names and kept values, Needs Approval found as a `switch`; no Filter button, the
bare `awaiting` a change of the switch opens, the Role select's values and the `role` a change opens, the search text carried along;
Clear offered by each filter shown and absent with none; the row starting again from a filter shown anew;
the history link before every name and its address; each name a link to its
`openHref`, a plain press calling the opener with the row's href and heading; the Impersonate column:
absent when off, on non-admin rows only, the modal asking first with Cancel
sending nothing, the call and the landing once confirmed, the confirm busy
while pending with a second press sending nothing, and the refusal under the button, with the focus on it and the badge bringing it back; the creation cell: Approve on rows awaiting approval, Revoke on approved ones and nothing on a curator's or an admin's, each modal naming the user and its
focus, Cancel sending nothing, each call with its reason and its busy state
until the refresh, the success said in the status region, and the refusal under the button; the unverified warning
describing Approve for an unverified user, who is still approved, and absent
from Revoke; the role cell (MB.59, M11.20): Change Role on every row, offering every role but the one held, Promote or Demote by the ladder with a demotion styled destructive, the chosen role and the reason sent trimmed or not at all, Cancel sending nothing, the warning on a promotion of an unverified user and on no demotion, the promotion said in the status region, the refusal under the button, and the primary admin's crown and its `aria-disabled` Change Role, described by the
reason and raising an alert each time it is tried, sending nothing; the
switch on admin changes (MB.63): no notice while on and one while paused,
Pause asking first with Cancel sending nothing, Pause's confirm and Resume
busy until the refresh and then said in the status region, a refusal under the button pressed, Resume's included, and another
admin's locked switch, described by its reason and raising an alert when
tried; and, while paused, every Change Role, Approve and coven Revoke locked for another admin and described by the pause, the primary admin's
Approve usable, nothing locked while changes are on, and the primary admin's
Change Role kept on its own reason — which of the two reasons won is told by
which of the two strings describes it. Its colours, marks, tips and their placement, and the cards at phone width,
are presentation; paging is Pager's. `tests/app/(shell)/admin/(people)/users/page.test.tsx` reads the page's
half: what it hands the list, the impersonation gate and the primary admin's
flag included, `awaiting` read by its presence, and the count behind the
pager's position; and the user modal (M9.19): `?user=<id>` reading the user and
their covens as the guard's session into a dialog, each name's link keeping the
filter, and the notice with no dialog, and no read, for an id that is not one,
and the notice for a user the service finds none of or the list leaves out.
`tests/e2e/admin.spec.ts` approves and revokes a user against the built
server, and changes a role through the dialog with a reason, with axe over each open
modal; and, tagged `@story-19`, opens a user's modal from their name, finds
their coven and role in it, no link to the coven and no Impersonate (the run
registers none), axe over it, and Close back to the filtered list, then
`?user=not-an-id` showing the notice and no dialog.

## Notes from code comments: confirmed action

An action that asks first, in a modal, shared by the creation control
, the role control, Impersonate, the pause switch
and the invitations' Revoke: the modal's confirm sends the
write and stays busy until the page is read again, or left; a success
says its `announcement` in the page's status region, for a screen reader,
beside the result the page shows. A refusal closes the modal, gives the
focus back to the button that opened it, and says why in a callout under
that button (`useClickFeedback`), which floats rather
than taking room in a row. Inside a modal already, the user's, it
asks over that modal's body through `ConfirmOverlay` instead, as the
forms' questions do, rather than open a second modal on top, and its
refusal stays in that dialog as a plain notice, or,
for a control beside a fact (the user modal's role and creation
controls), is the same callout under it. The
service is the guard; this only puts it where an admin looks
(claude-docs/components/user-list.md).

## Notes from code comments: locked control

A control that cannot be used, and says why: the primary admin's Change Role,
every Change Role while admin changes are paused to an admin the pause
binds, and the pause switch itself to any admin but the primary one.
`aria-disabled` rather than `disabled`, so it keeps its place in the tab
order and a click still lands, which says why rather than doing nothing. The reason is the button's description, in a tip
that opens on hover, focus and a tap, stays open while the pointer is on it
and closes on Escape (WCAG 1.4.13), through InfoTip's `useTip`. Each
attempt also mounts the tip afresh as an alert, so a screen reader hears the
reason again. The tip is placed against the viewport rather than its cell:
the table's frame scrolls, so it would clip whatever reaches past it, and the
reason is taller than the heading row above the top row; `useTip` places it
fixed, and it follows the button through a scroll.

## Notes from code comments: the filter

The user list's filter, in the shared `FilterForm`. Only the search text is held here, until the magnifier or Enter sends it. The Role dropdown, a select-only box once hydrated (`FilterSelectField`), and the Needs Approval switch start from the filter shown and apply the moment they change, softly and from the first page, carrying the search text along, so there is no Filter button to press. Before hydration the form submits natively: the switch, a native checkbox, as `awaiting=`, which the page reads the same as the bare flag, and the server's native role select, whose "All Roles" is `role=`, which the page reads as no role.

## Notes from code comments: the primary admin mark

The primary admin's mark beside its role: a crown named "Primary Admin", with a tip saying so that behaves as InfoTip's does, through the same `useTip`: opened by hover, focus or a tap, kept open while the pointer is on it, and closed on Escape (WCAG 1.4.13). The mark is a button, as InfoTip's ⓘ is, so the keyboard reaches the tip too. The tip says no more than the button's name, so it is hidden from assistive technology while closed, as InfoTip's is (claude-docs/components/user-list.md).

## Notes from code comments: the user link

A row's name, opening the user's modal over the list, `?user=<id>` . A press opens it at once under `heading`, the user's covens arriving with the navigation; a link still, so a new tab, or a press before the script loads, opens the address. A client file of its own so the list stays a server component.

## Notes from code comments: inside a modal

Drawn inside a modal already, the user's: asks over that modal's body through its confirm layer rather than opening a second modal on top, and says a refusal in a plain notice beside the control, inside that dialog, rather than in a callout over it, unless `refusalInModal` says otherwise.

## Notes from code comments: refusal display

How a refusal is said inside a modal: a plain notice (the default), which a button row lifts above its buttons, or the callout under the control, as outside one. The callout is for a control that stands beside a fact rather than in a button row: the user modal's Change Role and Approve or Revoke. Outside a modal a refusal is always the callout.

## Notes from code comments: the vouching warning

The warning before vouching for an unverified address: an admin's approval or grant vouches for whoever holds it, and the ledger row it writes keeps the account from the sweep of lapsed unverified accounts. A warning rather than a refusal, since confirming who someone is is left to the admin. `verb` is the act's own, "Approving" or "Promoting".

## Notes from code comments: the stylesheet

The user list's own rules: its cells' alignment, the marks and logos with their tips, the history link, the role and creation cells, the sticky Impersonate column and how it gives way when the table stacks into cards, and the pause beside the page's heading. The column, filter, table and pager are primitives (`.list-frame`, `.filter-row`, `.data-table` with `--stack`, `.pager`). Above the stacking width the seven columns keep their order, restyled: rows a step taller, the read-only facts muted at the caption size, every control at the end of its cell.

## Notes from code comments: the table styles

No cell wraps, heading or body, since the table scrolls inside its frame: a row stays one line however narrow the screen, and its rows are a step taller (`.data-table--nowrap` and `--roomy`, through DataTable). Separate borders, not the primitive's collapsed ones, so each rule belongs to its own cell: a collapsed rule belongs to the table's grid, and the headings' muted hairline was drawn across the sticky Impersonate heading's red one as the columns scrolled beneath it.

## Notes from code comments: the hint

A mark or a logo that says what it is in a tip bubble on hover (the provider logos, and the yes-or-no marks whose column heading does not say it). The bubble is the eye's copy, hidden from assistive technology, since the mark carries its word as hidden text. It opens on hover only, as before it was CSS's; it is placed by `useTip` so it stays on the screen, centred over the mark where there is room. It takes no pointer, so it never blocks the row it overlaps (claude-docs/components/user-list.md).

## Notes from code comments: the history link

A row's way into the privilege ledger narrowed to its user: the ledger's search opened with their address, lower-cased as every address is held. An icon before the name, named "Privilege changes for <name>", with a tip reading Privilege Changes, the ledger's one name, that behaves as InfoTip's does, through the same `useTip`: opened by hover, focus or a tap, kept open while the pointer is on it, and closed on Escape (WCAG 1.4.13). The tip says less than the link's name, so it describes nothing, and is hidden from assistive technology while closed, as InfoTip's is (claude-docs/components/user-list.md).
