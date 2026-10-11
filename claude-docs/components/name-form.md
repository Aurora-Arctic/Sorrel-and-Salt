# NameForm

`src/components/NameForm/` is the account page's Name section (MB.88): the
name the site shows for the account, and the one field that changes it.
Server component `src/app/account/page.tsx` reads the row with `getMe` and
hands down `name`. This component does the rendering and the `setName`
mutation.

## The props contract

| Prop   | Meaning                                                                                                                        |
| ------ | ------------------------------------------------------------------------------------------------------------------------------ |
| `name` | The row's `name`. The field's starting value, and what "unchanged" compares against until a save answers with the stored name. |

The section's heading, "Name", is the page's `<h2>`, not the component's. The
field is labelled "Name" by its own `<label>`, so the label and the heading
read the same.

## Saving

- **Save Name stays disabled until there is something to save.** The typed
  value, trimmed, must differ from the saved name, so outer whitespace alone
  is no change, since the service trims it away.
- **Busy while it saves.** The button reads "Saving Name", carries
  `aria-busy` and the `.spinner`, and is disabled from the press to the
  answer: the owner's rule for every Save button.
- **The answer is the new baseline.** `setName` answers the renamed row, and
  the field and the comparison take its `name`, as stored, trimmed. A
  "Saved your name." `<output>` says it worked, and Save is disabled again.
- The typed value goes to the server untouched. Trimming and the length rule
  are the service's, in `src/modules/identity/validation/name.ts`, shared with
  the server so the two cannot drift.

## Two error surfaces

As in EmailForm ([`email-form.md`](email-form.md), "Two error surfaces"), a
`VALIDATION` issue pathed to `name` lands beneath the input, which references
it through `aria-describedby` and sets `aria-invalid`. Anything else, such as
the `FORBIDDEN` a provisional account would meet, goes to the `role="alert"`
region in the server's words, or to `GENERIC_NAME_ERROR` when there are none.

## Styling

Tokens only until the account page's design review (MB.117). `.name-form` is
a column, and the field, notices and button are the form primitives'.

## Testing

`tests/components/NameForm/index.test.tsx`, by role and label against MSW,
which answers in the route's own error shape. It covers the prefill, nothing
to save until a real change, the save and its new baseline, the busy button
held from before the save, and both error surfaces. The page around it is
`tests/app/account/page.test.tsx`, and `tests/e2e/account.spec.ts` scans
the page holding it with axe in a real browser.
