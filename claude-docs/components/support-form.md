# SupportForm

`src/components/SupportForm/` — the support request form, in the Support dialog and on `/support`. A
client component taking `path` (the page the request is about), and optionally `about`, `errorCode` and
`onDone`.

## Contracts

- **One mutation, `sendSupportRequest`**, through `/api/graphql` like every browser write. The service
  checks the address, the time-out and the daily limit and stays the authority on the limits (subject up to
  120 characters, message up to 4000, page up to 500). The form says them and checks them on send too.
- **What the request is about is a group of radio cards (the What Is This About? field, `RadioGroupField layout="cards"`), with none chosen** unless `about` names one (`?support=bug` from Report This). A bare or unknown `?support` names none (`supportAboutOf` returns `undefined`), and the links that open Support add a bare `?support=`. Sending with none chosen sends nothing and draws "Choose what this is about." under the cards; the server's own `about` error is drawn there too. Seven options, from `SUPPORT_ABOUTS` in `src/lib/support-path.ts`, which also holds a line saying what each is; every card shows its label and that line.
- **Send Request is enabled from the start and shows a spinner while sending.** Pressing it with a problem
  (no topic, an empty subject or message, or one past its limit) sends nothing: each field shows its message beside it, as the site's other forms do, and the focus
  moves to the first field with a problem (the topic group's first radio, or the input). A refused field the
  server names is drawn and focused the same way; a failure that is no field's shows as an error `Notice` at the top.
  The form keeps `novalidate`.
- **Subject, Message and Page carry no `maxlength`.** Past 75% of its limit each shows how many characters are
  left (`CharacterCount`), and past the limit how many are over; the overrun is refused on send.
- **Once sent, the form is replaced by a "received" status** naming the request (its subject, a link to Your
  Support Requests), saying "We aim to reply within 5 working days" and that we are a small team, and that replies
  appear on Your Support Requests and arrive by email.
- **Focus on open** is the Modal's rule: the first field, here the first topic card. The page has no dialog to open.
- **`errorCode` is shown and `path` is a field.** A request from an error page says so in the Page field's
  note, "Opened from the Error 404 page. You can change it.", in place of the limit. The Page field starts as `path`, and the sender may edit or clear it; an empty field (or only
  spaces) sends no `path`. The server takes any text up to 500 characters, which the field's note says,
  and a longer one is refused with a field error shown on the Page field. The Page must be a path on this site: empty, or starting with `/` (not `//`), or with the site's own address, `SITE_ORIGIN` in `src/lib/site.ts` (`https://sorrelandsalt.com`). Anything else is refused with "Start with / or the site's address.", by `isSitePage` in the form and by the same check in `SupportRequestInput`, which the signed-out request shares, so the GraphQL path cannot skip it.
- **Closing asks first while text is typed or the Page differs from its starting value**, through
  `useDiscardGuard`. Cancel and Done exist only when
  `onDone` is given, because a page has nothing to close.
- A refusal is said in an alert above the form; a refused subject, message or page is said beside its field.

- **`errorReference` is shown and sent.** With an error number the Page field's note reads "Opened from the Error 500 page, reference abc123. You can change it.", the reference in a `code` element, and it goes as `errorReference`. The service trims it, refuses more than 100 characters, and stores it on
  `support_requests.error_reference`, where the admin request dialog shows it as Error Reference beside the error
  number, with a Copy button.
