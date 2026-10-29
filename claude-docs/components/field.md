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

Four fields grown by `IngredientForm`, `SuggestField`, `MultiSelectField`,
`ListField` and `ToggleField`, stay in `IngredientForm/fields.tsx` on the same
shell; `CupboardEntryForm` imports `ListField` and `MultiSelectField` from
there. MB.120 kept them there rather than make them generic fields here (the
owner, 2026-10-20).

| File                       | What it holds                                                                              |
| -------------------------- | ------------------------------------------------------------------------------------------ |
| `index.tsx`                | The exports, below                                                                         |
| `shell.tsx`                | `FieldShell`, `FieldError`, `Required`: no hook, so a server component may use them        |
| `description.ts`           | `fieldDescription`                                                                         |
| `use-field.ts`             | `useField`, `fieldDescription` over a react-hook-form field's own error                    |
| `text-field.tsx`           | `TextField`                                                                                |
| `select-field.tsx`         | `SelectField`                                                                              |
| `radio-group-field.tsx`    | `RadioGroupField`                                                                          |
| `switch-field.tsx`         | `SwitchField`                                                                              |
| `search-field.tsx`         | `SearchField`                                                                              |
| `filter-select-field.tsx`  | `FilterSelectField`                                                                        |
| `icons.tsx`                | `MagnifierIcon`, the search's mark (`UndoIcon` and `RedoIcon` live in `IconTip/icons.tsx`) |
| `form-history.ts`          | The history's reducer: what a step is, when two edits join, the 100-step cap               |
| `use-form-history.ts`      | `useFormHistory`: records a form's changes, puts them back, owns focus and the chords      |
| `form-history-context.ts`  | `FormHistoryContext` and `useFormHistoryContext`                                           |
| `form-history-buttons.tsx` | `FormHistoryButtons`: Undo, Redo and the live region                                       |
| `types.ts`                 | The props, and `SelectOption`                                                              |

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
own question. `aside` draws whatever it is given in `.form__aside` after
Delete, at the far end: the Annotate dialog's More menu (M8.17). In a narrow form's stacked foot the aside is a column too, so what it holds runs full width with the rest. The row is `.form__actions`, which wraps, so a third button
never squeezes it. A form that does something other than save renames its
submit with `label` and `busyLabel`, in title case: the admin invitation form
passes "Send Invitation" and "Sending" (MB.119), so it draws this row rather
than its own. `noun` still names Delete, on a form that has one.

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

| Prop          | What it is                                                                                                                                                                                 |
| ------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| `label`       | The label, title case: "Email Address"                                                                                                                                                     |
| `hint`        | Optional: what the field is for, behind an info tip beside the label                                                                                                                       |
| `note`        | Optional: a state the field is in, such as why it is shut, as a line beneath the label                                                                                                     |
| `required`    | Optional: marked required beside its label, and to assistive technology                                                                                                                    |
| `labelSuffix` | Optional: read after the label, out of sight ("Quantity, Flower"), and in the hint's tip name. For a field drawn once per row, so two rows' fields never share a name (M9.9's StockDialog) |

There is no size prop: every field is full size. The one shorter field, the StockDialog's Add Form, wears the `.field--compact` class itself (`_primitives.scss`); the owner removed StockFields' compact rows, and Field's `size` with them, on 2026-10-20.

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

`TextField` adds `name`, `placeholder`, `multiline`, `rows` (a textarea's height in lines, where its prose outgrows the primitive's 6rem: the compendium's Description and each variant's take 7), `type` (`text`, `date`, `url`, `number`: any decimal, held as the text typed),
`disabled`, `deps`, `describedBy`, `invalid`, `after`, `action`, `format` (a tidy run
as the field is left), `autoComplete` and `busy` (its text is being looked up: the
[`Spinner`](spinner.md) inside the box at its right end, shown after 100ms so a quick answer
never flashes it, and the input `aria-busy`; the name's duplicate check, the owner's
call of 2026-10-18). `SelectField` adds `name`,
`options` (each `{ value, label, icon?, disabled?, note? }`, a disabled one listed and not
choosable, its `note` saying why), `placeholder`, `typeahead`, `disabled` (the select-only box only: Combobox's shut `ComboboxSelect`, for the StockDialog's stand-in Unit before a form is chosen), `deps` and `onChange`; `typeahead`
draws the set on Combobox's type-ahead box, typed into to narrow it, for a
set long enough to want a search: `GroupedValueForm`'s group, a category's or
a form's Group and a deity's Tradition (MB.115). Its text
naming no option is no value, so a required one shows its error on save as
an unchosen one does ([`combobox.md`](combobox.md), "The type-ahead box"). Both are generic over the
form's values, `TextField<IngredientFormValues>`, so `name` is checked
against the form's own paths; left out, any string passes.

`RadioGroupField` (`RadioGroupFieldProps`, M6.13) takes a `legend`, the
radios' shared `name`, `options` (`value`, `label`, optional `description`, optional `icon`, a mark drawn before the label and outside its accessible name),
the chosen `value` held by the caller, and `onChange(value)`. A native radio
group in a `.fieldset.radio-group`: each radio is a small ring whose centre dot, in the
accent green, grows in with only a thin gap to the ring over the switch's `$motion-short` ease
(none under reduced motion), the dot as well as the colour carrying the
choice. The description is `aria-describedby`. An optional `note` (M7.4) is a line
for the whole group, such as the invite dialog's "an owner is made afterwards", set as the
fieldset's own `aria-describedby` so it is read with the group. The group carries
`margin-block: space(5)`, which is 1.5rem, where nothing else spaces it, as in
a confirm's modal. As a direct child of a `.form` it carries none, because the
form's gap spaces it like any field (MB.119). First used by the members page's
Promote and Demote modal.

`layout="strip"` (M12.7) draws the same group as one segmented bar of
icon-only segments (`icon`, here the whole of the choice's picture), for a
choice that is seen before it is read: a form group's icon. The chosen
segment is filled with the accent and its icon takes `$text-on-color`; the
chosen option's label is printed beneath the bar in muted text
(`.radio-strip__chosen`, `aria-hidden` because the checked radio already
names the choice). A `description` is not drawn in this layout. The owner
chose it over a row of labelled tiles, which wrapped unevenly over two rows
(2026-10-16). It is a radio underneath, not a row of buttons: each segment is a
`label` wrapping a visually hidden native `input type="radio"`, with the
option's label in a visually hidden span, so the arrow keys, the "2 of 3" a
screen reader announces, `checked`, the form's reset and the label query all
come from the browser, with no ARIA to keep right. The segment's fill and
focus ring follow the radio through `:has()` on its state, in
`.radio-group--strip`, `.radio-strip` and `.radio--segment` in
`_primitives.scss` beside `.radio`. A note is kept under the bar. Each
segment wears its option's label in an [`IconTip`](icon-tip.md) above it, on
hover and on its radio's focus, for a sighted person who cannot tell the icons
apart (the owner's call, 2026-10-16); the radio keeps its own name, so the tip
is decoration. The tips need the bar unclipped, so `.radio-strip` has no
`overflow: hidden`: the end segments round their own corners, and the
dividers are counted on the tips' wrappers.

`layout="segmented"` (M12.4) is the same bar with the option's name in text
rather than an icon, for the compendium filter's Match (All, Any) and Toxic
(Any, Toxic, Not Toxic). It reuses `.radio-strip` and `.radio--segment`, so the
chosen segment is the same accent fill, with `.radio--text` letting the
segment grow to its text and not wrap. An option's optional `count` (a
`RadioOption` field) reads after its name as a bare number at the caption size, "Toxic 4", the space a text node of
the label's so that the radio's accessible name keeps it; the count is muted
while the segment is unchosen. It prints no chosen caption: the name is
already on the bar. Titles are title case ("Not Toxic"), and the strip is
still native radios, so the arrow keys, `checked` and a form's GET submission
before the script loads all come from the browser. Its segments are the bar's own children, so the dividers and rounded ends are counted on them (`.radio-strip--text`), the bar is `$control-height` tall, and the legend takes a field label's weight and gap, so a row of mixed controls shares one top. An optional `hint` on any group draws an InfoTip beside the legend and joins the fieldset's `aria-describedby`; `disabled` disables the whole group, as the filter's Toxic does when a count is zero, with a hint saying why. Story: `RadioSegmented`.

`SwitchField` (`SwitchFieldProps`) takes `label`, `name` and `value`, what
it submits while on (`1`, or empty for a bare flag such as `awaiting=`),
`onChange(checked)`, `disabled`, an optional `hint`, an optional `note`, and either `checked`, held by the caller,
or `defaultChecked`, the state it is first drawn in, the native checkbox
holding it after. A list filter takes `defaultChecked`: the switch applies
the filter on its change, and the new list draws the filter again, switch
and all, from the filter it shows, so there is no state of the caller's to
keep ([`filter-form.md`](filter-form.md)). It draws a `.field`
block of its own rather than `FieldShell`, since it has no error and its
label takes the press feedback. A `note` (M10.13) is a line under the
toggle saying what its state means, in `.field__hint` and named in the
toggle's `aria-describedby`, as `RadioGroupField`'s note is: the spell
builder's Share With the Coven switch says by it who can see the spell. A `hint` puts the label in a
`.field__label-row` beside an InfoTip, as `FieldShell` does, and names the
tip in the toggle's `aria-describedby`; a filter switch takes none. The rest: the label above, tied to the
toggle by `htmlFor`, and the toggle, a native checkbox with
`role="switch"`, beneath it in `.switch__control`, centred under the label, which lines a filter bar's switch up among its boxes; the ingredient form sets its Toxic switches and their labels at the start of the column instead ([`ingredient-form.md`](ingredient-form.md), "Styling"), and the spell builder its Share With the Coven switch ([`spell-builder.md`](spell-builder.md), "Visibility"). The label is its
accessible name and a click on it turns it; the label and the toggle are
each marked `data-pressed` while a pointer holds them
(`src/lib/press-feedback.ts`). It writes no `aria-checked`: the native
checked state is the switch's, and one written beside it would go stale on
a press before hydration, so the lint rule asking for it is switched off on
that line with the reason. Space is the platform's. Enter, which on a native
checkbox would only submit the form around it, is cancelled and answered with
a click, so it turns the switch exactly as a press does and submits nothing
(MB.261).

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

## Errors wait for an edit and a leave

`errorShown` is the one rule for whether a field's error is drawn: the form has been submitted, or the field has been **left** (`touchedFields`) and has **ever been edited** by the person since the form started. A required field passed through with Tab stays quiet; one typed into, emptied and left shows "Required". A field made invalid by another field (a classification pick raising the formal-name rule) stays quiet until it is edited and left itself, or the form is submitted. Keyboard and pointer behave the same.

"Edited" is a record, not a comparison with the default. react-hook-form's `dirtyFields` was tried and rejected: it unsets a field whose value returns to its default, so a name typed and deleted read as never edited and its error stayed hidden. `useEditedFields(form.subscribe)` instead notes every field path that received a `change` event (it asks `subscribe` for `values`, which makes react-hook-form send each input event's `name` and `type`), and the form hands the set down through `EditedFieldsContext`. A `setValue` call, which undo and redo restore through, carries no event type and so does not count as an edit. The form calls `clear()` beside every `reset`, so a restarted form is quiet again. With no provider the context is null and the rule falls back to touched alone, so other forms are unchanged.

## Errors wait for the pointer

A field's error is drawn once the field is left and has been edited (`errorShown`, below), and pressing another control leaves it on the press. The error line then pushes everything below it down before the button comes up, so the click lands on whatever slid under the pointer: a press on Classification with Name empty never opened it. `useField` therefore keeps what it draws as it stood when the press began (`useSettledWhilePressed`, over `usePointerHeld`: one set of document listeners for `pointerdown`, `pointerup`, `pointercancel` and the window's `blur`) and catches up on the release: an error already showing stays, one just raised waits. Merely hiding errors during a press would take a showing one away and move the controls the other way, which read as errors flickering on every focus change. Tab shows an error at once (for an edited field), as no press is in progress. `errorShown` stays pure, and the IngredientForm section flags stand still the same way, so a fold is not flagged a moment before its field. Reserving room for the error line was the alternative, and it leaves a gap under every field.

## Undo and redo

`useFormHistory` (M12.9) gives a react-hook-form form an undo and a redo. The
form stays the one store of values; the hook watches its changes, keeps a list
of what each action changed, and puts values back with `setValue`. It is not
`reset`, which would also wipe the errors and the submit count. The argument
is in `claude-docs/design-decisions/m12.9-plan.md`.

```tsx
const root = useRef<HTMLFormElement>(null);
const history = useFormHistory(methods, { root, enabled: !discard.asking });
<FormHistoryContext.Provider value={history}>
  <form ref={root}>
    <FormHistoryButtons />
    ...
```

- **Chords are heard at the document**, not on the form: after a click on a
  blank spot the focus is on the page, outside the form, and a listener on the
  form never sees the key. A chord is taken when its target is inside the form,
  or outside it while this form was the last to hold focus (a nested form that
  `ignore` refuses takes the page's chords itself). Only a text box that is a
  combobox steps aside while an option is highlighted; a select's toggle never
  does, so Ctrl+Z always works with the focus on one.
- **A step is what one action changed.** Several fields changed in the same
  moment, such as a pick that empties another field, are one step. Typing in
  one text box joins into one step until a pause of half a second (`pauseMs`)
  or until the focus leaves the box; a pick from a list never joins typing.
  A drag is one step too: every change made while a pointer is held down joins
  the first, because a picker such as the colour field reports each pointer
  move, and one undo would otherwise undo a pixel of it. The hold ends on
  `pointerup` or `pointercancel` on the document, so a drag that leaves the
  form still counts. A change that lands on `click`, after the pointer is up,
  is a step of its own.
  The list keeps the last 100 steps (`limit`). A new edit after an undo drops
  what could have been redone.
- **Undo takes the newest step first**, and redo puts back the one undone last.
  Undoing to the starting values turns `isDirty` off, so Save goes off and a
  modal's unsaved-changes guard lets go ([`modal.md`](modal.md#unsaved-changes)).
  After a submit, a restored value is validated again, so its error shows;
  before one it is not.
- **The chords** are Ctrl or Cmd with Z to undo, with Shift to redo, and Ctrl
  with Y to redo. Either modifier is accepted on every platform, with no
  sniffing of the platform: Ctrl+Z is not undo on a Mac, so nothing is lost.
  The hook listens for them itself, with a native `keydown` listener on the
  `<form>` it holds through `root`, and returns no key handler; it handles
  only keys that reach the form. That listener runs before any React
  `onKeyDown` inside the form (React dispatches from the root container), so
  it reads the DOM rather than waiting for an inner handler to mark a key
  handled. A nested form that wants its own chords passes `ignore`, or listens
  natively itself. It stands aside for a key already handled, one composing text (an input method),
  one with Alt, one inside a listbox, or in a combobox while an option is highlighted (its
  `aria-activedescendant` is not empty: the person is arrowing through the
  list, and Downshift owns those keys; an open list with nothing highlighted,
  as a click into the box leaves it, lets the chord through), and anything `ignore(target)` says is not this form's, such as a
  panel with a history of its own. A closed select would take Ctrl+Z as a
  letter to search for; see [`combobox.md`](combobox.md#the-select-only-box).
- **It always calls `preventDefault` on the chord**, even with nothing to
  undo. The browser keeps its own undo list for each text box, which knows
  nothing of the form: after a save that reset the form, say, it would revert
  a box behind the form's back. Calling it every time keeps the form's list
  the only one in play; with nothing to do, the live region says so.
- **Focus follows the undo.** After a step is applied the hook calls
  `onRestored(names, diffs, direction)` first, so a form can open whatever
  holds those fields (`diffs` carries each field's `before` and `after`;
  `direction` is `'undo'` or `'redo'`). If it returns a field name, that field
  takes the focus; otherwise the first field changed does. A list field has no single control, so
  focus goes to the first control in its fieldset, else the fieldset. If
  nothing can take it, the Undo button does, never the page.
- **The live region** is an `<output>` named "Edit History", in
  `FormHistoryButtons`. It says "Undid change to Name", "Redid change to Light
  Theme Colour" or "Nothing to undo". The field's name is read from the page at
  undo time: its label, else its `aria-label`, else the legend of its fieldset.
- **`skip(name)` keeps a name out of the history**, for state that is not an
  edit, such as the ingredient form's note that its reference panel is open.
- **`prepare(name, value)` adjusts a value just before an undo or redo writes it back**, for a form whose values name things that can stop existing. Left out, nothing changes, so the other forms are untouched. The spell builder uses it to turn a step's saved id into none when a save has since deleted that step.
- **A `reset` clears the history.** The hook sees the form's defaults change
  and starts over. A form that makes its saved values the new start another
  way calls `history.clear()`. `enabled: false` makes the chords, the buttons
  and `canUndo` and `canRedo` inert; forms turn it off while a question is
  asked over them.
- **Two internals of react-hook-form are read.** `control._fields` finds a
  control with no `name` attribute (a select's box, a colour box) by the ref it
  registered; `setFocus` reads the same ref but focuses on a timer, too late
  for the fall-back to the Undo button. The test for a single subscription
  reads `control._subjects`. A react-hook-form upgrade re-checks both.
- **The buttons** are small quiet icon buttons in an `IconTip`, labelled Undo and
  Redo and disabled while there is nothing to do, joined as one pair: no gap,
  no border round either, and one hairline between the two (the owner's call,
  2026-10-20), the same wherever a pair is drawn. In a modal they portal into the
  header slot's toolbar row, at its end ([`modal.md`](modal.md#a-control-in-the-header));
  elsewhere they sit at the start of the form. `FormHistoryButtons` draws nothing
  without a `FormHistoryContext`. Their `.form-history` row is styled in
  `src/scss/_primitives.scss`.

Wired in [`GroupedValueForm`](grouped-value-form.md) and
[`GroupForm`](group-form.md), and in
[`IngredientForm`](ingredient-form.md#undo-and-redo) (M12.10).
`tests/components/Field/` covers the reducer, the hook (on a probe form in
`tests/support/form-history.tsx`) and the buttons.

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
Field`: `States`, a grid of the text field in each shape (Plain, Required, Pending, With Hint, With Note, With Error, Multiline, Disabled, With Label Suffix, With Placeholder, Tall Multiline, Date Type, Number Type, With Action, With Content After The Error, Described By Another Element, Marked Invalid Without An Error) and the select in each (Select With Placeholder, With Option Icons, With A Disabled Option, Disabled, With Typeahead, Required With Hint), each in a `FormProvider`;
`RadioStrip`, the radio group as a strip of icons, with `RadioGroup`, `RadioSegmented` and `RadioSegmentedDisabled`; `PlainShell`, the shell around a native input with an error; `Switch`,
`SwitchField` off, on, and disabled off and on; `Actions`, `FormActions` with
nothing to save, with something to save and Delete, saving, and renamed to
Send Invitation; `HistoryButtons`; `Reason`,
`ReasonField`; `SearchBox`, `SearchField` in a form that goes nowhere; and
`FilterSelect`, `FilterSelectField` as a select and as a type-ahead in a
filter row.

## Testing

Almost no file of its own: the forms that use it cover it (claude-docs/testing/layer-ownership.md,
"What a test may assert", rule 5). `tests/components/IngredientForm/` covers
`TextField` and `SelectField`, and `tests/components/GroupedValueForm/` (with
`tests/support/grouped-value-form.tsx`) its `typeahead`; the NameForm and EmailForm tests cover the
shell around a plain control. `FormActions` is covered by the forms that use
it, bar its renamed submit, which `tests/components/Field/form-actions.test.tsx`
checks by the button's accessible name; `ReasonField` by the UserList and AdminInvitations tests. The CompendiumList and UserList tests cover
`SwitchField`, found by its `switch` role: turned by a click, sent with the
form, the server's before hydration included, applying the filter on its change, and
`aria-disabled` while a list is on its way. Space is the platform's and
happy-dom does not run it, so it was checked in the workshop's Chromium; Enter is
asserted in `tests/components/Field/switch-field.test.tsx` and walked in
Playwright on `/admin/compendium`. The
lists' tests cover `SearchField` too, found by its `searchbox` role and its
`Search` button: the submit applying the search, and the button in the
server's markup. They cover `FilterSelectField` by the address each
pick applies, its options and its name in the form, and the native select
in the server's markup swapped once hydrated for the select-only box or
the type-ahead.
