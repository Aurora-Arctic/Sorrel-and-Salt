# Admin Invitations

`src/components/AdminInvitations/` — the People page's Invitations tab,
`/admin/invitations` (MB.70; a section beneath the user list until MB.115
gave it a tab of its own): **Invite Admin**, a filter row, a page of the pending
invitations it leaves, each with its address, its reason, when it expires and
**Revoke**, and the pager beneath them. Render-only: the page reads the
filter and the cursor off its address (`invitations/filter.ts`), one page of
the list and its count through `listPendingAdminInvitations` and
`countPendingAdminInvitations` under them, and whether this admin is held by
the pause (`invitations/lock.ts`), and hands them down. The rules are
[`auth/admin-users.md`](../auth/admin-users.md), "Inviting an admin".

## Contracts

- **A region named "Admin Invitations", with no heading of its own.** The
  page's `h1`, People, and its open tab already say what it holds
  ([`tabbed-page.md`](tabbed-page.md)). The name keeps the sent
  confirmation and the rows findable as one.
- **The filter** (`filter.tsx`, MB.115, on the owner's ask: "search the
  Invitations by email and expires in 24 hrs") is the shared
  [`FilterForm`](filter-form.md), named "Filter Invitations", inside the
  list's [`ListFrame`](list-frame.md), as the user list's is. **Email**, a
  search box, placeholder "Search emails", narrows to the addresses holding
  what is typed, in any case; **Expires in 24 Hrs**, a `SwitchField`, to
  the invitations lapsing within the next 24 hours. Both are filtered in the
  repository's SQL against the database's clock
  ([`db/invitations.md`](../db/invitations.md)). The address carries them
  as `?email=fern&expiring`, `expiring` a bare flag read by its presence,
  so a native submit's `expiring=` reads the same; `href.ts`'s
  `invitationsHref(filter, cursor, invite)` builds every address the tab
  links to, and its `INVITATIONS_PATH` is the form's action and Clear's. The email applies from its magnifier or
  Enter, the switch the moment it changes, each carrying the other and
  opening the first page, since they name no cursor
  ([`filter-form.md`](filter-form.md#contracts)). Clear, offered only while a filter is
  shown, opens `/admin/invitations`.
- **25 to a page, with the shared [`Pager`](pager.md)** (MB.115, on the
  owner's call: a fixed number per page with a pager, as the Users list has;
  CLAUDE.md rule 8). Newest first, Prev and Next carrying the filter and a
  cursor (`?after=` or `?before=`), with "Page X of Y" between them, as the
  privilege ledger beside it counts its pages. Plain anchors rather than
  soft links, for the reason [`pager.md`](pager.md) gives. The page builds the two hrefs through
  `src/lib/list-href.ts`'s `pagerHrefs`, and a cursor that names no row of this list
  (one copied from another list) reads the first page, through
  `readNumberedPage`. A list of one page shows no pager.
- **Invite Admin is the tab's action, beside the page's heading** (MB.115,
  on the owner's call), exported as `InviteAdmin` and drawn by
  `src/app/(shell)/admin/(people)/@action/invitations/page.tsx`. The heading line
  and the list are rendered apart, so the button can no longer hold the
  form's state: Invite Admin is a link to `/admin/invitations?invite`
  (`href.ts`), and the page opens the form over the list by that address,
  as a value page's `?new` opens its own. A plain press opens the modal at
  once instead (M9.18; [`modal.md`](modal.md), "Opening at once"): `InviteAdmin`
  goes through the modal provider, and the link stays for a new tab or a press
  before the script loads. `InviteForm` takes `open: boolean` and is rendered always. Both keep the filter and the page shown: the action's page reads them
  off the address as the tab's does, so the link is
  `?email=fern&expiring&after=…&invite`, and the form closes back to the
  tab at that page, as a value page's Add does. While locked it is the locked control instead, and `?invite`
  opens nothing.
- **Props.** `invitations`, this page, newest first, each `{ id, email, note, expiresAt }`;
  `filter`, the filter shown, `{ email, expiringSoon }`, none when left out;
  `cursor`, the page shown, `{ after?, before? }`, the first when left out;
  `previousHref` and `nextHref`, the pager's ends, each absent where there
  is no page; `position`, the pager's `{ page, pages }`;
  `locked`, the pause's reason (`ADMIN_CHANGES_PAUSED_REFUSAL`) while
  admin changes are paused and this admin is not the primary one, absent
  otherwise; and `inviting`, whether the address is `?invite`. The page
  sets `locked` from `adminRoleChangePauseState`, paused and not
  `canToggle`, and `inviting` only while not locked. `InviteAdmin` takes
  `locked`, and the `filter` and `cursor` its link keeps.
- **The user list's own parts.** Revoke asks first through
  `UserList/confirmed-action.tsx`'s `ConfirmedAction`, in a modal titled
  "Revoke Invitation": "Revoke the invitation to <address>? Its link will say
  it was withdrawn." A locked control is `UserList/locked-control.tsx`'s `LockedControl`:
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
  a spinner and "Sending" while the request is out; Cancel is quiet, waits
  while the request is out, and closes back to the tab. The row is the
  shared `FormActions`, its submit renamed ([`field.md`](field.md#formactions); MB.119). With anything typed in either field, Cancel asks
  first (MB.115, the owner's call; [`modal.md`](modal.md#unsaved-changes));
  Discard Changes closes. The form is
  `invite-form.tsx`'s `InviteFields`, rendered inside the modal so its
  guard reaches the modal's ways out. A `VALIDATION` refusal on `email`
  is said beside the field; anything else in an alert in the modal. A sent
  invitation closes the modal back to the tab at the page shown, refreshing
  it so the re-read lists it on the first page, and says "Invitation sent to …" above the list. The address is
  this component's state, set by the form before it closes, so the notice
  outlasts `?invite` without the address riding in the URL; opening the
  form again clears it. No link is ever shown: the mutation answers none.
- **No invitation waiting is a sentence**: "No admin invitations are
  waiting." Under a filter it names the filters in use, as the user list's
  and the compendium's do, through the one wording `noMatchText`
  (`src/lib/text.ts`): "No invitations match “fern” and Expires in 24 Hrs.
  Change or clear the filter to see more."
- **Four columns**: Email, Reason, Expires and Revoke, drawn by
  [`StackTable`](data-table.md), which gives each cell its heading as its
  card label and writes the table's roles out so it can stack into cards at
  phone width. Revoke is a `'foot'` action, across the card's foot.
- **The expiry** is `inUtc` (`src/lib/utc.ts`), in a `<time>`: a date and a
  time, since a link lasts seven days to the minute.

## Styling

The table is [`StackTable`](data-table.md): the `.data-table` primitive with
the `--stack` modifier in its `.data-table-frame` ([`styling.md`](../styling.md),
"Tables at phone width"). At desktop width no cell wraps and the table
scrolls in its frame, as the user list's does (the owner's call during
MB.59), through the `data-table--nowrap` modifier; its own stylesheet only
centres each cell on its row. Under
`$table-stack-width` of its frame each invitation is a card, its cells
wrapping, each led by its column's name, and Revoke across the card's foot
with no label. The filter row is the `.filter-row` primitive, which stacks at phone
width: the Email box across the line, the switch, and Clear
beneath it ([`filter-form.md`](filter-form.md), "Styling"). Its own stylesheet holds the tab's column, the sent
notice and the list's frame `space(5)` apart as the tab's content is, the
muted "None given", and the sent confirmation's
margin and full line, `.notice.admin-invitations__sent` compounded with its
primitive, which the app scopes as `body .notice`. The Reason field, the
shared [`ReasonField`](field.md), takes the user list's `.user-list__note` (`UserList/controls.scss`: a step of room
above and `space(6)` below), as the user list's reason does. The section's look is MB.115's,
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
`Pending`, `NoneWaiting`, `Filtered` (an Email and Expires in 24 Hrs
applied, Clear offered, one invitation left), `NoMatch` (the
empty state naming the filter), `OnePageOfSeveral` (a middle page of 25,
both pager ends live and "Page 2 of 3" between them) with its phone pair
`OnePageOfSeveralPhoneDark`/`OnePageOfSeveralPhoneLight`, where the pager's
row wraps Next beneath Prev and the position, `Inviting` (the form open, its Reason's
hint in a tip), `Paused` (both controls locked with the pause's reason),
`PhoneDark`/`PhoneLight`, Invite Admin across the line beneath the
heading, the filter row stacked and the invitations as cards at 375px, and
`FilteredPhoneDark`/`FilteredPhoneLight`, the filter applied at 375px. Invite and Revoke reach the network only when sent, so a send in the workshop
fails into its alert. Render-only, no test ids, no snapshots.

## Tests

`tests/components/AdminInvitations/index.test.tsx` covers the list and the
empty state; Invite Admin a link to `?invite`; sending, with Send disabled
until there is an address, the trimmed variables, the close back to the tab
and its refresh, and the notice outlasting the form; Cancel and Escape
asking once something is typed, Discard Changes closing, and Cancel closing
at once with nothing typed; a refused address beside its field;
Revoke after its confirmation; both controls locked with the pause's
reason; and the filter: the address a change or the magnifier opens, from the first
page whatever page is shown, the email trimmed and the switch a bare flag,
which values offer Clear, the row starting again from a filter shown anew, and Invite Admin and
the form's close keeping the filter and the page. The cards at phone width are presentation.
`tests/app/(shell)/admin/(people)/invitations/page.test.tsx` covers the tab's page:
the guard first, the hash never rendered, the filter read off the address
and handed to the service, the first page of 25 and its count, `after` and
`before` read off the address, a cursor of another list reading the first
page, the pager's ends carrying the filter with "Page X of Y" between them,
Invite Admin keeping the page, the form opened by `?invite`,
and the pause locking both controls and opening nothing.
The filters' SQL and the paging are `tests/modules/identity/services/admin-invitations.test.ts`'s:
a fragment in any case, the 24-hour window's edges against expired,
accepted and revoked rows, a page newest first with an instant's rows by id
and the next cursor reading the rest, the filter narrowing every page, and
the count. `tests/e2e/admin-invitations.spec.ts` invites, follows the mailed link and
revokes against the built server, with axe.
