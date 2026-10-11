# SignInMethods

`src/components/SignInMethods/` — the list inside the account page's
Sign-In Methods section (MB.88): every way into the account, one row per
roster provider, linked or addable, and removable while another one is left.
Server component `src/app/account/page.tsx` reads the session,
`linkedAccounts()`, `?error=` and `?provider=`, and hands the results down as
props. This component renders the list and makes the two Better Auth calls.
Why a second provider is added this way and never at sign-in is
[`auth/admin-bootstrap.md`](../auth/admin-bootstrap.md), "Linking a second
provider".

The section's heading, the `<h2>` "Sign-In Methods", and its intro are the
page's, not the component's (moved in MB.116). The page writes all three
sections' heads the same way, so each is a region named by its heading
([`auth/admin-bootstrap.md`](../auth/admin-bootstrap.md), "The account
page").

## The props contract

| Prop         | Meaning                                                                                                                                                                                                                                                                                                                   |
| ------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `linked`     | The signed-in user's provider accounts as `{ id, providerId }`: `id` is the `accounts` row's own id, which `/unlink-account` takes. `LinkedAccount` lives in `src/lib/types.ts`, which is client-safe.                                                                                                                    |
| `configured` | Providers this environment has credentials for, from `configuredProviders()`. The rest cannot be added.                                                                                                                                                                                                                   |
| `error`      | A failed link, as `{ providerId?, message }` (`SignInMethodError`, `types.ts`). `message` is a readable sentence from `linkErrorMessage()` (`src/lib/sign-in.ts`), never a raw `?error=` code. `providerId` is the provider the link was for, when the callback said and it is on the roster. Shown as an alert on mount. |

## The rows

Each provider is a `ProviderRow` (`provider-row.tsx`), in one of three
states. Each state is told apart by its control and its words, never by
colour alone:

| State         | What the row shows                                                                                                                                       |
| ------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `linked`      | The provider's mark, its name, and "Remove &lt;Provider&gt;". With one method left there is no Remove, and a line, "Your only sign-in method", says why. |
| `addable`     | The mark, the name, and "Add &lt;Provider&gt;".                                                                                                          |
| `unavailable` | The mark, faded with its button, the name, and "Add &lt;Provider&gt;" greyed with `aria-disabled`, over the shared unavailable note.                     |

`ProviderRow` takes `{ provider, state, removable, pending, error, onAdd,
onRemove }` (`ProviderRowProps`, `types.ts`). `removable` is whether another
method is left; `pending` is whether a removal is in flight anywhere in the
list; `error` is this provider's own failure. The list works out each row's
state and hands it down; the row holds no state of its own.

## Adding one leaves the page

"Add &lt;Provider&gt;" calls `linkSocial` from `src/lib/auth-client.ts` with
`ACCOUNT_PATH` (`/account`) as `callbackURL` and
`/account?provider=<id>` as `errorCallbackURL`. Better Auth's client then
assigns `window.location.href` to the provider, and the callback lands back
here. A failure adds `?error=` to the error callback, so the page gets both
the code and the provider it was for, and the sentence shows in that
provider's row. A failure before any redirect, such as a network error or an
unregistered provider, shows `GENERIC_LINK_ERROR` in the row too.

An unconfigured provider's Add is `aria-disabled`, names the "This sign-in
method isn't available right now." note (`ProviderUnavailableNote`,
[`provider-mark.md`](provider-mark.md)) in its `aria-describedby`, and
starts nothing. It is not `disabled`, so it stays in the tab order, as on
`/sign-in`. A provider that is linked but no longer configured still has its
Remove: removal needs no credentials.

## Removing one answers in place

"Remove &lt;Provider&gt;" is rendered only while two or more are linked.
Better Auth refuses the last one anyway (`allowUnlinkingAll` is pinned off), so
the rule only keeps the page honest, and the last row says why it has no
Remove. It calls `unlinkAccount({ accountId })`. On success the row leaves the
component's own copy of the list, a success notice at the head of the list
says "&lt;Provider&gt; was removed.", and the provider's Add returns. There is
no reload, so a list changed in another tab shows only after one. On a refusal
the error's `code` goes through `unlinkErrorMessage()`:
`FAILED_TO_UNLINK_LAST_ACCOUNT` (two tabs racing), `SESSION_NOT_FRESH` (the
session is older than a day: sign in again), or the generic sentence. The
refusal shows in the row that stayed. While a removal is in flight every
Remove is `disabled`, so two cannot race to leave none. `.btn` greys out under
`disabled` as under `aria-disabled`, so the component adds no styling of its
own for it.

## Where a message shows

- **A failure about one provider** — a failed link, from the callback or
  before the redirect, or a refused removal — is an error `Notice` inside
  that provider's row, beneath its controls.
- **A failure with no provider** — a callback with no `?provider=`, or one
  that names a provider not on the roster — is an error `Notice` at the head
  of the list.
- **A removal's success** is a success `Notice` at the head of the list,
  since the row it was about has changed.

One message shows at a time: a new action clears the last, and neither
element exists in the DOM without a message. The `Notice` component
([`notice.md`](notice.md)) gives each its role.

## Provider marks

Each row draws its provider's mark (`ProviderMark`,
[`provider-mark.md`](provider-mark.md)), the circle the admin user list uses
too. MB.71 named providers in text only, on the owner's call then; MB.116
draws the mark pending the owner's call again, with the text-only row beside
it in the workshop (`ProposalMarks`, `ProposalNoMarks`). The mark is
decorative (`aria-hidden`): the name beside it is what a screen reader reads.

## Styling

The section's frame is the page's: `.page-frame--narrow` gives its width,
`.page-frame__section` its column, and `.header` and `.lede` its head
([`styling.md`](../styling.md), "The page frame"). `index.scss` styles only
the list:

- `.sign-in-methods` and `.sign-in-methods__list` are columns `space(3)`
  apart.
- `.sign-in-methods__item` is a wrapping row, `space(2)` by `space(3)`: the
  mark, the name taking the free width, then the control at the end.
- The rows clear `_typography.scss`'s ◆ marker with a local reset rather than
  `.link-row`, which clears it too: that is a row of links, and this is a
  column of rows.
- The unavailable note and the only-method line are `.meta` lines, a full
  row wide and set to the right, beneath where the control is or would be. A
  row's error `Notice` is a full row wide.
- An unavailable row's mark fades by the same 0.55 a disabled `.btn` does,
  so the row reads as off as a whole.

## Stories

[`index.stories.tsx`](../../src/components/SignInMethods/index.stories.tsx),
each inside the page's real frame, section and head: `OneLinked`,
`TwoLinked`, `WithError` (a failed link in Microsoft's row, reading
`linkErrorMessage` rather than a copied sentence), `SomeUnavailable`, and
`WholePage`, the whole `/account` page composed with fixture props, since
the page is a server component. `PhoneDark` and `PhoneLight` show the whole
page at 375px in each theme, with every row state. The `Proposal…` pairs are
the owner's open calls (MB.116): `ProposalNoStatus` / `ProposalStatusWord`,
`ProposalRemoveOutline` / `ProposalRemoveDestructive`, `ProposalMarks` /
`ProposalNoMarks`, and `ProposalPanelOff` / `ProposalPanelOn`. They go once
the owner has decided.

## Tests

- `tests/components/SignInMethods/index.test.tsx`: role and label queries
  only, with `@/lib/auth-client` mocked as in SignInPanel's test. It covers
  the four rows, no status text and Add on the unlinked ones, the link call's
  arguments, the generic link failure, an unconfigured Add, no Remove with one
  linked, removal by row id and its message, the survivor losing its Remove,
  and a mapped and an unmapped refusal.
- `tests/app/account/page.test.tsx`: the section is a region named
  "Sign-In Methods".
- `tests/e2e/account.spec.ts`: `/account` signed in through
  `tests/e2e/session.ts`, axe-scanned with one provider, beside the Name and
  Email sections, and with two plus a callback error.
- The link and unlink flows themselves are asserted against Better Auth's
  endpoints in `tests/db/account-linking.test.ts`.
