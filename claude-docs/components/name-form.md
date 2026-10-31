# NameForm

`src/components/NameForm/` is the account page's Name section (MB.88): the
name the site shows for the account, and the one field that changes it.
Server component `src/app/(shell)/account/page.tsx` reads the row with `getMe` and
hands down `name`. This component does the rendering and the `setName`
mutation.

## The props contract

| Prop   | Meaning                                                                                                                        |
| ------ | ------------------------------------------------------------------------------------------------------------------------------ |
| `name` | The row's `name`. The field's starting value, and what "unchanged" compares against until a save answers with the stored name. |

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
  answer: the owner's rule for every Save button.
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

Designed in the sign-in and account pages' review (MB.116). `.name-form` is
a column; its width is the account page's `.page-frame--narrow`, its ground
the section's `.panel`, and the field, notices and button are the form
primitives', the field drawn by the shared `FieldShell` around the form's own
input ([`field.md`](field.md)).

## Stories

[`index.stories.tsx`](../../src/components/NameForm/index.stories.tsx), titled
"Account / Name Form": `States`, with a control that chooses Default (the name the provider gave, nothing to save
until edited) or Long Name. Each renders inside the app shell and the account page's real frame, heading, side nav, section and panel, as
`src/app/(shell)/account/page.tsx` writes them. Nothing is mocked: a submit in
the workshop fails into the alert region. Render-only, no test ids, no
snapshots.

## Testing

`tests/components/NameForm/index.test.tsx`, by role and label against MSW,
which answers in the route's own error shape. It covers the prefill, nothing
to save until a real change, the save and its new baseline, the busy button
held from before the save, and both error surfaces. The page around it is
`tests/app/(shell)/account/page.test.tsx`, and `tests/e2e/account.spec.ts` scans
the page holding it with axe in a real browser.
