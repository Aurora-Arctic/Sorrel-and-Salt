# EmailForm

`src/components/EmailForm/` — the `/account/email` page's form: the account's
address, its verification state, and the one field that changes it. Server
component `src/app/account/email/page.tsx` reads the session, `getMe`, and
`?next=`/`?error=`, and hands the results down as props; this component does
the rendering and the `setEmail` mutation.

## The props contract

| Prop          | Meaning                                                                                                                                                                                                                                                 |
| ------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `email`       | The row's address, or `''` when the provider shared none. The page maps a placeholder (`isPlaceholderEmail`, `@/modules/identity`) to `''`; the form never shows one.                                                                                   |
| `verified`    | `users.email_verified`. Decides the status line and whether an unchanged address has anything to send.                                                                                                                                                  |
| `confirmed`   | The page sets it when a followed link landed here (`?verified` on a verified row, with no `?error=`). The confirmed view: the verified line, the address, and "Continue" — no field, no button.                                                         |
| `waitSeconds` | Seconds the server will refuse another mail for as of this render (`verificationWaitSeconds` of the row's `verification_sent_at`), so the countdown starts where it stands.                                                                             |
| `next`        | Where the account was going, if anywhere — already run through `safeReturnPath()` (`src/lib/sign-in.ts`), the same guard `/sign-in` uses. Continue goes there, and every `setEmail` sends it, so the link it mails lands back here carrying it (below). |
| `landing`     | Where Continue goes with no `next`: `postSignInLanding()` of the session's role — `/admin` for an admin, `/coven` for anyone else (MB.113). The page reads the role; the component never guesses one.                                                   |
| `error`       | A readable sentence for a failed verification link, from `verifyErrorMessage()` (`src/lib/account-email.ts`) — never a raw `?error=` code. Shown as an alert on mount.                                                                                  |

Outside the confirmed view the field is always editable, whatever `verified`
is: this page is how any user changes the address at any later time, not only
how a first one is confirmed. A verified account that comes back sees neither
the verified line nor "Continue" — nothing was just proved — but the field,
prefilled, and "Enter a new address and we'll send it a confirmation link."

## The success message names the typed address

`setEmail` mails a link and returns the row **as it is** — the address does
not change until the mailed link is followed, so the returned `email` is still
the old one. The confirmation (an `<output>`, which carries the status role) therefore names what was typed,
trimmed and lower-cased for display (the same normalisation the service
stores), never the returned row's `email`. The typed value itself goes to the
server untouched; normalising is the service's job, and doing it twice would
let the two drift.

## The link carries `next`

Every submit sends `next` beside the typed address, and `setEmail` hands it to
the sender, so the resend or change link lands on this page's confirmed view
with the same `next`, and Continue goes on there
([`auth/admin-bootstrap.md`](../auth/admin-bootstrap.md), "The email page"). A
refused link lands here with `next` still beside its `?error=`, so a link sent
again from that page carries it too. The component sends it as it was given; the
sender guards it again where it builds the link. With no `next` it sends none,
so the link lands bare and Continue takes the role's landing when it is
followed.

## Two error surfaces

A failed mutation rejects with graphql-request's `ClientError`, whose
`response.errors[0].extensions` carries the code and, for `VALIDATION`, the
field errors ([`graphql/errors.md`](../graphql/errors.md), "Errors"). The
component reads that one shape and routes it to one of two places:

| Error                                                                | Where it lands                                                                                                                                            |
| -------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `VALIDATION` with a `fieldErrors` entry whose path starts at `email` | Inline beneath the input (`.field__error`), which the input references through `aria-describedby`; `aria-invalid` is set.                                 |
| Any other `VALIDATION` issue, `FORBIDDEN`, `NOT_FOUND`, masked       | The `role="alert"` region, showing the error's own message — or `GENERIC_EMAIL_ERROR` when there is none, or the rejection is not a `ClientError` at all. |

Both are cleared, along with the last success, when a new submit starts, so
the page never shows two outcomes at once. The alert element does not exist in
the DOM absent a message, rather than being an empty live region — the same
reasoning as SignInPanel's.

## The disabled-submit rule

The submit is disabled only while the value, trimmed and lower-cased, equals
`email` **and** `verified` is true — a verified, unchanged address has nothing
to send — and while the mutation is pending. An unverified, unchanged address
stays submittable: the service resends its link. It is a real `disabled`
attribute, not `aria-disabled` — unlike SignInPanel's roster, a submit with
nothing to send is fine to skip in the tab order. `.btn` greys out under
either, so the component styles neither.

## The cooldown

After a send succeeds the submit stays disabled for `RESEND_DELAY_SECONDS`
(sixty), its label counting down as "Send Again in Ns", and a form submitted
by other means in that time is ignored. It also starts from `waitSeconds` on
mount: an unverified sign-in lands here with the sign-up mail just sent, and
without that the first thing it saw would be a refusal. It is timed off `Date.now()` rather
than counted in ticks, so a tab left in the background waits the real minute.
This is a courtesy: the rule is the service's, which refuses a second mail
within the minute with a `VALIDATION` field error naming the wait
([`auth/admin-bootstrap.md`](../auth/admin-bootstrap.md), "The email page"), and that lands beside the input
like any other. The `resendDelaySeconds` prop exists so the test can wait
one second rather than fake the timers MSW's fetch shares.

## No native validation

The form is `noValidate` and the input is not `required`: an empty or
malformed field goes to the server, whose sentence lands beside the input the
way every other refusal does, rather than in the browser's own bubble, which
is styled by nobody and read by no screen reader consistently. `type="email"`
stays for the keyboard it summons on a phone.

## Not react-hook-form, yet

One field, so a controlled input is the whole form. DESIGN.md §7's resolver
pattern — react-hook-form with `setError` fed from `fieldErrors` — arrives
with the shared Zod schemas (M4.5), and this component is expected to move to
it then.

## Styling

Built on the form primitives in `_primitives.scss` ([`styling.md`](../styling.md),
"Form fields"): `.form` and `.form__actions`, one `.field` with its
`.field__label`, `.input` and `.field__error`, and `.notice--error` /
`.notice--success` for the alert and the sent message. The status line is a
`.lede`. Send Confirmation and Continue are each the view's one primary action,
so both are `.btn--solid`; Continue is `.btn` on an anchor, which `.btn`
itself keeps from underlining or taking the visited ink
([`styling.md`](../styling.md), "Buttons"). The
component's own stylesheet is the page frame and the column's layout.

## Stories

[`index.stories.tsx`](../../src/components/EmailForm/index.stories.tsx) —
`Prefilled` (unverified, the sign-up mail just sent, so counting down),
`ReadyToResend`, `NoEmail`, `Confirmed`, `ChangeLater` (verified, back to
change it) and `WithError` (reading `verifyErrorMessage` rather than a copied
sentence).
Every story renders inside the page's own `<main className="email-page">`, so the
workshop shows what `/account/email` shows and nothing is styled for the
workshop alone. Render-only, no test ids, no snapshots. The TanStack Query client
`useMutation` needs comes from the workshop's global provider
(`.ladle/components.tsx` wraps every story in the app's `Providers`), never
from a story's own `QueryClientProvider` — `tests/guards/graphql-client.test.ts`
allows exactly one under `src/`. Nothing is mocked, since the component reaches
the network only on submit.

## Testing

`tests/components/EmailForm/index.test.tsx` answers `SetEmail` through MSW —
`mockGraphQLMutation` for the row and `mockGraphQLError` for a refusal, so the
error body is the route's own mapping rather than a hand-written one. Covers:
the prefilled and empty field; the confirmed view and the verified return
visit; the status lines; the submit disabled for
an unchanged verified address (case and whitespace included) and enabled once
edited, or when unverified; the typed value sent as typed and named, normalised,
in the status, with `next` beside it, or none; a `VALIDATION` field error beside the
input with `aria-invalid` and `aria-describedby`; a `FORBIDDEN` message in the alert; the last outcome
cleared on resubmit; the cooldown, a submit refused inside it and the button
back once it passes, and one started from `waitSeconds`; an empty field sent
to the server with no native check in the way; a passed-in `error` as an
alert on mount; and "Continue"
only when verified, pointing at `next`, or at `landing` without one. Role and label queries only. Runs in
the `dom` (jsdom) Vitest project — `npm run test:coverage`.
