# EmailForm

`src/components/EmailForm/` — the `/account/email` page's form: the account's
address, its verification state, and the one field that changes it. Server
component `src/app/(shell)/account/email/page.tsx` reads the session, `getMe`, and
`?next=`/`?error=`, and hands the results down as props; this component does
the rendering and the `setEmail` mutation.

It is also the account page's Email section (MB.88), with `embedded` set:
the same field, mutation, cooldown and field errors, with no `<h1>` of its own,
since the section's `<h2>` "Email" heads it, and never the confirmed view, which
stays the email page's. A change link asked for there lands on the email
page's confirmed view, as any other does
([`auth/admin-bootstrap.md`](../auth/admin-bootstrap.md), "The account page").

## The props contract

| Prop          | Meaning                                                                                                                                                                                                                                                                                                                      |
| ------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `email`       | The row's address, or `''` when the provider shared none. The page maps a placeholder (`isPlaceholderEmail`, `@/modules/identity`) to `''`; the form never shows one.                                                                                                                                                        |
| `verified`    | `users.email_verified`. Decides the status line and whether an unchanged address has anything to send.                                                                                                                                                                                                                       |
| `confirmed`   | The page sets it when a followed link landed here (`?verified` on a verified row, with no `?error=`). The confirmed view: the verified line, the address, and "Continue" — no field, no button.                                                                                                                              |
| `waitSeconds` | Seconds the server will refuse another mail for as of this render (`verificationWaitSeconds` of the row's `verification_sent_at`), so the countdown starts where it stands.                                                                                                                                                  |
| `next`        | Where the account was going, if anywhere — already run through `safeReturnPath()` (`src/lib/sign-in.ts`), the same guard `/sign-in` uses. Continue goes there, and every `setEmail` sends it, so the link it mails lands back here carrying it (below).                                                                      |
| `landing`     | Where Continue goes with no `next`: `signedInLanding()` of the session — `/admin` for an admin (MB.113), the first coven for a member, `/coven` for someone in none (MB.257). The page reads it; the component never guesses one.                                                                                            |
| `accountPath` | The account page's path. On the standalone page a verified account gets a quiet "Continue to Account" button (`.btn--quiet`, as a way elsewhere is) inside the card, beside "Continue" on the confirmed view and under the form otherwise (the owner, MB.116); an unverified account reaches no other page, so it gets none. |
| `embedded`    | The account page's Email section: no heading of its own and no confirmed view, whatever `confirmed` says.                                                                                                                                                                                                                    |
| `error`       | A readable sentence for a failed verification link, from `verifyErrorMessage()` (`src/lib/account-email.ts`) — never a raw `?error=` code. Shown as an alert on mount.                                                                                                                                                       |

Outside the confirmed view the field is always editable, whatever `verified`
is: this page is how any user changes the address at any later time, not only
how a first one is confirmed. A verified account that comes back sees neither
the verified line nor "Continue" — nothing was just proved — but the field,
prefilled, and "Enter a new email address and we'll send it a confirmation
link."

The status line is one sentence per state of the address, each exported
from `index.tsx` so a test reads the state from the component rather than
restating its words:

| Constant            | When                                      | Sentence                                                                                |
| ------------------- | ----------------------------------------- | --------------------------------------------------------------------------------------- |
| `NO_EMAIL_STATUS`   | No address                                | "No email address yet. Enter the one we should write to."                               |
| `UNVERIFIED_STATUS` | An address waiting on its link            | "Your email address isn't confirmed yet. Open the link we sent you, or send a new one." |
| `CHANGE_STATUS`     | A verified account back to change it      | "Enter a new email address and we'll send it a confirmation link."                      |
| `VERIFIED_STATUS`   | The confirmed view, after a followed link | "Your email address is confirmed. We'll send your emails here."                         |

Each says "email address" at its first mention and "address" after, the
copy's rule for the word (MB.116).

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

A failed mutation rejects with the client wrapper's `GraphQLClientError`, whose
`errors[0].extensions` carries the code and, for `VALIDATION`, the
field errors ([`graphql/errors.md`](../graphql/errors.md), "Errors"). The
component reads that one shape through the shared reader,
`readGraphqlFailure(error, ['email'])` in `src/lib/graphql-failure.ts`, and
routes what it answers to one of two places:

| Error                                                                | Where it lands                                                                                                                                               |
| -------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| `VALIDATION` with a `fieldErrors` entry whose path starts at `email` | Inline beneath the input (`.field__error`), which the input references through `aria-describedby`; `aria-invalid` is set.                                    |
| Any other `VALIDATION` issue, `FORBIDDEN`, `NOT_FOUND`, masked       | The `role="alert"` region, showing the error's own message — or `GENERIC_FAILURE` when there is none, or the rejection is not a `GraphQLClientError` at all. |

Both are cleared, along with the last success, when a new submit starts, so
the page never shows two outcomes at once. The alert element does not exist in
the DOM absent a message, rather than being an empty live region — the same
reasoning as SignInPanel's.

## The disabled-submit rule

The submit is disabled only while the value, trimmed and lower-cased, equals
`email` **and** `verified` is true — a verified, unchanged address has nothing
to send — and while the mutation is pending. An unverified, unchanged address
stays submittable: the service resends its link. While the send is in
flight the button is busy, as NameForm's Save is: the row is the shared
`FormActions` with its `label` and `busyLabel` given, so its button, a `BusyButton`
([`busy-button.md`](busy-button.md)), carries `aria-busy` and the
`.spinner` and reads "Sending Confirmation", the owner's rule for every
form ([`styling.md`](../styling.md), "Buttons"). It is a real `disabled`
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
like any other. The test fakes the clock to cross the minute, with
`shouldAdvanceTime` so MSW's fetch and `waitFor` still see time pass; the
`resendDelaySeconds` prop that once shortened the wait for it went in MB.189.

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
"Form fields"): `.form` and `.form__actions`, and one field drawn by the
shared `FieldShell` ([`field.md`](field.md)) around the form's own `.input`, and the `Notice` component
([`notice.md`](notice.md)) for the alert and the sent message. On the email
page the `<h1>` and the status line are a `.header`, the status line its
`.lede`; embedded, the status line is a `.lede` on its own, under the
section's head. Send Confirmation and Continue are each the view's one primary action,
so both are `.btn--solid`; Continue is `.btn` on an anchor, which `.btn`
itself keeps from underlining or taking the visited ink
([`styling.md`](../styling.md), "Buttons"). The width is the page's: `/account/email` is a `.page-frame--narrow`
([`styling.md`](../styling.md), "The page frame"), and the account page's
section sits in the same frame. Both stand the form on a `.panel`, the
account page's section and the email page's own wrapper round the form, so
the two pages share one ground (the owner's call, MB.116); the way back to
the account page sits below the email page's panel. The component's own stylesheet is the
column's gap and the address's weight.

## Stories

[`index.stories.tsx`](../../src/components/EmailForm/index.stories.tsx),
titled "Account / Email Form": `States`, drawn in the app shell (the header with the account's initials, and no Add Ingredient while the address is unverified), with a control that chooses Ready To Resend (unverified, the site's resting state, Send Confirmation usable), Countdown (the sign-up mail just sent, so counting down), No Email, Confirmed, Change Later (verified, back to
change it) and Failed (reading `verifyErrorMessage` rather than a copied
sentence), and `Embedded`, inside the account page's frame and section.
Every other state renders inside the page's own `<main className="page-frame page-frame--narrow">`
and its `.panel`, so the workshop shows what `/account/email` shows and
nothing is styled for the workshop alone. Render-only, no test ids, no snapshots. The TanStack Query client
`useMutation` needs comes from the workshop's global provider
(`.storybook/components.tsx` wraps every story in the app's `Providers`), never
from a story's own `QueryClientProvider`: a second would split the cache. Nothing is mocked, since the component reaches
the network only on submit.

## Testing

`tests/components/EmailForm/index.test.tsx` answers `SetEmail` through MSW —
`mockGraphQLMutation` for the row and `mockGraphQLError` for a refusal, so the
error body is the route's own mapping rather than a hand-written one. Covers:
the prefilled and empty field; the confirmed view, with Continue to `next` or
to `landing` without one, and the verified return visit; the embedded use,
with no heading and no confirmed view; the status lines, each the one
rendering of the address's state; the submit disabled for an unchanged
verified address (case included) and enabled once edited, or when
unverified; the typed value sent as typed and the status naming it,
normalised, with `next` beside it, or none; the busy button while the send is in flight; a `VALIDATION` field error
marking the input invalid and describing it; a `FORBIDDEN` refusal and a
send that never reached the server, each as an alert; the last outcome
cleared on resubmit; the cooldown on the button held from before the send, a
submit refused inside it and the button back once it passes, and one started
from `waitSeconds`; an empty field sent to the server with no native check in
the way; a passed-in `error` as an alert on mount, and none without one; and
no Continue while unverified. Role and label queries only. Runs in the `dom`
(happy-dom) Vitest project — `npm run test:coverage`.
