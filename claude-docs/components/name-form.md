# NameForm

`src/components/NameForm/` is the account page's Name section: the
name the site shows for the account, and the one field that changes it.
`src/app/(shell)/account/page.tsx` reads the row with `getMe` and hands down `name`;
this component does the rendering and the `setName` mutation. The section's heading
and intro are the page's, not the component's.

## Saving

- **Save Name stays disabled until there is something to save.** The typed
  value, trimmed, must differ from the saved name, so outer whitespace alone
  is no change, since the service trims it away.
- The row is the shared `FormActions` ([`field.md`](field.md), "Form actions").
- **The answer is the new baseline.** `setName` answers the renamed row, and
  the field and the comparison take its `name`, as stored, trimmed.
- The typed value goes to the server untouched. Trimming and the length rule
  are the service's, in `src/modules/identity/validation/name.ts`, shared with
  the server so the two cannot drift.

## Two error surfaces

As in EmailForm ([`email-form.md`](email-form.md), "Two error surfaces"), a
`VALIDATION` issue pathed to `name` lands beneath the input. Anything else, such as
the `FORBIDDEN` a provisional account would meet, goes to the `role="alert"`
region in the server's words, or to `GENERIC_FAILURE` when there are none.
The reading is the shared `readGraphqlFailure(error, ['name'])`
(`src/lib/graphql-failure.ts`), and both notices are the `Notice` component
([`notice.md`](notice.md)).

The story does not mock the request: a submit in the workshop fails into the alert region.
