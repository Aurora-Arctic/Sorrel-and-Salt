# SupportForm

`src/components/SupportForm/` — the support request form, in the Support dialog and on `/support`. A
client component taking `path` (the page the request is about), and optionally `kind`, `errorCode` and
`onDone`.

## Contracts

- **One mutation, `sendSupportRequest`**, through `/api/graphql` like every browser write. The service
  checks the address, the time-out and the daily limit; the form only says the limits (subject up to
  120 characters, message up to 4000) so they are met before sending.
- **Accessibility is offered first and selected** unless `kind` names another.
- **Send Request stays disabled until the subject and message each hold something**, shows a spinner
  while sending, and is replaced by a "received" status that links to Your Support Requests.
- **`errorCode` is shown and `path` is a field.** A request from an error page says "Error 404." as fixed
  text. The Page field starts as `path`, and the sender may edit or clear it; an empty field (or only
  spaces) sends no `path`. The server takes any text up to 500 characters, which the field's note says,
  and checks no format; a longer one is refused with a field error shown on the Page field.
- **Closing asks first while text is typed or the Page differs from its starting value**, through
  `useDiscardGuard`. Cancel and Done exist only when
  `onDone` is given, because a page has nothing to close.
- A refusal is said in an alert above the form; a refused subject, message or page is said beside its field.
