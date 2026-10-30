# SignInMethods

`src/components/SignInMethods/` — the list inside the account page's
Sign-In Methods section (MB.88): every way into the account, one row per
roster provider, linked or addable, and removable while another one is left.
Server component `src/app/(shell)/account/page.tsx` reads the session,
`linkedAccounts()`, whether the session is fresh (`sessionIsFresh()`),
`?error=` and `?provider=`, and hands the results down as props. This component renders the list and makes the two Better Auth calls.
Why a second provider is added this way and never at sign-in is
[`auth/admin-bootstrap.md`](../auth/admin-bootstrap.md), "Linking a second
provider".

The section's heading, the `<h2>` "Sign-In Methods", and its intro are the
page's, not the component's (moved in MB.116). The page writes all three
sections' heads the same way, so each is a region named by its heading
([`auth/admin-bootstrap.md`](../auth/admin-bootstrap.md), "The account
page").

## The props contract

| Prop         | Meaning                                                                                                                                                                                                                                                                                                                    |
| ------------ | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `linked`     | The signed-in user's provider accounts as `{ id, providerId }`: `id` is the `accounts` row's own id, which `/unlink-account` takes. `LinkedAccount` lives in `src/lib/types.ts`, which is client-safe.                                                                                                                     |
| `configured` | Providers this environment has credentials for, from `configuredProviders()`. The rest cannot be added.                                                                                                                                                                                                                    |
| `error`      | A failed link, as `{ providerId?, message }` (`SignInMethodError`, `types.ts`). `message` is a readable sentence from `linkErrorMessage()` (`src/lib/sign-in.ts`), never a raw `?error=` code. `providerId` is the provider the link was for, when the callback said and it is on the roster. Shown as an alert on mount.  |
| `fresh`      | Whether the session is young enough for Better Auth to remove a method, from `sessionIsFresh()` (`src/lib/request-session.ts`). `false` withholds every Remove and offers Sign In Again ("A stale session signs in again", below). Optional, and `true` when left out, since Better Auth's refusal is the rule either way. |

## The rows

Each provider is a `ProviderRow` (`provider-row.tsx`), in one of three
states. Each state is told apart by its control and its words, never by
colour alone:

| State         | What the row shows                                                                                                                                                                                                                                                                                                                                                                                                                                                                   |
| ------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| `linked`      | The provider's mark, its name, and "Remove", small and quiet (`.btn--quiet.btn--small`) as Add is; the red is the question's own Remove. With one method left the Remove is greyed (`aria-disabled`, still in the tab order) and a line beneath it, "Your only sign-in method", is its description: greyed rather than gone so the reason sits under the control it explains (the owner, 2026-10-11). From a stale session there is no Remove, and the line above the list says why. |
| `addable`     | The mark, the name, and "Add", small and quiet (`.btn--quiet.btn--small`): a row's action, not a page's (the owner, 2026-10-11).                                                                                                                                                                                                                                                                                                                                                     |
| `unavailable` | The mark, faded with its button, the name, and "Add" greyed with `aria-disabled`, over the shared unavailable note.                                                                                                                                                                                                                                                                                                                                                                  |

No row carries a status word such as "Linked": a linked row is the one with
Remove or its reason, and an unlinked one has Add (the owner's call, MB.116).
Each button shows one word, since the row names the provider beside it and
"Remove Microsoft" fell onto a line of its own at 375px; the provider's name
is still in the button's accessible name, as an `aria-label` beginning with
the visible word, so a screen reader hears "Add Microsoft" and the tests
locate it by that name.

`ProviderRow` takes `{ provider, state, removal, pending, busy, error, onAdd,
onRemove }` (`ProviderRowProps`, `types.ts`). `removal` (`ProviderRemoval`)
is whether a linked row offers Remove: `offered` while another method is
left and the session is fresh, `last` for the only method, and `withheld`
from a stale session. `pending` is whether a removal is in flight anywhere
in the list; `busy` is whether this row's own action (its Remove, or the hop
of its Add) is in flight: its button is a `BusyButton` with the spinner and
`aria-busy` ("Removing", "Adding"; the `aria-label` keeps the name). A link that
starts the redirect calls `reportLeaving()` so the page bar stays up until the
browser leaves. `error` is this provider's failed link from the callback.
`onAdd` and `onRemove` answer the sentence a failed press should say, or
nothing. The list works out each row's state and hands it down; the row's
one state of its own is its click feedback, the callout and badge of its
last failed press ([`click-feedback.md`](click-feedback.md)), named for its
control: "Show the error for Remove Discord".

## Adding one leaves the page

"Add &lt;Provider&gt;" calls `linkSocial` from `src/lib/auth-client.ts` with
`ACCOUNT_PATH` (`/account`) as `callbackURL` and
`/account?provider=<id>` as `errorCallbackURL`. Better Auth's client then
assigns `window.location.href` to the provider, and the callback lands back
here. A failure adds `?error=` to the error callback, so the page gets both
the code and the provider it was for, and the sentence shows in that
provider's row. A failure before any redirect, such as a network error or an
unregistered provider, says `GENERIC_LINK_ERROR` in a callout under that
row's Add, the focus left on it.

An unconfigured provider's Add is `aria-disabled`, names the "This sign-in
method isn't available right now." note (`ProviderUnavailableNote`,
[`provider-mark.md`](provider-mark.md)) in its `aria-describedby`, and
starts nothing. It is not `disabled`, so it stays in the tab order, as on
`/sign-in`. A provider that is linked but no longer configured still has its
Remove: removal needs no credentials.

## Removing one answers in place

"Remove &lt;Provider&gt;" is offered only while two or more are linked and
the session is fresh. Better Auth refuses the last one anyway
(`allowUnlinkingAll` is pinned off), so the rule only keeps the page honest,
and the last row's greyed Remove says why in its description. Remove asks
first, in a modal titled Remove Sign-In Method: "Remove **&lt;Provider&gt;**
from your sign-in methods? You can no longer sign in with it until you add it
again.", the provider in bold with no quotes, over a red Remove and Cancel
(the confirm shape every destructive question takes). Cancel sends nothing
and gives the focus back to the row's Remove. The dialog's Remove calls
`unlinkAccount({ accountId })` and stays open, busy, until the answer; then
it closes, and the focus goes back to the row's control, the Add that
replaced the Remove on a success. On success the row leaves the component's own
copy of the list and the provider's Add returns, which is what is seen; the
page's status region says "&lt;Provider&gt; was removed from your sign-in
methods." (`announce`, [`click-feedback.md`](click-feedback.md), M12.31). There is no reload, so a list changed in another tab shows only
after one. On a refusal the error's `code` goes through
`unlinkErrorMessage()`: `FAILED_TO_UNLINK_LAST_ACCOUNT` (two tabs racing),
`SESSION_NOT_FRESH` (the session grew stale while the page was open, or in
another tab: sign in again), or the generic sentence, which a dropped
connection also takes. The refusal is a callout under the Remove that
stayed, the focus back on it. While a removal is in flight every other
Remove is `disabled`, so two cannot race to leave none; the pressed one is
`aria-disabled` instead, so it keeps the focus, and refuses a second press
itself. `.btn` greys out under
`disabled` as under `aria-disabled`, so the component adds no styling of its
own for it.

## A stale session signs in again

Better Auth's `/unlink-account` refuses a session older than its `freshAge`
(a day, pinned in `tests/lib/auth.test.ts`) with `SESSION_NOT_FRESH`. A
session lasts seven days, so most visits after the first day would meet that
refusal on every Remove: a button offered, pressed and refused, with a
sentence telling the reader to do something else. The owner called that
confusing (MB.116), so the page pre-empts the refusal rather than only
explaining it:

1. `stateFromHeaders` in `src/lib/request-session.ts` keeps the session's
   `createdAt` and works out `sessionFresh`, the same check Better Auth
   makes, against Better Auth's own resolved `freshAge` (`auth.$context`'s
   `sessionConfig`), where 0 means always fresh. `sessionIsFresh()` reads it
   from the same per-request lookup as `getSession()`. It sits beside
   `emailVerified` on `SessionState`, off the service-level `Session`,
   since a page needs it and no service does.
2. The account page passes it as `fresh`.
3. With `fresh` false and two or more methods linked, no row offers Remove.
   Above the list, a plain `Notice` says "Removing a sign-in method needs a
   recent sign-in.", and a `.btn` button, Sign In Again, names it in its
   `aria-describedby`.
4. Sign In Again calls `signOut()` from `src/lib/auth-client.ts`, as
   SignOutButton does, busy as "Signing Out" meanwhile
   ([`account-menu.md`](account-menu.md), "Contracts"). Its success is a full load
   of `signInPath('/account')` (`/sign-in?next=%2Faccount`), so the sign-in
   lands back here with a new, fresh session. While it runs the button is
   `aria-disabled`, not `disabled`, so it keeps the focus. Its failure, a
   refusal or a dropped connection, is `GENERIC_FAILURE` in a callout under
   the button, which is offered again.

The refusal stays mapped all the same. Freshness is read when the page
renders, so a page left open past the day, or a second tab, can still press
a Remove that Better Auth then refuses, and `SESSION_NOT_FRESH`'s sentence
shows in that row. With one method left nothing changes: there is nothing to
remove, so no fresh sign-in is offered.

## Where a message shows

- **A press's failure** — Add failing before the redirect, a refused or
  unreachable removal, a failed Sign In Again — is a click-feedback callout
  under the control pressed, the focus left on it, with a badge on the
  control that brings it back once dismissed; the next press of that
  control clears it ([`click-feedback.md`](click-feedback.md); M12.31).
- **A failed link's callback**, which the server seeds from `?error=` and no
  press here raised, is an error `Notice` inside that provider's row,
  beneath its controls; one with no `?provider=`, or naming a provider not
  on the roster, is an error `Notice` at the head of the list. Any press
  here clears it.
- **A removal's success** is said in the page's status region and seen as
  the row turning to Add; there is no success `Notice`.

The `Notice` component ([`notice.md`](notice.md)) gives a callback error
its role, and no `Notice` element exists in the DOM without a message.

## Provider marks

Each row draws its provider's mark (`ProviderMark`,
[`provider-mark.md`](provider-mark.md)), the circle the admin user list uses
too. MB.71 named providers in text only, on the owner's call then; MB.116
draws the mark, on the owner's call at its sign-off. The mark is decorative
(`aria-hidden`): the name beside it is what a screen reader reads.

## Styling

The section's frame is the page's: `.page-frame--narrow` gives its width,
`.page-frame__section` its column, `.panel` its ground, and `.header` and
`.lede` its head ([`styling.md`](../styling.md), "The page frame"). Each of
the account page's sections is on its own panel, which parts it from the
next, so no rule is drawn between them (the owner's call, MB.116).
`index.scss` styles only the list:

- `.sign-in-methods` and `.sign-in-methods__list` are columns `space(3)`
  apart.
- `.sign-in-methods__item` is a wrapping row, `space(2)` by `space(3)`: the
  mark, the name taking the free width, then the control at the end.
- The rows clear `_typography.scss`'s ◆ marker with a local reset: this is a
  column of rows, not a bulleted list.
- The unavailable note and the only-method line are `.meta` lines, a full
  row wide and set to the right, beneath where the control is or would be. A
  row's error `Notice` is a full row wide.
- An unavailable row's mark fades by the same 0.55 a disabled `.btn` does,
  so the row reads as off as a whole. Its note keeps the caption size (the
  owner's call, MB.116).
- `.sign-in-methods__fresh`, a stale session's line and Sign In Again, is a
  column `space(2)` apart, the button at its own width.

## Stories

[`index.stories.tsx`](../../src/components/SignInMethods/index.stories.tsx),
each inside the page's real frame, section, panel and head: `States`, with a control that chooses Default,
Two Linked, Stale Session (the same two from a stale session), Failed
(a failed link in Microsoft's row, reading `linkErrorMessage` rather than a
copied sentence) and Some Unavailable; `PendingAdd`; `FailedRemove` (Remove Microsoft
pressed on mount, then the red Remove in the Remove Sign-In Method question, the
removal failing into its callout, since the workshop serves no `/api/auth`), and `WholePage`, with a control that chooses Whole Page, the whole `/account`
page composed with fixture props, since the page is a server component.
It is composed as `src/app/(shell)/account/page.tsx` composes it: a bare
heading, `PageNav` with the same four entries, the Invitations section with
none waiting, the `page-with-nav` class on the `main` so the wide two-column
layout shows, and no Sign Out, which since
MB.7 sits only in the account menu. Every Row State shows the
whole page with every row state. The stories are
titled "Sign In / Sign-In Methods".

## Tests

- `tests/components/SignInMethods/index.test.tsx`: role and label queries
  only, with `@/lib/auth-client` mocked as in SignInPanel's test. It covers
  the four rows and Add on the unlinked ones, the link call's arguments, a
  failed link's alert in its provider's row, the generic link failure's
  callout under Add (focus, description, Dismiss, badge, cleared at the next
  press, with a callback error), an
  unconfigured Add, no Remove with one linked and the row's reason line,
  removal by row id and its sentence in the status region (drawn under
  `StatusRegionProvider`), the pressed Remove keeping the focus while busy,
  the survivor losing its Remove, a mapped and an unmapped refusal and an
  unreachable removal, each a callout under its Remove, Remove withheld and Sign In Again offered from a
  stale session, and Sign In Again signing out to `/sign-in` with
  `next=/account`, and its failure's callout with the focus kept while busy.
- `tests/app/(shell)/account/page.test.tsx`: the page's nav reaches each section.
- `tests/e2e/account.spec.ts`: `/account` signed in through
  `tests/e2e/session.ts`, axe-scanned with one provider in both themes and
  held at 375px without sideways scroll, and with two plus a callback error
  whose alert is in Microsoft's row.
- The link and unlink flows themselves are asserted against Better Auth's
  endpoints in `tests/db/account-linking.test.ts`.

## The list of ways in

The account page lists every roster provider as linked or addable, and a linked one can be removed while another remains. Adding is Better Auth's `/link-social`, which leaves for the provider and lands back on the account page. Removing is `/unlink-account`, answered in place. A session too old for Better Auth to remove a method is offered a fresh sign-in in place of every Remove, rather than a press it would refuse. The section's heading and intro belong to the page, so the section is a named region like the other two.

## A provider row

A row is in one of three states, told apart by its control and its words rather than by hue.

- Linked has Remove. Remove is greyed for the only method left, with a line saying why. From a stale session there is no Remove at all, since the list says why once.
- Addable has Add.
- Unavailable has a greyed Add with a note saying why.

A press's failure is a callout under the control pressed. A failed link's callback error, which no press here raised, sits in the row beneath the controls as a `Notice`.
