# Admin Invitations

`src/components/AdminInvitations/` is the People page's Invitations tab, `/keepers/invitations`: New Invitation, a filter by address and by expiry within 24 hours, a page of the pending invitations the filter leaves (address, site role granted, reason, expiry, Revoke), the pager, and the invite form that `?invite` opens over them. It is render-only. The page reads the filter and the cursor off its address (`invitations/filter.ts`), reads one page of the list and its count through `listPendingAdminInvitations` and `countPendingAdminInvitations`, reads whether this keeper is held by the pause (`invitations/lock.ts`), and hands them down. The rules are in [`auth/admin-users.md`](../auth/admin-users.md), "Inviting a keeper".

## Contracts

- **A region named "Admin Invitations", with no heading of its own.** The page's `h1` and open tab already say what it holds ([`tabbed-page.md`](tabbed-page.md)). The name keeps the sent notice and the rows findable as one.
- **Props that carry a rule.** `locked` is the pause's reason (`ADMIN_CHANGES_PAUSED_REFUSAL`) while keeper changes are paused and this keeper is not the primary one, and absent otherwise. The page sets it from `adminRoleChangePauseState` (paused and not `canToggle`), and sets `inviting` only while not locked. `InviteAdmin` takes `locked` and the `filter` and `cursor` its link keeps.
- **The filter is the shared [`FilterForm`](filter-form.md)**, named "Filter Invitations", inside the list's [`ListFrame`](list-frame.md), as the user list's is (`filter.tsx`).
  - **Email** narrows to addresses holding what is typed, in any case. **Expires in 24 Hrs** narrows to invitations lapsing within the next 24 hours. Both are filtered in the repository's SQL against the database's clock ([`db/invitations.md`](../db/invitations.md)).
  - The address carries them as `?email=fern&expiring`. `expiring` is a bare flag read by its presence, so a native submit's `expiring=` reads the same. `invitationsHref(filter, cursor, invite)` in `href.ts` builds every address the tab links to.
  - Each applies carrying the other and opens the first page ([`filter-form.md`](filter-form.md#contracts)).
- **25 to a page, with the shared [`Pager`](pager.md)**, newest first, as the Users list does (CLAUDE.md rule 8). The ends are plain anchors, for the reason [`pager.md`](pager.md) gives. The page builds the hrefs through `pagerHrefs` in `src/lib/list-href.ts`. A cursor that names no row of this list (one copied from another list) reads the first page, through `readNumberedPage`.
- **New Invitation is the tab's action, beside the page's heading**, exported as `InviteAdmin` and drawn by `src/app/(shell)/keepers/(people)/@action/invitations/page.tsx`. The heading line and the list render apart, so the button cannot hold the form's state. It is a link to `/keepers/invitations?invite` (`href.ts`), and the page opens the form over the list by that address, as a value page's `?new` does.
  - A plain press opens the modal at once through the modal provider ([`modal.md`](modal.md), "Opening at once"). The link stays for a new tab or a press before the script loads.
  - Both keep the filter and the page shown, and the form closes back to the tab at that page.
  - While locked it is the locked control instead, and `?invite` opens nothing.
- **Revoke asks first**, through [`ConfirmedAction`](confirmed-action.md), in a modal titled "Revoke Invitation": "Revoke the invitation to <address>? Its link will say it was withdrawn." A refusal is said in a callout under Revoke, which keeps the focus ([`click-feedback.md`](click-feedback.md)).
- **A locked control** is `UserList/locked-control.tsx`'s `LockedControl`: `aria-disabled` with the reason in a tip, and said again as an alert on a click.
- **The invite form** (`invite-form.tsx`) is a `RouteModal` titled "New Invitation", the link's own name ([`modal.md`](modal.md)). Its fields:
  - **Email Address**, required.
  - **Role**, a `RadioGroupField` ([`field.md`](field.md)) offering Coven Creator (the `user` site role), Curator and Keeper, each with the line Change Role shows beside it (`SITE_ROLE_ACCESS` in `UserList/roles.ts`), except Coven Creator, whose line says it creates covens, since accepting is that approval. Coven Creator is chosen to begin with, so that granting a role is a choice the keeper makes. The form and the list's Role column both name the role through `invitationRoleLabel` in `invite-form.tsx`.
  - **Reason**, the shared `ReasonField`; its hint says the reason is kept with the invitation and in the record of who changed what once accepted.
- **The form's actions.** The row is the shared `FormActions` with its submit renamed ([`field.md`](field.md#form-actions)). Send Invitation stays disabled until there is an address. With anything typed in either field, or Admin chosen, Cancel asks first ([`modal.md`](modal.md#unsaved-changes)). The fields are `InviteFields` in `invite-form.tsx`, rendered inside the modal so the guard reaches the modal's ways out.
- **A refused send.** `readGraphqlFailure` is given `email` as the one field the form draws an error under, so a `VALIDATION` refusal on `email` is said beside the field and any other refusal in a `Notice` alert in the modal ([`notice.md`](notice.md)).
- **A sent invitation** closes the modal back to the tab at the page shown, refreshes it so the re-read lists the invitation on the first page, and says "Invitation sent to …" in a `Notice` above the list (`admin-invitations__sent`). The address is this component's state, set by the form before it closes, so the notice outlasts `?invite` without the address riding in the URL. Opening the form again clears it. No link is ever shown: the mutation answers none.
- **Under a filter the empty state names the filters in use** through `noMatchText` (`src/lib/text.ts`).
- **The table is [`StackTable`](data-table.md)**; Revoke is a `'foot'` action.
- **The expiry** is [`LocalTime`](local-time.md) with `long`, in the viewer's own zone: a date and a time, since a link lasts seven days to the minute.

## Styling

The table is [`StackTable`](data-table.md) ([`styling.md`](../styling.md), "Tables at phone width"). The sent notice's rule is `.notice.admin-invitations__sent`, compounded with its primitive, which the app scopes as `body .notice`.

## Not here

Stories: [`index.stories.tsx`](../../src/components/AdminInvitations/index.stories.tsx). The "Invitation sent" notice and a refusal pathed to the Email field need a server, so no story reaches them.

Tests:

- `tests/components/AdminInvitations/index.test.tsx`
- `tests/app/(shell)/keepers/(people)/invitations/page.test.tsx`
- `tests/modules/identity/services/admin-invitations.test.ts`: the filters' SQL and the paging, including the 24-hour window's edges.
- `tests/e2e/admin-invitations.spec.ts`
