# Admin Invitations

`src/components/AdminInvitations/` — the People page's Invitations tab,
`/admin/invitations` (MB.70; a section beneath the user list until MB.115
gave it a tab of its own): **Invite Admin**, and the pending invitations, each
with its address, its reason, when it expires and **Revoke**. Render-only: the
page reads the list through `listPendingAdminInvitations` and whether this
admin is held by the pause (`invitations/lock.ts`), and hands both down. The rules are
[`auth/admin-users.md`](../auth/admin-users.md), "Inviting an admin".

## Contracts

- **A region named "Admin Invitations", with no heading of its own.** The
  page's `h1`, People, and its open tab already say what it holds
  ([`tabbed-page.md`](tabbed-page.md)). The name keeps the sent
  confirmation and the rows findable as one.
- **Invite Admin is the tab's action, beside the page's heading** (MB.115,
  on the owner's call), exported as `InviteAdmin` and drawn by
  `src/app/admin/(people)/@action/invitations/page.tsx`. The heading line
  and the list are rendered apart, so the button can no longer hold the
  form's state: Invite Admin is a link to `/admin/invitations?invite`
  (`href.ts`), and the page opens the form over the list by that address,
  as a value page's `?new` opens its own. While locked it is the locked
  control instead, and `?invite` opens nothing.
- **Props.** `invitations`, newest first, each `{ id, email, note, expiresAt }`;
  `locked`, the pause's reason (`ADMIN_CHANGES_PAUSED_REFUSAL`) while
  admin changes are paused and this admin is not the primary one, absent
  otherwise; and `inviting`, whether the address is `?invite`. The page
  sets `locked` from `adminRoleChangePauseState`, paused and not
  `canToggle`, and `inviting` only while not locked. `InviteAdmin` takes
  `locked` alone.
- **The user list's own parts.** Revoke asks first through
  `UserList/confirmed-action.tsx`'s `ConfirmedAction`, in a modal titled
  "Revoke Invitation": "Revoke the invitation to <address>? Its link will say
  it was revoked." A locked control is `UserList/locked-control.tsx`'s `LockedControl`:
  `aria-disabled` with the reason in a tip and said again as an alert on a
  click. Each brings its own rules (`UserList/controls.scss`), so the section
  stands on its own in the workshop without the list's stylesheet (MB.115).
- **The invite form** (`invite-form.tsx`) is a `RouteModal` titled
  "Invite Admin", the link's own name ([`modal.md`](modal.md)), with the **Email Address**, required and marked
  with the shared red asterisk, and a **Reason**, labelled plainly: a field
  is optional unless it carries the required mark, so no label says
  "(Optional)". What it is for, "Kept with the invitation, and in the record
  of who changed what once it is accepted.", is its hint, behind an
  `InfoTip` beside the label (MB.115, on the owner's call), and it is spaced
  as the user list's confirmation spaces its own; both are the shared field shell around their
  input ([`field.md`](field.md)). **Send Invitation** stays disabled until
  there is an address, and is a `BusyButton` ([`busy-button.md`](busy-button.md)),
  a spinner and "Sending" while the request is out; Cancel is quiet and
  closes back to the tab. With anything typed in either field, Cancel asks
  first, "You have unsaved changes. Discard them?", beside Discard Changes,
  which closes, and Keep Editing, which goes back to the form as it was; the
  modal's Close button, Escape and a click outside ask the same (MB.115, the
  owner's call; [`modal.md`](modal.md), "Unsaved changes"). The form is
  `invite-form.tsx`'s `InviteFields`, rendered inside the modal so its
  guard reaches the modal's ways out. A `VALIDATION` refusal on `email`
  is said beside the field; anything else in an alert in the modal. A sent
  invitation closes the modal back to the tab, refreshing it so the re-read
  lists it, and says "Invitation sent to …" above the list. The address is
  this component's state, set by the form before it closes, so the notice
  outlasts `?invite` without the address riding in the URL; opening the
  form again clears it. No link is ever shown: the mutation answers none.
- **No invitation waiting is a sentence**: "No admin invitations are
  waiting."
- **Four columns**: Email, Reason, Expires and Revoke, the headings and each
  cell's `data-label` from one `COLUMNS` list, the table's roles written out
  so it can stack into cards at phone width.
- **The expiry** is `inUtc` (`src/lib/utc.ts`), in a `<time>`: a date and a
  time, since a link lasts seven days to the minute.

## Styling

The table is the `.data-table` primitive with the `--stack` modifier in its
`.data-table-frame` ([`styling.md`](../styling.md), "Tables at phone
width"). At desktop width no cell wraps and the table scrolls in its frame, as
the user list's does (the owner's call during MB.59). Under
`$table-stack-width` of its frame each invitation is a card, its cells
wrapping, each led by its column's name, and Revoke across the card's foot
with no label. Its own stylesheet holds the tab's column, its action
row and the table `space(5)` apart as the tab's content is, the
muted "None given", the Reason field's wrapper (`.admin-invitations__note`,
a step of room above and `space(6)` below) and the sent confirmation's
margin and full line, `.notice.admin-invitations__sent` compounded with its
primitive, which the app scopes as `body .notice`. The section's look is MB.115's,
signed off as it stands.

The sent confirmation and the modal's refusal are `Notice`s
([`notice.md`](notice.md)), the confirmation taking
`admin-invitations__sent` as its `className`. A refused send is read by
`readGraphqlFailure` with `email` as the one field the form draws an error
under, so the address's error goes beside it and any other refusal into the
alert (MB.116).

## Stories

[`index.stories.tsx`](../../src/components/AdminInvitations/index.stories.tsx),
`Admin / Admin Invitations`, inside the admin layout's frame and the People
page with its Invitations tab open and Invite Admin beside the heading:
`Pending`, `NoneWaiting`, `Inviting` (the form open, its Reason's hint in
a tip), `Paused` (both controls locked with the pause's reason), and
`PhoneDark`/`PhoneLight`, Invite Admin across the line beneath the heading
and the invitations as cards at 375px. Invite and Revoke reach the network only when sent, so a send in the workshop
fails into its alert. Render-only, no test ids, no snapshots.

## Tests

`tests/components/AdminInvitations/index.test.tsx` covers the list and the
empty state; Invite Admin a link to `?invite`; sending, with Send disabled
until there is an address, the trimmed variables, the close back to the tab
and its refresh, and the notice outlasting the form; Cancel and Escape
asking once something is typed, Discard Changes closing, and Cancel closing
at once with nothing typed; a refused address beside its field;
Revoke after its confirmation; and both controls locked with the pause's
reason. The cards at phone width are presentation.
`tests/app/admin/(people)/invitations/page.test.tsx` covers the tab's page:
the guard first, the hash never rendered, the form opened by `?invite`,
and the pause locking both controls and opening nothing.
`tests/e2e/admin-invitations.spec.ts` invites, follows the mailed link and
revokes against the built server, with axe.
