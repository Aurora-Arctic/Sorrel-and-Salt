# Field

`src/components/Field/` — one form field's block, written once: the label,
the required mark, the hint's info tip, a note, the control, and its error,
tied to each other by id. MB.115 lifted it out of `IngredientForm`, which had
the one good copy, once the same block had been written by hand fifteen
times across the admin forms and the account forms.

It has two ways in:

- **The shell**, `FieldShell` with `fieldDescription`, knows no form library.
  A plain-state form (one holding its values in `useState`, such as NameForm
  and EmailForm) renders it around its own control.
- **The react-hook-form fields**, `TextField` and `SelectField`, read the
  form through `useFormContext`, so they work inside any form wrapped in a
  `<FormProvider>`. Each draws the shell around its control and reads its own
  error out of the form state.

`IngredientForm`'s three fields of its own, `SuggestField`,
`MultiSelectField` and `ListField`, stay in `IngredientForm/fields.tsx` on
the same shell until its design review (MB.120).

| File               | What it holds                                                                       |
| ------------------ | ----------------------------------------------------------------------------------- |
| `index.tsx`        | The exports, below                                                                  |
| `shell.tsx`        | `FieldShell`, `FieldError`, `Required`: no hook, so a server component may use them |
| `description.ts`   | `fieldDescription`                                                                  |
| `use-field.ts`     | `useField`, `fieldDescription` over a react-hook-form field's own error             |
| `text-field.tsx`   | `TextField`                                                                         |
| `select-field.tsx` | `SelectField`                                                                       |
| `types.ts`         | The props, and `SelectOption`                                                       |

## The exports

| Name               | What it is                                                                                                    |
| ------------------ | ------------------------------------------------------------------------------------------------------------- |
| `FieldShell`       | The `.field` block around a control the caller renders                                                        |
| `FieldError`       | The `.field__error` paragraph, rendered only when there is a message                                          |
| `Required`         | The `*` after a label, hidden from assistive technology                                                       |
| `fieldDescription` | The field's ids and the control's `aria-describedby` and `aria-invalid`, from a base id and what describes it |
| `useField`         | `fieldDescription` for a react-hook-form field, its error read by name                                        |
| `TextField`        | An input, or a textarea with `multiline`, in a react-hook-form form                                           |
| `SelectField`      | A closed set on Combobox's select-only box, or its type-ahead box, in a react-hook-form form                  |

## Props

Every field takes `FieldProps` (`types.ts`):

| Prop       | What it is                                                                             |
| ---------- | -------------------------------------------------------------------------------------- |
| `label`    | The label, title case: "Email Address"                                                 |
| `hint`     | Optional: what the field is for, behind an info tip beside the label                   |
| `note`     | Optional: a state the field is in, such as why it is shut, as a line beneath the label |
| `required` | Optional: marked required beside its label, and to assistive technology                |

`FieldShell` adds what `fieldDescription` returns (`controlId`, `labelId`,
`hintId`, `noteId`, `errorId`, `error`), `children` (the control), `after`
(drawn beneath the error) and `className`, a class beside `field` on the
block: a filter's type-ahead takes `filter-row__typeahead`
([`filter-form.md`](filter-form.md), "Styling").

`fieldDescription({ id, hint, note, describedBy, error, invalid })` takes a
base id from `useId()` and returns those ids, the error, and `aria`, to spread
on the control:

```tsx
const { aria, ...field } = fieldDescription({ id: useId(), error });
<FieldShell label="Name" required {...field}>
  <input id={field.controlId} className="input" aria-required {...aria} />
</FieldShell>;
```

`TextField` adds `name`, `placeholder`, `multiline`, `rows` (a textarea's height in lines, where its prose outgrows the primitive's 6rem: the compendium's Description takes 10), `type` (`text`, `date`, `url`),
`disabled`, `deps`, `describedBy`, `invalid`, `after`, `format` (a tidy run
as the field is left) and `autoComplete`. `SelectField` adds `name`,
`options`, `placeholder`, `typeahead`, `deps` and `onChange`; `typeahead`
draws the set on Combobox's type-ahead box, typed into to narrow it, for a
set long enough to want a search: `GroupedValueForm`'s group, a category's or
a form's Group and a deity's Tradition (MB.115). Its text
naming no option is no value, so a required one shows its error on save as
an unchosen one does ([`combobox.md`](combobox.md), "The type-ahead box"). Both are generic over the
form's values, `TextField<IngredientFormValues>`, so `name` is checked
against the form's own paths; left out, any string passes.

## Contracts

- **The control names its hint, note and error** in `aria-describedby`, and
  carries `aria-invalid` while there is an error. `aria-invalid` is what draws
  the error edge, so the markup that makes the error announced is the markup
  that makes it visible ([`styling.md`](../styling.md), "Form fields").
- **The hint is read whether its tip is open or not**: the tip's text stays in
  the page, `aria-hidden` while closed, and the control lists its id
  ([`info-tip.md`](info-tip.md)).
- **Required is `aria-required` on the control and a `*` for the eye.** The
  asterisk is `aria-hidden`, so a screen reader hears "Name, required" rather
  than "Name star". The control takes `aria-required`, not `required`, whose
  `:invalid` would mark an empty field before anyone tried to save. Putting
  `aria-required` on the control is the caller's part when it renders its
  own; `TextField` and `SelectField` do it themselves.
- **A field is optional unless it is marked required**, so a label never
  says "(Optional)": `required` is the only mark, and a field without it may
  be left empty (the owner's call at MB.115's review; [`styling.md`](../styling.md),
  "Form fields"). What a field is for goes in `hint`, behind the info tip, not
  in the label.
- **Every text, select and type-ahead field has a placeholder: a short action,
  never a description.** One or two words, three short ones at most, in
  sentence case: "Add a name", "Choose a group", "Search names". A
  multi-line prose box, a description, may take a fuller one-line prompt
  for what to write instead, specific to what it describes: "What this
  category covers", "What sets this form apart". It stays a prompt, never
  instructions or examples (the owner's call). What the field is for, what to type, examples and limits go in
  `hint`, the info tip beside the label, and never in the placeholder or a
  `note`, which stays for a live state such as why a field is shut (the
  owner's call at MB.115's review). The label stays the accessible name:
  `TextField` and `SelectField` take `placeholder`, and a plain-state
  form sets it on its own control, since `FieldShell` draws none. A
  `date` field is the exception: the browser draws its own format there. A
  box holding several values names one, "Add a planet", and keeps it
  after the chips while it can take another, prompting for the next
  ([`combobox.md`](combobox.md)).
- **A react-hook-form field re-renders for its own error only**: `useField`
  reads the form state by the field's name.
- **`disabled` is the attribute**, not react-hook-form's option, which would
  also drop the value from what is validated and sent.

## Styling

None of its own: the block is the field primitives (`.field`,
`.field__label`, `.field__hint`, `.field__error`, `.input`, `.textarea`),
with `.field__label-row` holding the label and its tip, positioned so the tip
can place itself above it, and `.field__required` the asterisk
([`styling.md`](../styling.md), "Form fields").

## Stories

[`index.stories.tsx`](../../src/components/Field/index.stories.tsx), `Forms /
Field`: `TextField` as `Default`, `Required`, `WithHint`, `WithNote`,
`WithError`, `Multiline` and `Disabled`, each in a `FormProvider`; and
`PlainShell`, the shell around a native input with an error.

## Testing

No file of its own: the forms that use it cover it (claude-docs/testing/layer-ownership.md,
"What a test may assert", rule 5). `tests/components/IngredientForm/` covers
`TextField` and `SelectField`, and `tests/components/GroupedValueForm/` (with
`tests/support/grouped-value-form.tsx`) its `typeahead`; the NameForm and EmailForm tests cover the
shell around a plain control.
