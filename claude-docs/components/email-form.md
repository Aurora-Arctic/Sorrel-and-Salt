# EmailForm

`src/components/EmailForm/` is the `/account/email` page's form: the account's address, its verification state, and the one field that changes it. The server component `src/app/(shell)/account/email/page.tsx` reads the session, `getMe`, and `?next=`/`?error=`, and hands the results down as props. This component renders them and runs the `setEmail` mutation. With `embedded` set it is also the account page's Email section: the same field, mutation, cooldown and field errors, with no `<h1>` (the section's `<h2>` "Email" heads it) and never the confirmed view, which stays the email page's. A change link asked for there lands on the email page's confirmed view ([`auth/admin-bootstrap.md`](../auth/admin-bootstrap.md), "The account page").

## Contracts

- **The props carry decisions the page makes; the component never guesses them.**
  - `email` is `''` when the provider shared none. The page maps a placeholder (`isPlaceholderEmail`, `@/modules/identity`) to `''`, and the form never shows one.
  - `confirmed` is set when a followed link landed here (`?verified` on a verified row, with no `?error=`). The confirmed view is the verified line, the address and "Continue", with no field and no button.
  - `waitSeconds` is `verificationWaitSeconds` of the row's `verification_sent_at`, so the countdown starts where it stands.
  - `next` has already run through `safeReturnPath()` (`src/lib/sign-in.ts`), the guard `/sign-in` uses. Continue goes there.
  - `landing` is where Continue goes with no `next`: `signedInLanding()` of the session. That is `/keepers` for a keeper, `/curator` for a curator, the first coven for a member, and `/coven` for someone in none.
  - `accountPath` gives a verified account on the standalone page a quiet "Continue to Account" button. An unverified account reaches no other page, so it gets none.
  - `error` is a readable sentence from `verifyErrorMessage()` (`src/lib/account-email.ts`), never a raw `?error=` code, shown as an alert on mount.
- **Outside the confirmed view the field is always editable, whatever `verified` is.** The page is how any user changes the address at any later time. A verified account that comes back sees neither the verified line nor "Continue", since nothing was just proved. It sees the field, prefilled, and "Enter a new email address and we'll send it a confirmation link."
- **The status line is one sentence per state, each exported from `index.tsx`** (`NO_EMAIL_STATUS`, `UNVERIFIED_STATUS`, `CHANGE_STATUS`, `VERIFIED_STATUS`) so a test reads the state from the component and does not restate its words.
- **The success message names the typed address.** `setEmail` mails a link and returns the row as it is, because the address changes only when the link is followed, so the returned `email` is still the old one. The confirmation (an `<output>`, which carries the status role) names what was typed, trimmed and lower-cased for display, the service's own normalisation. The typed value goes to the server untouched: normalising is the service's job, and doing it twice would let the two drift.
- **The link carries `next`.** Every submit sends `next` beside the typed address, and `setEmail` hands it to the sender, so the resend or change link lands on the confirmed view with the same `next` ([`auth/admin-bootstrap.md`](../auth/admin-bootstrap.md), "The email page"). A refused link lands here with `next` still beside its `?error=`, so a link sent again from there carries it too. The component sends it as given, and the sender guards it again where it builds the link. With no `next` it sends none, and Continue takes the role's landing.
- **Two error surfaces.** A failed mutation rejects with `GraphQLClientError`, whose `errors[0].extensions` carries the code and, for `VALIDATION`, the field errors ([`graphql/errors.md`](../graphql/errors.md), "Errors"). The component reads it through `readGraphqlFailure(error, ['email'])` (`src/lib/graphql-failure.ts`).
  - A `VALIDATION` entry whose path starts at `email` lands inline beneath the input (`.field__error`), which the input references through `aria-describedby`, with `aria-invalid` set.
  - Any other `VALIDATION` issue, `FORBIDDEN`, `NOT_FOUND` or a masked error lands in the `role="alert"` region with the error's own message, or `GENERIC_FAILURE` when there is none or the rejection is not a `GraphQLClientError`.
  - Both are cleared, with the last success, when a new submit starts, so the page never shows two outcomes at once. The alert element does not exist in the DOM without a message, rather than being an empty live region, as in SignInPanel.
- **The submit is disabled only while the value, trimmed and lower-cased, equals `email` and `verified` is true**, since a verified, unchanged address has nothing to send, and while the mutation is pending. An unverified, unchanged address stays submittable: the service resends its link.
  - The row is the shared `FormActions`, so the button is a `BusyButton` ([`busy-button.md`](busy-button.md)).
  - It is a real `disabled` attribute, not `aria-disabled`, because a submit with nothing to send is fine to skip in the tab order.
- **The cooldown.** After a send succeeds the submit stays disabled for `RESEND_DELAY_SECONDS` (sixty), its label counting down as "Send Again in Ns", and a form submitted by other means in that time is ignored. It also starts from `waitSeconds` on mount, because an unverified sign-in lands here with the sign-up mail just sent and its first sight would otherwise be a refusal. It is timed off `Date.now()`, not counted in ticks, so a tab left in the background waits the real minute. This is a courtesy: the rule is the service's, which refuses a second mail within the minute with a `VALIDATION` field error naming the wait ([`auth/admin-bootstrap.md`](../auth/admin-bootstrap.md), "The email page"), and that lands beside the input like any other.
- **No native validation.** The input is `required`, which draws the marker and sets `aria-required`, and the form is `noValidate`: an empty or malformed address is refused by the shared `validateEmailAddress` (`src/lib/email-address.ts`) before any request, and the sentence lands beside the input like every server refusal, not in the browser's own bubble, which is styled by nobody and read by no screen reader consistently. `type="email"` stays for the keyboard it summons on a phone.
- **A controlled input is the whole form.** It is not react-hook-form; DESIGN.md §7's resolver pattern arrives with the shared Zod schemas, and this component is expected to move to it then.

## Styling

Built on the form primitives ([`styling.md`](../styling.md), "Form fields"), `FieldShell` ([`field.md`](field.md)) and [`Notice`](notice.md). On the email page the `<h1>` and the status line are a `PageHeader` ([`page-header.md`](page-header.md)). Send Confirmation and Continue are each the view's one primary action, so both are `.btn--solid`. The width is the page's `.page-frame--narrow`; both pages stand the form on a `.panel`.

## Not here

Stories: [`index.stories.tsx`](../../src/components/EmailForm/index.stories.tsx). The TanStack Query client comes from the workshop's global provider (`.storybook/components.tsx`), never from a story's own `QueryClientProvider`, since a second would split the cache.

Tests: `tests/components/EmailForm/index.test.tsx`, in the `dom` project, answers `SetEmail` through MSW (`mockGraphQLMutation` for the row, `mockGraphQLError` for a refusal, so the error body is the route's own mapping). Role and label queries only.
