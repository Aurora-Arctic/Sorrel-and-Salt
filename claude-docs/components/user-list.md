# UserList

`src/components/UserList/` draws the filter, table and pager of `/keepers/users`. It is render-only and a server component: the page reads one page of users through the identity service and hands it over with the filter as asked and the hrefs of the pages either side ([`auth/admin-users.md`](../auth/admin-users.md)). The page reads each row's `primaryAdmin` from `isPrimaryAdmin`, and the standing time-outs (`standingTimeoutsOf`, support) and access pauses (`standingAccessPausesOf`, identity) of the whole page in one query each, both under `assertSiteAdmin`.

## Contracts

### Filter

- **The filter is a GET form** inside the shared `FilterForm` ([`filter-form.md`](filter-form.md#contracts)). It has no Filter button: the search applies from its magnifier or Enter, the role and switches the moment they change, each starting from the first page (the form carries no cursor).
- **The switches are bare flags**, read by presence: `userListHref` writes `?query=bo&awaiting`. Before hydration the form submits natively (`awaiting=`, `role=` for All Roles); the page reads these the same, as it does an older `awaiting=1`.
- **No match is a sentence, not an empty table**, naming each filter in use through `noMatchText`, the one wording every admin list uses.

### Table

- **A row is an index into the user's modal.** No row holds a control but Impersonate; Change Role, Approve and Revoke are the modal's ([`user-detail.md`](user-detail.md)).
- **A mark’s hover tip is hidden from assistive technology**, because its hidden word carries it. `Mark` and `ProviderLogo` (`marks.tsx`) are shared with the user's modal so the two cannot drift.
- **Support and Access** are a check while no time-out or pause stands and a red cross while one does. One stands when it is not lifted, not deleted, and has no end or an end still to come (the services' own rule), so a lapsed one reads as a check and nothing is written to end it.
- **`UntilMark`** (shared with the coven members list) reads the viewer's zone through `useLocalTime`, an external store: the server and hydration print UTC, so the renders never mismatch.
- **Every role is a [`RoleTip`](role-tip.md)** whose text is `SITE_ROLE_ACCESS[role]`, the sentence Change Role shows beside that role, so the two never drift.
- **The history link** goes to the privilege ledger searched for the user's lower-cased address ([`privilege-ledger.md`](privilege-ledger.md)). Its tip says less than the link's name, so it describes nothing and is hidden while closed.
- **Each name opens the user's modal.** A plain press runs `useOpenModalClick` and opens it at once; a modified press, or one before the script loads, follows the link ([`modal.md`](modal.md), "Opening at once"). `userListHref` takes the user id as an optional third argument; the pager and filter leave it out, so paging or filtering closes the modal. A fourth, `from`, names a key of `USER_MODAL_ORIGINS` and sends Close back to that tab; a value outside the set is ignored, so the parameter is never an address of the caller's choosing.
- **The user modal is the page's, not the list's** ([`auth.md`, "A site keeper sees which covens a user belongs to"](../design-decisions/auth.md#a-site-keeper-sees-which-covens-a-user-belongs-to)). `UserDialog` (`src/app/(shell)/keepers/(people)/users/user-dialog.tsx`) is a `RouteModal` at one fixed place, headed by `userHeading(user)`, which also builds each row's `heading` so the head shown at once is the one that stays. On `?user=<id>` it reads the user through `usersForAdmin` and their covens through `membershipsOf`, with the navigation and never through GraphQL (CLAUDE.md rule 1). An id that is not a UUID, no live user, or the seed's bootstrap user (`listedOnUserList` leaves it out) is _missing_: `MissingNotice` over the list and no dialog, never an error or a 404.

### Impersonate

- **It is a column only where impersonation is registered** ([`auth/impersonation.md`](../auth/impersonation.md)): the page passes `canImpersonate` from `impersonationEnabled()`, so at production it does not exist. A keeper's row holds no button, because the endpoint refuses to impersonate a keeper. The endpoint is the guard.
- **It asks first** and is the table's one `.btn--destructive` control, since it acts as someone else. It stays busy until the site opens as the user (a full load of `/`, since the session cookie swapped). Better Auth answers a refusal rather than throwing it, so `sendImpersonation` throws it. The question and send are shared with the user modal's action.
- **Layers** (`_layers.scss`): tips sit at `$tip-layer`, one above `$sticky-column-layer`, or a row's later Impersonate cell paints over a tip. A cell holding a refusal callout is lifted to `$tip-layer`, or later rows' sticky cells paint over it.

### Actions that ask first

The creation control, the role control (both in the user modal), Impersonate, the pause switch and the invitations' Revoke share [`ConfirmedAction`](confirmed-action.md), built on `useClickFeedback` ([`click-feedback.md`](click-feedback.md)); each supplies its words and write. The service is the guard.

- The confirm sends the write and stays busy until the page is read again. The control is keyed by its action, so the refreshed modal mounts the other action fresh rather than keeping the busy state. A control that survives the re-read passes `closeOnSent`.
- `announcement` is said in the page's status region once the action has worked, and left out where success leaves the page. `refusal` replaces the service's sentence; `onSent` replaces the refresh (Impersonate passes both).
- A refusal closes the modal and shows the service's sentence (`readGraphqlFailure`) in a floating callout under it. `confirmDisabled` holds the confirm for a choice asked inside the modal (an incomplete answer is held, never refused), such as the members page's Pause while Until a Date has no day.
- **Inside a modal** (`inModal`) the action asks over that modal's body through `ConfirmOverlay`, not a second modal, and focus goes to Cancel, the safe answer. The refusal is a plain `Notice` that `.modal__actions` lifts above a button row, or, with `refusalInModal="callout"`, the callout under the control, for a control beside a fact rather than in a button row (the user modal's `RoleControl` and `CreationControl`).
- **Vouching warning**: when `emailVerified` is false, Approve and Promote show a quiet warning `Notice` (a status, since an alert would be read twice; the confirm is `aria-describedby` it). An approval or grant vouches for whoever holds the address, and its ledger row keeps the account from the sweep of lapsed unverified accounts (MB.67, MB.204). It is a warning, not a refusal: confirming who someone is is left to the keeper (M2.9). Verified users, Revoke and Demote carry none.

### Approve, Revoke, Change Role

- **Approve and Revoke** ("Approving workspace creation" in [`auth/admin-users.md`](../auth/admin-users.md)) are for a `user` only: a curator or keeper holds the flag already (MB.177).
- **Change Role** ("Changing a site role" in that doc) offers every role but the one held, the first chosen. The confirm reads Promote when the choice is higher on user < curator < admin and Demote when lower, changing with the choice. Only a promotion vouches for the address, so only it warns.
- **Reason** (the shared [`ReasonField`](field.md)) is labelled plainly "Reason": a field is optional unless it carries the required mark, so no label says "(Optional)". A blank reason is sent as none; the service stores it as the ledger row's note.

### Pause switch

- **The switch on keeper changes is the Users tab's action** ("Pausing keeper changes" in `auth/admin-users.md`). The People page draws it beside its heading from `src/app/(shell)/keepers/(people)/@action/users/page.tsx` ([`tabbed-page.md`](tabbed-page.md)), keyed by the state so the refresh after a flip mounts a fresh one. Both pages read the pause through `src/app/(shell)/keepers/(people)/pause-state.ts`, cached per request.
- For the primary keeper (`canToggle`) Pause asks first ([`auth.md`, "Granting and revoking admin"](../design-decisions/auth.md#granting-and-revoking-admin)); Resume gives back what the pause stopped, so it sends at once. A refusal shows under the pressed button, which keeps focus: Resume is `aria-disabled` while it sends, not `disabled`. Any other keeper is shown no control at all: the page's one sentence about the pause says whether changes are on, and "Keeper changes are paused." while they are paused. Pause and Resume share one look so the control does not change as it flips.

### Locked controls

A control that cannot be used says why: the primary keeper's Change Role, Change Role and Approve or Revoke while keeper changes are paused to a keeper the pause binds.

- It is `aria-disabled`, not `disabled`, so it keeps its place in the tab order and a click lands. Activating it sends nothing; it opens the tip and mounts the reason afresh as an alert, so a screen reader hears it each time.
- The reason is the button's description, in a tip opened by hover, focus or a tap, kept while the pointer is on it, closed on Escape (WCAG 1.4.13), through `useTip`. It is placed fixed against the viewport, not its cell: the table's frame scrolls and would clip it.
- While paused, the user modal's role and creation controls are locked for a keeper who is not the primary keeper. That reading is `changesLocked` (`lock.ts`: paused and not `canToggle`), which the Invitations tab's lock reads too. The primary keeper's own Change Role is locked first, whether or not changes are paused. The reasons are `ADMIN_CHANGES_PAUSED_REFUSAL` and `PRIMARY_ADMIN_REFUSAL` (both `src/lib/primary-admin.ts`, one string for the tip and the service). The pause exempts the primary keeper, so its controls stay usable. The service still refuses: the lock only reflects it.

### The crown

The primary keeper's role carries a crown button named "Primary Keeper" with a tip, as InfoTip's ⓘ is, through the same `useTip`. The tip says no more than the name, so it is hidden from assistive technology while closed.

## Styling

Built from the shared list primitives ([`styling.md`](../styling.md), "Designing a section"). The binding facts:

- **Borders are separate, not collapsed**, so each rule belongs to its own cell; a collapsed rule belongs to the table's grid and the headings' hairline was drawn across the sticky Impersonate heading's red one. Mark columns are centred above the stacking width only, since a card leads each fact with its label.
- **The history link, crown and locked control stay off [`IconTip`](icon-tip.md)**: it puts its word left on a card, where a card's first item, the history icon, would be clipped, and a locked control's reason is a description re-announced as an alert, where IconTip's word is hidden decoration.
- **The Impersonate column** is the shared `row-action-column` mixin (`src/scss/_mixins.scss`), also used by MemberList's Remove column. Its wax tint is 6% into the page and 5% into a banded row's `$surface-card`, since at 6% the dark card leaves the label at 4.48:1, under the text floor (`tests/scss/tokens.test.ts` holds both). It stays sticky down to 80rem, since the columns need about 77rem of frame before they stop scrolling.

## Used by

`/keepers/users`. `ConfirmedAction`, `LockedControl` and `changesLocked` are shared with `AdminInvitations` and the members page. Tests: `tests/components/UserList/`.
