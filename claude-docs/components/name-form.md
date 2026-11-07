# NameForm

`src/components/NameForm/` is the account page's Name section: the
name the site shows for the account, and the one field that changes it.
Server component `src/app/(shell)/account/page.tsx` reads the row with `getMe` and
hands down `name`. This component does the rendering and the `setName`
mutation.

## Props

`name`: the row's name. It is the field's starting value, and what "unchanged" compares against until a save answers with the stored name.

The section's heading, "Name", and its intro, "The name Sorrel & Salt shows
for you.", are the page's, not the component's. The field is labelled "Name"
by its own `<label>`, so the label and the heading read the same.

## Saving

- **Save Name stays disabled until there is something to save.** The typed
  value, trimmed, must differ from the saved name, so outer whitespace alone
  is no change, since the service trims it away.
- **Busy while it saves.** The row is the shared `FormActions`
  ([`field.md`](field.md), "Form actions"); its Save, a `BusyButton`, reads "Saving Name", carries
  `aria-busy` and the `.spinner`, and is disabled from the press to the
  answer.
- **The answer is the new baseline.** `setName` answers the renamed row, and
  the field and the comparison take its `name`, as stored, trimmed. A
  "Your name was saved." `<output>` says it worked, and Save is disabled again.
- The typed value goes to the server untouched. Trimming and the length rule
  are the service's, in `src/modules/identity/validation/name.ts`, shared with
  the server so the two cannot drift.

## Two error surfaces

As in EmailForm ([`email-form.md`](email-form.md), "Two error surfaces"), a
`VALIDATION` issue pathed to `name` lands beneath the input, which references
it through `aria-describedby` and sets `aria-invalid`. Anything else, such as
the `FORBIDDEN` a provisional account would meet, goes to the `role="alert"`
region in the server's words, or to `GENERIC_FAILURE` when there are none.
The reading is the shared `readGraphqlFailure(error, ['name'])`
(`src/lib/graphql-failure.ts`), and both notices are the `Notice` component
([`notice.md`](notice.md)).

## Styling

`.name-form` is
a column; its width is the account page's `.page-frame--narrow`, its ground
the section's `.panel`, and the field, notices and button are the form
primitives', the field drawn by the shared `FieldShell` around the form's own
input ([`field.md`](field.md)).

## Stories and tests

`src/components/NameForm/index.stories.tsx` renders inside the account page's real frame; nothing is mocked, so a submit in the workshop fails into the alert region. `tests/components/NameForm/index.test.tsx` runs against MSW, which answers in the route's own error shape; the page is `tests/app/(shell)/account/page.test.tsx`, and `tests/e2e/account.spec.ts` scans it with axe.
