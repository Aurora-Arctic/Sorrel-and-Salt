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
  (no topic, an empty subject or message, or one past its limit) sends nothing: an error summary
  (`ErrorSummary`, [Field](field.md)) at the top lists each problem as a link to its field, takes the focus,
  and each field shows its message beside it. The form keeps `novalidate`. A refused field the server names joins
  the same summary.
- **Subject, Message and Page carry no `maxlength`.** Past 75% of its limit each shows how many characters are
  left (`CharacterCount`), and past the limit how many are over; the overrun is refused on send.
- **Once sent, the form is replaced by a "received" status** naming the request (its subject, a link to Your
  Support Requests), saying "We aim to reply within 5 working days" and that we are a small team, and that replies
  appear on Your Support Requests and arrive by email.
- **Focus on open** is the Modal's rule: the first field, here the first topic card. The page has no dialog to open.
- **`errorCode` is shown and `path` is a field.** A request from an error page says "Error 404." as fixed
  text. The Page field starts as `path`, and the sender may edit or clear it; an empty field (or only
  spaces) sends no `path`. The server takes any text up to 500 characters, which the field's note says,
  and checks no format; a longer one is refused with a field error shown on the Page field.
- **Closing asks first while text is typed or the Page differs from its starting value**, through
  `useDiscardGuard`. Cancel and Done exist only when
  `onDone` is given, because a page has nothing to close.
- A refusal is said in an alert above the form; a refused subject, message or page is said beside its field.
