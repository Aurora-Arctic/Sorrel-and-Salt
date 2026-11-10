# SupportForm

`src/components/SupportForm/` — the support request form, in the Support dialog and on `/support`.

## Contracts

- **One mutation, `sendSupportRequest`**, through `/api/graphql` like every browser write. The service
  checks the address, the time-out and the daily limit and stays the authority on the limits (subject up to
  120 characters, message up to 4000, page up to 500). The form says them and checks them on send too.
- **What the request is about is a group of radio cards (the What Is This About? field, `RadioGroupField layout="cards"`), with none chosen** unless `about` names one (`?support=bug` from Report This). A bare or unknown `?support` names none (`supportAboutOf` returns `undefined`), and the links that open Support add a bare `?support=`. Sending with none chosen sends nothing and draws "Choose what this is about." under the cards; the server's own `about` error is drawn there too. The seven options and their lines are `SUPPORT_ABOUTS` in `src/lib/support-path.ts`.
- **Send Request is enabled from the start and shows a spinner while sending.** Pressing it with a problem
  (no topic, an empty subject or message, or one past its limit) sends nothing: each field shows its message beside it, as the site's other forms do, and the focus
  moves to the first field with a problem (the topic group's first radio, or the input). A refused field the
  server names is drawn and focused the same way; a failure that is no field's shows as an error `Notice` at the top.
  The form keeps `novalidate`.
- **Subject, Message and Page are `PlainTextField`s with a soft `limit`**, the numbers from `src/modules/support/validation/limits.ts` (client-safe; the service imports them too). Past 75% of its limit each shows how many characters are
  left, and past the limit how many are over; the overrun is refused on send with `limitMessage`. Nothing stops typing.
- **Once sent, the form is replaced by a "received" status** naming the request (its subject, a link to Your
  Support Requests), saying "We aim to reply within 5 working days" and that we are a small team, and that replies
  appear on Your Support Requests and arrive by email.
- **`errorCode` is shown and `path` is a field.** A request from an error page says so in the Page field's
  note, "Opened from the Error 404 page. You can change it.", in place of the limit. The Page field starts as `path`, and the sender may edit or clear it; an empty field (or only
  spaces) sends no `path`. The server takes any text up to 500 characters, which the field's note says,
  and a longer one is refused with a field error shown on the Page field. The Page must be a path on this site: empty, or starting with `/` (not `//`), or with the site's own address, `SITE_ORIGIN` in `src/lib/site.ts` (`https://sorrelandsalt.com`). Anything else is refused with "Start with / or the site's address.", by `isSitePage` in the form and by the same check in `SupportRequestInput`, which the signed-out request shares, so the GraphQL path cannot skip it.
- **`errorReference` is shown and sent.** With an error number the Page field's note reads "Opened from the Error 500 page, reference abc123. You can change it.", the reference in a `code` element, and it goes as `errorReference`. The service trims it, refuses more than 100 characters, and stores it on
  `support_requests.error_reference`, where the admin request dialog shows it as Error Reference beside the error
  number, with a Copy button.
- **`errorDetail` is shown read-only and sent.** When the form is given the error's name and message, it shows them as an Error Details group (`ErrorDetails`, `src/components/SupportForm/error-details.tsx`: a label and the text in a `code` element, not a field, so the sender cannot change them) after the Page field, and sends them as `errorDetail`. The service trims it, refuses more than `ERROR_DETAIL_MAX_LENGTH` (500, `src/modules/support/validation/limits.ts`) with `limitMessage`, and stores it on `support_requests.error_detail`, where the staff request dialog shows it as Error Details. Like the reference it is staff-only afterwards: the sender's reads blank it.
- **Closing asks first while text is typed or the Page differs from its starting value**, through
  `useDiscardGuard`. Cancel and Done exist only when
  `onDone` is given, because a page has nothing to close.
- **The signed-out form offers five of the seven topics** (Accessibility, Bug, Account & Sign-In, Privacy & Data, Question), with the same labels and hints as this form, from `SUPPORT_ABOUTS`. `SIGNED_OUT_ABOUTS` in `src/modules/support/validation/support.ts` is the service's list; Compendium Entry and Feedback need an account.
- **The signed-out form checks Send Request the same way**, with Email added between the topic and Subject: an empty or malformed address shows its message on the Email box, and the focus order is topic, Email, Subject, then Message. Both forms take their empty-field messages from `src/lib/support-messages.ts`.
- **The signed-out form carries the error the same way.** Given `errorReference` and `errorDetail`, it shows the detail through the same `ErrorDetails` group, before Message, and sends both with the request; given neither, it shows and sends neither. It has no Page field, so it does not show the reference or the error number.

## Support panel

`src/components/SupportPanel/` — the body of `/support` and of the Support dialog. It takes the state the page or the dialog's slot worked out and
draws one of three things: Sign In for a signed-out visitor, the end of a time-out, or that it has no end date, in place of the form,
or `SupportForm`. `returnTo` is where Sign In brings the visitor back (the support page by default; the dialog passes its own address) and `onDone` closes the dialog. The caller decides the state; the panel decides nothing about access.

Both callers put a "Search Help" link to `/help` on its own above the panel, so a reader can look for an answer before writing. The dialog omits it for the unverified notice.

The signed-out state carries the same optional `support` topic, `errorReference` and `errorDetail` as the form state, and passes them to `SignedOutSupportForm`, the topic as `about`.

## Support link

`src/components/SupportLink/` — a link that opens the Support dialog over the page it is on, by adding
a bare `?support=` to the current address and keeping its other parameters. The footer
and the account menu use it; the dialog is in every page. Until the address is known it renders a link to `/support`.

It is a `ModalLink` (`scroll={false}`), so the page behind does not scroll to the top ([`modal.md`](modal.md)).

Both links carry `rel="nofollow"`, which asks a search engine's crawler not to fetch the address. Each is a copy of a page with the dialog asked for, and `robots.txt` blocks the home page's copy, `/?support=`, so a crawler that followed it would report a blocked link.

The optional `about` prop names a topic from the form’s own list (`SUPPORT_ABOUTS`), so the dialog opens with it chosen: the link adds `?support=<about>` instead of a bare `?support=`, and the no-JavaScript link goes to `/support?support=<about>`. The page the request is about is the address the link sits on. A signed-out visitor gets the topic chosen only when it is one of the five open without an account (accessibility, bug, account, privacy, question); a topic that needs an account, such as the compendium, leaves nothing chosen.

## Support dialog

`src/components/SupportDialog/` — the Support dialog, drawn once by the root layout, with no props, on every page. The layout reads nothing for it. It is open while the
address carries `?support=<about>`; `?error=<status>` adds an error number, and `?from=<path>` names the
page the request is about when it is not the page the dialog sits on. Closing drops the parameters and
keeps the page.

### Contracts

- Asks what the visitor may do when it opens, through `/api/graphql` (the `supportDialogState` query, open to a signed-out caller and answered under the caller’s own session by `getMySupportDialogState`), and asks again at every open. The answer is `signedOut` (Sign In and the signed-out form), `unverified` (a line and a link to the email page instead of the form), `timedOut` (when the time-out ends, or null for one with no end date) or `form`. Until it arrives the dialog shows a form skeleton, and a failed read shows the generic failure notice, never an empty form.
- The body is `SupportPanel` (above), which draws `SupportForm` for a sender who may write, inside a `RouteModal` titled Contact Support.
- Reads the address through `useSearchParams`, so it sits in a Suspense boundary.

## What a curator sees of the page path

- curator [coven] redaction: redactPathForCurator in src/modules/support/services/staff.ts replaces the coven segment of a request's page path for a curator
