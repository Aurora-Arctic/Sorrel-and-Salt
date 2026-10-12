# Field

`src/components/Field/` — one form field's block, written once: the label,
the required mark, the hint's info tip, a note, the control, and its error,
tied to each other by id. MB.115 lifted it out of `IngredientForm`, which had
the one good copy, once the same block had been written by hand fifteen
times across the admin forms and the account forms.

It has five ways in:

- **The shell**, `FieldShell` with `fieldDescription`, knows no form library.
  A plain-state form (one holding its values in `useState`, such as NameForm
  and EmailForm) renders it around its own control.
- **The react-hook-form fields**, `TextField` and `SelectField`, read the
  form through `useFormContext`, so they work inside any form wrapped in a
  `<FormProvider>`. Each draws the shell around its control and reads its own
  error out of the form state.
- **The switch**, `SwitchField`, an on-or-off choice held in the caller's
  own state or left to the checkbox: a list filter's No Refs and Needs
  Approval (MB.115).
- **The search box**, `SearchField`, a list filter's text box with its own
  submit, a magnifier named Search, at its end (MB.115).
- **The filter select**, `FilterSelectField`, a list filter's closed set: a
  native select from the server, and Combobox's select-only box or
  type-ahead once hydrated (MB.115).

`IngredientForm`'s three fields of its own, `SuggestField`,
`MultiSelectField` and `ListField`, stay in `IngredientForm/fields.tsx` on
the same shell until its design review (MB.120).

| File                      | What it holds                                                                       |
| ------------------------- | ----------------------------------------------------------------------------------- |
| `index.tsx`               | The exports, below                                                                  |
| `shell.tsx`               | `FieldShell`, `FieldError`, `Required`: no hook, so a server component may use them |
| `description.ts`          | `fieldDescription`                                                                  |
| `use-field.ts`            | `useField`, `fieldDescription` over a react-hook-form field's own error             |
| `text-field.tsx`          | `TextField`                                                                         |
| `select-field.tsx`        | `SelectField`                                                                       |
| `radio-group-field.tsx`   | `RadioGroupField`                                                                   |
| `switch-field.tsx`        | `SwitchField`                                                                       |
| `search-field.tsx`        | `SearchField`                                                                       |
| `filter-select-field.tsx` | `FilterSelectField`                                                                 |
| `icons.tsx`               | `MagnifierIcon`, the search's mark                                                  |
| `types.ts`                | The props, and `SelectOption`                                                       |

## The exports

| Name                | What it is                                                                                                    |
| ------------------- | ------------------------------------------------------------------------------------------------------------- |
| `FieldShell`        | The `.field` block around a control the caller renders                                                        |
| `FieldError`        | The `.field__error` paragraph, rendered only when there is a message                                          |
| `Required`          | The `*` after a label, hidden from assistive technology                                                       |
| `fieldDescription`  | The field's ids and the control's `aria-describedby` and `aria-invalid`, from a base id and what describes it |
| `useField`          | `fieldDescription` for a react-hook-form field, its error read by name                                        |
| `TextField`         | An input, or a textarea with `multiline`, in a react-hook-form form                                           |
| `SelectField`       | A closed set on Combobox's select-only box, or its type-ahead box, in a react-hook-form form                  |
| `RadioGroupField`   | One choice from a few, each radio with a line saying what it means, in a `.fieldset`                          |
| `SwitchField`       | An on-or-off choice as a slide toggle, its label above, in a plain-state form                                 |
| `FormActions`       | A form's row of actions: Save, any further saves, Cancel and Delete                                           |
| `ReasonField`       | An admin change's optional Reason, in a plain-state form                                                      |
| `SearchField`       | A list filter's search box, its submit a magnifier at the box's end                                           |
| `FilterSelectField` | A list filter's closed set: a native select from the server, a select-only box or type-ahead once hydrated    |

### `FormActions`

The row beneath a form, written once for the four forms that drew their own
(MB.115): `GroupForm`, `GroupedValueForm`, `IngredientForm` and its reference
panel. Save is first, "Save Group", off until `dirty` and while
`submitting`, and busy from the press to the answer, "Saving Group" with the
spinner (`BusyButton`), the owner's rules for every form (M5.6); a form with
several saves passes `busy` for the one pressed, its `saveValue`, and the
others as children, between Save and Cancel, as the ingredient form's Save &
Add Another is. Save is the form's submit, or with `onSave` a plain button,
for the reference panel, which sits inside the ingredient form's own `<form>`.
Cancel, quiet, is drawn when `onCancel` is given and calls it: each form
passes its discard guard's `request` (claude-docs/components/modal.md,
"Unsaved changes"), and `holdCancel` makes it wait while a save is in flight,
as the panel's does. Delete, `.btn--destructive` and `.form__aside` at the far
end, is drawn when `onDelete` is given, "Delete Group", and asks the form's
own question. The row is `.form__actions`, which wraps, so a third button
never squeezes it.

### `ReasonField`

The optional Reason an admin gives a change (MB.115): a text box under
"Reason", "Add a reason" its placeholder, held by the caller in plain state,
its hint behind the ⓘ saying where the reason is kept, by default "Kept with
the change in the record of who changed what." The invitation form passes its
own `hint`, since an invitation's reason is kept with the invitation first.
`UserList`'s confirmed actions and the invitation form use it; the wrapper
takes the caller's class, which holds the field's room above and below.

### `FilterSelectField`

A list filter's closed set, written once for the five selects the admin
filters drew by hand (MB.115): the user list's Role, the ledger's
Privilege, the compendium's Classification and Form, and the curated
lists' group. The server, and the render that hydrates, draw a native
`<select>` whose first choice, `all` ("All Roles"), is blank, so a press on
the search's magnifier before the script loads sends `role=` and the page
reads no filter; the rest are `options`. Once hydrated, told apart by
`useHydrated()` (`src/lib/hydrated.ts`), the browser draws one of
Combobox's boxes instead, so every closed set in the row has one dropdown
look (the owner's call at MB.115's review): the select-only box
([`combobox.md`](combobox.md), "The select-only box"), its first choice
`all` again, or with `typeahead`, for a set long enough to want a search,
the type-ahead box ("The type-ahead box"), `all` its placeholder and its
clear the way back to blank. A hidden input then carries the same
parameter. Each starts from `defaultValue`, the value the page shows, and
calls `onChange` once a choice other than it is picked, or for the
type-ahead settles, since the list keys its filter by the filter shown and
draws it again from the new one ([`filter-form.md`](filter-form.md)). A
change to the server's select before hydration applies nothing until the
magnifier is pressed. Every form of it stands in `filter-row__choice`,
one width, so the swap moves nothing. Not `SelectField`: a filter has no
form state, and its select must submit natively.

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
(drawn beneath the error), `action` (a control at the right end of the label
row, after the tip: an ingredient variant's Copy From Ingredient, MB.115) and `className`, a class beside `field` on the
block: a filter's type-ahead takes `filter-row__choice`
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

`TextField` adds `name`, `placeholder`, `multiline`, `rows` (a textarea's height in lines, where its prose outgrows the primitive's 6rem: the compendium's Description and each variant's take 7), `type` (`text`, `date`, `url`),
`disabled`, `deps`, `describedBy`, `invalid`, `after`, `action`, `format` (a tidy run
as the field is left) and `autoComplete`. `SelectField` adds `name`,
`options`, `placeholder`, `typeahead`, `deps` and `onChange`; `typeahead`
draws the set on Combobox's type-ahead box, typed into to narrow it, for a
set long enough to want a search: `GroupedValueForm`'s group, a category's or
a form's Group and a deity's Tradition (MB.115). Its text
naming no option is no value, so a required one shows its error on save as
an unchosen one does ([`combobox.md`](combobox.md), "The type-ahead box"). Both are generic over the
form's values, `TextField<IngredientFormValues>`, so `name` is checked
against the form's own paths; left out, any string passes.

`RadioGroupField` (`RadioGroupFieldProps`, M6.13) takes a `legend`, the
radios' shared `name`, `options` (`value`, `label`, optional `description`),
the chosen `value` held by the caller, and `onChange(value)`. A native radio
group in a `.fieldset.radio-group`: each radio is a small ring whose centre dot, in the
accent green, grows in with only a thin gap to the ring over the switch's `$motion-short` ease
(none under reduced motion), the dot as well as the colour carrying the
choice. The description is `aria-describedby`. The group carries
`margin-block: 1.5rem`, the owner's call. First used by the members page's
Promote and Demote modal.

`SwitchField` (`SwitchFieldProps`) takes `label`, `name` and `value`, what
it submits while on (`1`, or empty for a bare flag such as `awaiting=`),
`onChange(checked)`, `disabled`, and either `checked`, held by the caller,
or `defaultChecked`, the state it is first drawn in, the native checkbox
holding it after. A list filter takes `defaultChecked`: the switch applies
the filter on its change, and the new list draws the filter again, switch
and all, from the filter it shows, so there is no state of the caller's to
keep ([`filter-form.md`](filter-form.md)). It draws a `.field`
block of its own rather than `FieldShell`, since it has no hint, note or
error and its label takes the press feedback: the label above, tied to the
toggle by `htmlFor`, and the toggle, a native checkbox with
`role="switch"`, beneath it in `.switch__control`, centred under the label. The label is its
accessible name and a click on it turns it; the label and the toggle are
each marked `data-pressed` while a pointer holds them
(`src/lib/press-feedback.ts`). It writes no `aria-checked`: the native
checked state is the switch's, and one written beside it would go stale on
a press before hydration, so the lint rule asking for it is switched off on
that line with the reason.

`SearchField` (`SearchFieldProps`) takes `label`, `name` (the parameter
the text submits under, `query`), `placeholder`, `value` and
`onChange(value)`, the text held by the caller, and an optional `id`, the
base its ids grow from, its own `useId()` when left out. It draws
`FieldShell` around one box, `.input.search-field`: a borderless
`type="search"` input and, at its end, a `type="submit"` button holding
`MagnifierIcon` (`aria-hidden`) and the visually hidden text "Search", its
accessible name. The submit is its form's, so in a `FilterForm` the search
applies by a press on the mark, which a first-time user can see, or by
Enter, which a text box sends natively in a form with a submit button, and
before hydration the same press sends the whole form as a GET. It is never
disabled: the same text again reads the list again, which is harmless. The
button carries an id, `<control id>-submit`.

`FilterSelectField` (`FilterSelectFieldProps`) takes `label`, `name`, `all`
(the blank first choice, and a type-ahead's placeholder), `options`
(`SelectOption`s, the same shape `SelectField` takes, so a list's one
label list, `ROLE_LABELS` say, is passed as it is), `defaultValue`,
`onChange(value)` and `typeahead`. `onChange` hands over the raw string; a
caller narrowing it to its own type reads it with `oneOf`
(`src/lib/search-params.ts`), as the page reads the address.

## Contracts

- **The control names its hint, note and error** in `aria-describedby`, and
  carries `aria-invalid` while there is an error, which also draws the error
  edge ([`styling.md`](../styling.md), "Form fields").
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
  be left empty (the owner's call at MB.115's review). What a field is for goes in `hint`, behind the info tip, not
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
  box holding several values names one, "Add a body", and keeps it
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
([`styling.md`](../styling.md), "Form fields"). `SwitchField` is the
`.switch` primitive, its toggle's states set out there. `SearchField` is
`.search-field`, beside it in the primitives rather than a stylesheet of
the folder's own, since the folder has none: the box is `.input`'s edge and
fill on a flex row, as Combobox's control is, the inner input borderless
and taking the row's rest, the box drawing the input's focus ring, and the
submit an `icon-button`, a `$icon-size` target in the muted ink, the
accent when pointed at or focused.

## Stories

[`index.stories.tsx`](../../src/components/Field/index.stories.tsx), `Forms /
Field`: `TextField` as `Default`, `Required`, `WithHint`, `WithNote`,
`WithError`, `Multiline` and `Disabled`, each in a `FormProvider`;
`PlainShell`, the shell around a native input with an error; `Switch`,
`SwitchField` off, on, and disabled off and on; `Actions`, `FormActions` with
nothing to save, with something to save and Delete, and saving; `Reason`,
`ReasonField`; `SearchBox`, `SearchField` in a form that goes nowhere; and
`FilterSelect`, `FilterSelectField` as a select and as a type-ahead in a
filter row.

## Testing

No file of its own: the forms that use it cover it (claude-docs/testing/layer-ownership.md,
"What a test may assert", rule 5). `tests/components/IngredientForm/` covers
`TextField` and `SelectField`, and `tests/components/GroupedValueForm/` (with
`tests/support/grouped-value-form.tsx`) its `typeahead`; the NameForm and EmailForm tests cover the
shell around a plain control. `FormActions` is covered by the forms that use
it, `ReasonField` by the UserList and AdminInvitations tests. The CompendiumList and UserList tests cover
`SwitchField`, found by its `switch` role: turned by a click, sent with the
form, the server's before hydration included, applying the filter on its change, and
`aria-disabled` while a list is on its way. Space is the platform's and
jsdom does not run it, so it was checked in the workshop's Chromium. The
lists' tests cover `SearchField` too, found by its `searchbox` role and its
`Search` button: the submit applying the search, and the button in the
server's markup. They cover `FilterSelectField` by the address each
pick applies, its options and its name in the form, and the native select
in the server's markup swapped once hydrated for the select-only box or
the type-ahead.
