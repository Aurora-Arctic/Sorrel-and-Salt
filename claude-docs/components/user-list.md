# UserList

`src/components/UserList/` draws the filter, table and pager of `/keepers/users`. It is render-only and a server component: the page reads one page of users through the identity service and hands it over with the filter as asked and the hrefs of the pages either side ([`auth/admin-users.md`](../auth/admin-users.md), "The user list"). Props are in `types.ts`.

The page reads each row's `primaryAdmin` from the identity service's `isPrimaryAdmin`, and the standing time-outs (`standingTimeoutsOf`, support) and access pauses (`standingAccessPausesOf`, identity) of the whole page in one query each, both under `assertSiteAdmin`.

## Contracts

### Filter

- **The filter is a GET form to `/keepers/users`** (`USERS_PATH`), a client file (`filter.tsx`) inside the shared `FilterForm` ([`filter-form.md`](filter-form.md#contracts)), in a `<search>` landmark: a search box, a Role dropdown (a `FilterSelectField`, [`field.md`](field.md)) and three `SwitchField`s, Needs Approval (`awaiting`), Support Timed Out (`timed-out`) and Access Paused (`paused`), each filtering the column beside it. It has no Filter button: the search applies from its magnifier or Enter, the role and switches the moment they change, each starting from the first page (the form carries no cursor). Clear shows only while a filter is set.
- **The switches are bare flags**, read by presence: `userListHref` (`href.ts`, a typed wrapper over the shared `listHref` in `src/lib/list-href.ts`, the pager's builder too) writes `?query=bo&awaiting`. Before hydration the form submits natively (`awaiting=`, `role=` for All Roles); the page reads these the same, as it does an older `awaiting=1`.
- **No match is a sentence, not an empty table**, naming each filter in use through `noMatchText` (`src/lib/text.ts`), the one wording every admin list uses.
- **The pager is `Pager`** ([`pager.md`](pager.md)) with plain anchors, so a page change is a full load and the page's guard runs again.

### Table

- **Columns** are Name, Email, Role, Can Create, Support, Access, Logins, Terms, Signed Up, then Impersonate where registered. The table is [`StackTable`](data-table.md), so each heading is the `data-label` its cells carry as a card at phone width ([`styling.md`](../styling.md), "Tables at phone width"). `ROLE_LABELS` (`roles.ts`) is the one option list the filter, the Role column and the page's reading of `?role` share.
- **A row is an index into the user's modal.** No row holds a control but Impersonate; Change Role, Approve and Revoke are the modal's ([`user-detail.md`](user-detail.md)).
- **A yes-or-no is a mark**: a green check (`$accent`) or a red cross (`$secondary`), the shared `CheckIcon` and `CrossIcon` (`IconTip/icons.tsx`), its word in `.visually-hidden`, the icon `aria-hidden`. A hover tip bubble on a mark is hidden from assistive technology, because the hidden word carries it.
- **Support and Access** are a check while no time-out or pause stands and a red cross while one does. One stands when it is not lifted, not deleted, and has no end or an end still to come (the services' own rule), so a lapsed one reads as a check and nothing is written to end it.
- **`UntilMark`** (`until-mark.tsx`, shared with the coven members list) draws the instant in `longMinuteInZone`, reading the viewer's zone through `useLocalTime`, an external store: the server and hydration print UTC, so the renders never mismatch.
- **Terms** is the joint version of the terms, disclaimer and ethics code last agreed (`formatAgreementVersion`), or a red cross for one who never agreed.
- **Every role is a [`RoleTip`](role-tip.md)** whose text is `SITE_ROLE_ACCESS[role]`, the sentence Change Role shows beside that role, so the two never drift. A keeper's or curator's role is bold.
- **A provider shows as its logo**: the shared `ProviderMark` ([`provider-mark.md`](provider-mark.md)), named by its `SOCIAL_PROVIDERS` label in hidden text and a hover tip (`Hint`, `hint.tsx`). A provider the roster no longer has keeps its id as text.
- **A history icon leads each name**: a link to the privilege ledger searched for the user's lower-cased address (`privilegeLedgerHref`, [`privilege-ledger.md`](privilege-ledger.md)), named "Privilege changes for <name>" (`history-link.tsx`, a client file). Its tip, through `useTip` ([`info-tip.md`](info-tip.md)), says less than the link's name, so it describes nothing and is hidden while closed.
- **Each name opens the user's modal.** It links to the row's `openHref` (`user-link.tsx`, a client file, so the list stays a server component). A plain press runs `useOpenModalClick(openHref, heading)` and opens the modal at once; a modified press, or one before the script loads, follows the link ([`modal.md`](modal.md), "Opening at once"). `userListHref` takes the user id as an optional third argument; the pager and filter leave it out, so paging or filtering closes the modal. A fourth, `from`, names a key of `USER_MODAL_ORIGINS` (`href.ts`) and sends Close back to that tab; a value outside the set is ignored, so the parameter is never an address of the caller's choosing.
- **The user modal is the page's, not the list's** ([`design-decisions/m9.19-admin-sees-user-covens.md`](../design-decisions/m9.19-admin-sees-user-covens.md)). The page renders `UserDialog` (`src/app/(shell)/keepers/(people)/users/user-dialog.tsx`), a `RouteModal` at one fixed place, headed by `userHeading(user)` (`user-heading.tsx`), which also builds each row's `heading` so the head shown at once is the one that stays. On `?user=<id>` it reads the user through `usersForAdmin` and their covens through `membershipsOf`, with the navigation and never through GraphQL (CLAUDE.md rule 1). An id that is not a UUID, no live user, or the seed's bootstrap user (`listedOnUserList` leaves it out) is _missing_: `MissingNotice` over the list and no dialog, never an error or a 404.

### Impersonate

- **It is a column only where impersonation is registered** ([`auth/impersonation.md`](../auth/impersonation.md)): the page passes `canImpersonate` from `impersonationEnabled()`, so at production it does not exist. A keeper's row holds no button, because the endpoint refuses to impersonate a keeper. The endpoint is the guard.
- **It asks first** through a `ConfirmedAction`; its Impersonate is `.btn--destructive` (the one control that acts as someone else), focused on opening, and a `BusyButton` ([`busy-button.md`](busy-button.md)) until the site opens as the user (a full load of `/`). A refusal shows a callout under the row's button.
- **Its column is red and sticky**: a red rule down its left and a faded red tint, pinned to the table's right edge so other columns scroll beneath it, until the card layout at phone width. Its ground is opaque: the tint mixed into the band beneath.
- **Layers** (`_layers.scss`): tips sit at `$tip-layer`, one above `$sticky-column-layer`, or a row's later Impersonate cell paints over a tip. A cell holding a refusal callout is lifted to `$tip-layer` (`.user-list__impersonate:has(.click-feedback__callout)`), or later rows' sticky cells paint over it.
- **Every button in the table is `.btn--small`**, so a row is no taller than its text.

### Actions that ask first

The creation control, the role control (both in the user modal), Impersonate, the pause switch and the invitations' Revoke share `ConfirmedAction` (`confirmed-action.tsx`), built on `useClickFeedback` ([`click-feedback.md`](click-feedback.md)); each supplies its words and write. The service is the guard.

- The confirm sends the write and stays busy until `router.refresh()` re-reads the page. The control is keyed by its action, so the refreshed modal mounts the other action fresh rather than keeping the busy state.
- `announcement` is said in the page's status region once the action has worked, and left out where success leaves the page. `refusal` replaces the service's sentence; `onSent` replaces the refresh (Impersonate passes both).
- A refusal closes the modal, returns focus to the opening button, and shows the service's sentence (`readGraphqlFailure`) in a floating callout under it. `disabled` holds the opening button; `confirmDisabled` holds the confirm for a choice asked inside the modal (an incomplete answer is held, never refused), such as the members page's Pause while Until a Date has no day.
- **Inside a modal** (`inModal`) the action asks over that modal's body through `ConfirmOverlay`, not a second modal. The refusal is a plain `Notice` that `.modal__actions` lifts above a button row, or, with `refusalInModal="callout"`, the callout under the control, for a control beside a fact rather than in a button row (the user modal's `RoleControl` and `CreationControl`).
- **Vouching warning**: when `emailVerified` is false, Approve and Promote show a quiet warning `Notice` (an `<output>`, since an alert would be read twice), `unverifiedWarning(verb)` in `warning.ts`. An approval or grant vouches for whoever holds the address, and its ledger row keeps the account from the sweep of lapsed unverified accounts (MB.67, MB.204). It is a warning, not a refusal: confirming who someone is is left to the keeper (M2.9). The confirm is `aria-describedby` the notice (`.user-list__warning`). Verified users, Revoke and Demote carry none.

### Approve, Revoke, Change Role

- **Approve and Revoke** (`creation-control.tsx`; "Approving workspace creation" in [`auth/admin-users.md`](../auth/admin-users.md)) are quiet buttons beside the Can Create fact, for a `user` only: a curator or keeper holds the flag already (MB.177). The confirm is `.btn--solid` for Approve and `.btn--destructive` for Revoke.
- **Change Role** (`role-control.tsx`; "Changing a site role" in that doc) offers every role but the one held, in `SITE_ROLES` order, the first chosen. The confirm reads Promote (solid) when the choice is higher on user < curator < admin and Demote (`.btn--destructive`) when lower, changing with the choice.
- **Reason** (the shared [`ReasonField`](field.md)) is labelled plainly "Reason": a field is optional unless it carries the required mark, so no label says "(Optional)". Its hint sits behind an `InfoTip`. A blank reason is sent as none; the service stores it as the ledger row's note.

### Pause switch

- **The switch on keeper changes is the Users tab's action** (`pause-control.tsx`, `PauseControl`; "Pausing keeper changes" in `auth/admin-users.md`). The People page draws it beside its heading from `src/app/(shell)/keepers/(people)/@action/users/page.tsx` ([`tabbed-page.md`](tabbed-page.md)), keyed by the state so the refresh after a flip mounts a fresh one. Both pages read the pause through `src/app/(shell)/keepers/(people)/pause-state.ts`, cached per request.
- It is one row, `.user-list__pause`, with a `space(3)` gap; at phone width the notice and the switch take a line each, the switch across it, locked or not (`.page-header`, `controls.scss`). While paused a quiet warning `Notice` (`.user-list__pause-state`, compounded past `body .notice`) is the page's one sentence about the pause.
- Pause and Resume Keeper Changes are both full size and `.btn--destructive`, so the control keeps its look as it flips. For the primary keeper (`canToggle`) Pause asks first ([`design-decisions/m2.9-granting-admin.md`](../design-decisions/m2.9-granting-admin.md)); Resume gives back what the pause stopped, so it sends at once. A refusal shows under the pressed button, which keeps focus: Resume is `aria-disabled` while it sends, not `disabled`. Any other keeper gets a `LockedControl`.

### Locked controls

A control that cannot be used says why: the primary keeper's Change Role, Change Role and Approve or Revoke while keeper changes are paused to a keeper the pause binds, and the pause switch for any keeper but the primary one.

- It is `aria-disabled`, not `disabled`, so it keeps its place in the tab order and a click lands. Activating it sends nothing; it opens the tip and mounts the reason afresh as an alert, so a screen reader hears it each time.
- The reason is the button's description, in a tip (`locked-control.tsx`) opened by hover, focus or a tap, kept while the pointer is on it, closed on Escape (WCAG 1.4.13), through `useTip`. It is placed fixed against the viewport, not its cell: the table's frame scrolls and would clip it.
- While paused, the user modal's role and creation controls are locked for a keeper who is not the primary keeper (`canToggle`). That reading is `changesLocked` (`lock.ts`), which the Invitations tab's lock reads too. The reason is `ADMIN_CHANGES_PAUSED_REFUSAL` and the primary keeper's own Change Role is `PRIMARY_ADMIN_REFUSAL` (both `src/lib/primary-admin.ts`, one string for the tip and the service). The pause exempts the primary keeper, so its controls stay usable. The service still refuses: the lock only reflects it.

### The crown

The primary keeper's row carries a crown beside the role (`primary-admin-mark.tsx`): a button named "Primary Keeper" with a tip, as InfoTip's ⓘ is, through the same `useTip`. The tip says no more than the name, so it is hidden from assistive technology while closed.

## Styling

Built from the shared list primitives ([`styling.md`](../styling.md), "Designing a section"): `.list-frame`, `.filter-row`, [`StackTable`](data-table.md) (`--stack`, `--roomy`, `--nowrap`) and `.pager`. The list's own stylesheets hold only what is its own; the binding facts:

- **No cell wraps at desktop width** (`data-table--nowrap`): the table scrolls in its frame. Borders are separate, not collapsed, so each rule belongs to its own cell; a collapsed rule belongs to the table's grid and the headings' hairline was drawn across the sticky Impersonate heading's red one. Mark columns are centred above the stacking width only, since a card leads each fact with its label.
- **The history link and the crown** are `$icon-size` boxes (24px, WCAG 2.2); the history link's hit area reaches `$control-height` (44px, WCAG 2.5.5) through a pseudo-element, so the row is no taller.
- **Tips** use `useTip` and the `tip-bubble` mixin. The history link, crown and locked control stay off [`IconTip`](icon-tip.md): it puts its word left on a card, where a card's first item, the history icon, would be clipped, and a locked control's reason is a description re-announced as an alert, where IconTip's word is hidden decoration.
- **The Impersonate column** is the shared `row-action-column` mixin (`src/scss/_mixins.scss`), also used by MemberList's Remove column. Its wax tint is 6% into the page and 5% into a banded row's `$surface-card`, since at 6% the dark card leaves the label at 4.48:1, under the text floor (`tests/scss/tokens.test.ts` holds both). It stays sticky down to 80rem, since the columns need about 77rem of frame before they stop scrolling.
- **At phone width each row is a card** (under `$table-stack-width`, 40rem). The list's rule lets cells wrap, sets the Impersonate cell to `position: static`, and places it at the card's top right through the grid (two tracks; the name and Impersonate share the first line), not the markup, so column and keyboard order stay the desktop's. A keeper's card hides the empty cell.
- **`controls.scss`** holds the rules of controls that also stand outside the table; `confirmed-action.tsx`, `locked-control.tsx` and `primary-admin-mark.tsx` import it, so `AdminInvitations` takes only these.

## Used by

`/keepers/users` (`src/app/(shell)/keepers/(people)/users/`). `ConfirmedAction`, `LockedControl` and `changesLocked` are shared with `AdminInvitations` and the members page.

## Not here

Change Role, Approve and Revoke belong to [`UserDetail`](user-detail.md)'s modal, paging to [`Pager`](pager.md). Tests: `tests/components/UserList/`, `tests/app/(shell)/keepers/(people)/users/page.test.tsx`. Stories: `src/components/UserList/index.stories.tsx`.
