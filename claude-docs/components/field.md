# Field

`src/components/Field/` draws one form field's block once: the label, the required mark, the hint's info tip, a note, the control and its error, tied together by id. Props are in `types.ts`; this page holds the rules the types do not.

- **The shell**, `FieldShell` with `fieldDescription`, knows no form library. A plain-state form (values in `useState`, such as NameForm and EmailForm) renders it around its own control. `shell.tsx` has no hook, so a server component may use it.
- **`TextField` and `SelectField`** read the form through `useFormContext` (any form inside a `<FormProvider>`) and their own error through `useField`. Both are generic over the form's values, so `name` is checked against its paths.
- **Plain-state fields**: `RadioGroupField` (one choice from a few), `SwitchField` (on or off), `SearchField` (a list filter's text box with its own submit) and `FilterSelectField` (a list filter's closed set).
- **Around a form**: `FormActions`, `ReasonField`, `CharacterCount`, `VisibilitySwitch` (who can see a spell or working, on `SwitchField`) and the undo parts (`useFormHistory`, `FormHistoryButtons`, `FormHistoryContext`).

`SuggestField`, `MultiSelectField`, `ListField` and `ToggleField` stay in `IngredientForm/fields.tsx` on the same shell; `CupboardEntryForm` imports `ListField` and `MultiSelectField` from there. Field has no size prop: the StockDialog's shorter Add Form wears `.field--compact` itself (`_primitives.scss`).

## Contracts

- **The control names its hint, note and error** in `aria-describedby` and carries `aria-invalid` while there is an error, which also draws the error edge ([`styling.md`](../styling.md), "Form fields"). `fieldDescription({ id, hint, note, describedBy, error, invalid })` takes a base id from `useId()` and returns the ids, the error and `aria` to spread on the control.
- **The hint is read whether its tip is open or not**: its text stays in the page, `aria-hidden` while closed, and the control lists its id ([`info-tip.md`](info-tip.md)).
- **Required is `aria-required` on the control plus a `*` for the eye.** The asterisk is `aria-hidden`, so a screen reader hears "Name, required". The control takes `aria-required`, not `required`, whose `:invalid` would mark an empty field before anyone tried to save. A caller rendering its own control sets it; `TextField` and `SelectField` do. A radio group puts it on every radio, having no one control.
- **A field is optional unless marked required**, so a label never says "(Optional)". What a field is for goes in `hint`, behind the info tip.
- **A placeholder is a short action, never a description**: one or two words, three at most, sentence case ("Add a name", "Choose a group"). A prose box may take a one-line prompt ("What this category covers"), never instructions or examples. What a field is for, what to type, examples and limits go in `hint`; `note` is for a live state, such as why a field is shut. The label stays the accessible name. A plain-state form sets the placeholder on its own control, since `FieldShell` draws none. A `date` field takes none (the browser draws its format). A box holding several values names one ("Add a body") and keeps it after the chips while it can take another ([`combobox.md`](combobox.md)).
- **`labelSuffix`** is read after the label, out of sight, and in the hint's tip name, so a field drawn once per row (the StockDialog's) never shares a name between rows.
- **`disabled` is the attribute**, not react-hook-form's option, which would drop the value from what is validated and sent. A react-hook-form field re-renders for its own error only: `useField` reads the form state by name.
- **`TextField`**: `type="number"` takes any decimal and is read back as the text typed. `rows` sets a textarea's height where prose outgrows the 6rem default (the compendium's Description and each variant's take 7). `busy` shows the [`Spinner`](busy-button.md#spinner) in the box after 100ms, so a quick answer never flashes it, and sets `aria-busy` (the name's duplicate check).
- **`SelectField`**: `typeahead` uses Combobox's type-ahead box for a set long enough to want a search; text naming no option is no value, so a required one shows its error on save ([`combobox.md`](combobox.md), "The type-ahead box"). A disabled option is listed, not choosable, its `note` saying why. `disabled` applies to the select-only box only.
- **`FieldShell`** takes `after` (beneath the error), `action` (right end of the label row) and `className` (a filter's type-ahead takes `filter-row__choice`, [`filter-form.md`](filter-form.md), "Styling").

## Form actions

`FormActions` is the row beneath `GroupForm`, `GroupedValueForm`, `IngredientForm` and its reference panel, and the admin invitation form.

- **Save is first and named for its thing** (`Save ${noun}`), off until `dirty` and while `submitting`, busy from the press to the answer ("Saving Group" with the spinner, `BusyButton`). A form with several saves passes `busy` for the one pressed, its `saveValue`, and the others as children between Save and Cancel (the ingredient form's Save & Add Another).
- **Save is the form's submit**, or with `onSave` a plain button, for the reference panel, which sits inside the ingredient form's own `<form>`.
- **A form that sends rather than saves** renames the submit with `label` and `busyLabel` in title case ("Send Invitation", "Sending"). `noun` still names Delete.
- **`saveReason`** says why Save is off, in an `IconTip` (hover, focus and tap) and as its description. The button is then `aria-disabled`, not `disabled`, which would leave no hover or focus to open the tip from. It looks the same, and the press does nothing.
- **Cancel is quiet and drawn only when `onCancel` is given.** A form that saves on close (the ingredient form, the Annotate dialog, the spell builder) leaves it out, since Cancel would only close as Close does. Record a Working and Edit Stock throw changes away on close and keep it, passing their discard guard's `request` ([`modal.md`](modal.md), "Unsaved changes"). `holdCancel` makes it wait while a save is in flight.
- **Delete** is `.btn--destructive` at the far end, drawn when `onDelete` is given, and asks the form's own question. `aside` takes Delete's place for further choices that are not a delete (the Annotate dialog's More menu); in a narrow form's stacked foot it runs full width.
- **The row is `.form__actions`**, not `.modal__actions`: it wraps, so a third button never squeezes it.

`ReasonField` is a keeper change's optional Reason, a text box held in plain state, placeholder "Add a reason". Its hint says where the reason is kept (by default with the change in the record of who changed what; the invitation form passes its own, since an invitation's reason is kept with the invitation first). `UserList`'s confirmed actions and the invitation form use it.

## Radio groups

`RadioGroupField` is a native radio group in a `.fieldset.radio-group`, so the arrow keys move the choice and a screen reader hears "2 of 3". The caller holds `value` (`null` checks none). A `description` is read after the radio's name; the group's `note`, `hint` and `error` join the fieldset's `aria-describedby`. The group carries `margin-block: space(5)` where nothing else spaces it (a confirm's modal) and none as a direct child of a `.form`, whose gap spaces it. The centre dot, as well as the colour, carries the choice, and its grow-in follows `$motion-short` (none under reduced motion).

Every layout is radios underneath, with the fill and focus ring following the radio through `:has()` (`.radio-group--strip`, `.radio-strip`, `.radio--segment` in `_primitives.scss`):

- **`strip`**: one bar of icon-only segments for a choice seen before it is read. The chosen label prints beneath (`.radio-strip__chosen`, `aria-hidden`). A `description` is not drawn. Each segment wears its label in an [`IconTip`](icon-tip.md) as decoration, since the radio keeps its name. `.radio-strip` has no `overflow: hidden`, so the tips show: the end segments round their own corners, and dividers are counted on the tips' wrappers.
- **`segmented`**: the same bar with names in text (the compendium filter's Match and Toxic). An option's `count` reads after its name as a bare number ("Toxic 4"), a text node of the label so the accessible name keeps it. It prints no chosen caption. `disabled` disables the whole group (Toxic when a count is zero, with a hint saying why). The legend takes a field label's weight and gap so a row of mixed controls shares one top. It submits as a GET before the script loads.
- **`cards`**: one compact bordered card per row at every width, the whole card the label, the description wrapping under the name on a phone.

## Switch, search and select fields for filters

**`SwitchField`** draws its own `.field` block, not `FieldShell`: it has no error and its label takes the press feedback. The label sits above, tied to the toggle by `htmlFor`, with the toggle (`.switch__control`) beneath, which lines a filter bar's switch up among its boxes. The ingredient form sets its Toxic switches at the column start ([`ingredient-form.md`](ingredient-form.md), "Styling"), and the spell builder its Shared switch in the footer row ([`spell-builder.md`](spell-builder.md), "Visibility").

- The toggle is a native checkbox with `role="switch"`, so it submits `name=value` as a GET before hydration. It writes no `aria-checked`: a second written state would go stale on a press before hydration, so the lint rule asking for it is switched off on that line with the reason.
- The label and toggle are each marked `data-pressed` while a pointer holds them (`src/lib/press-feedback.ts`), since a phone shows `:active` late or not at all.
- A list filter takes `defaultChecked`: it applies on change, and the new list draws it again from the filter it shows ([`filter-form.md`](filter-form.md)). Otherwise the caller holds `checked`.
- **Enter turns it as a click does.** On a native checkbox Enter would only submit the surrounding form, so the key is cancelled and answered with a click. Space is the platform's.
- A `hint` puts the label in a `.field__label-row` beside an InfoTip (a filter switch takes none). A `note` is a line under the toggle saying what its state means; a `noteTip` is the rest of it behind an InfoTip. Both stay in the toggle's `aria-describedby`.

**`SearchField`** is one box, `.input.search-field`: a borderless `type="search"` input and, at its end, a `type="submit"` button with `MagnifierIcon` (`aria-hidden`) and the visually hidden text "Search", id `<control id>-submit`. The submit is its form's, so in a `FilterForm` the search applies by a press on the mark or by Enter, and before hydration it sends the whole form as a GET. It is never disabled: the same text again reads the list again.

**`FilterSelectField`** serves the user list's Role, the ledger's Privilege, the compendium's Classification and Form, and the curated lists' group.

- The server and the hydrating render draw a native `<select>` whose first choice, `all` ("All Roles"), is blank, so a press on the magnifier before the script loads sends `role=` and the page reads no filter. A change to that select applies nothing until the magnifier is pressed.
- Once hydrated (`useHydrated()`, `src/lib/hydrated.ts`) it is one of Combobox's boxes, so every closed set in the row looks alike: the select-only box ([`combobox.md`](combobox.md), "The select-only box"), or with `typeahead` the type-ahead box, `all` its placeholder and its clear the way back to blank. A hidden input then carries the parameter.
- It starts from `defaultValue`, the value the page shows, and calls `onChange` only for a different choice (a type-ahead's once it settles), since the list keys its filter by the filter shown ([`filter-form.md`](filter-form.md)). `onChange` hands over the raw string; a caller narrowing it uses `oneOf` (`src/lib/search-params.ts`).
- Every form stands in `filter-row__choice`, one width, so the swap moves nothing. It is not `SelectField`: a filter has no form state, and its select must submit natively.

## Character count

`CharacterCount` always draws an `aria-live="polite"` paragraph and fills it only once the field is past 75% of the limit: "29 characters left", then "5 characters over". It never stops typing and sets no `maxlength`; the service is the authority on the limit, and the form says the overrun on send. The caller puts its `id` in the field's `describedBy`.

## Errors wait for an edit and a leave

`errorShown` draws a field's error when the form has been submitted, or the field has been **left** (`touchedFields`) and **ever edited** by the person since the form started. A required field passed through with Tab stays quiet; one typed into, emptied and left shows "Required". A field made invalid by another field (a classification pick raising the formal-name rule) stays quiet until it is edited and left itself, or the form is submitted. With no edited record the rule falls back to touched alone. It is one rule, so no field or section flag repeats it.

## The edited-fields record

`edited-fields.ts` records every field path that has ever received a `change` event, kept even when its value returns to the default. react-hook-form's `dirtyFields` is not that record: it unsets a field whose value goes back to its default, so a name typed and deleted would read as never edited and its "Required" would stay hidden. `useEditedFields(form.subscribe)` asks `subscribe` for `values`, which makes react-hook-form send each input event's `name` and `type`. The form hands the set down through `EditedFieldsContext` and calls `clear()` beside every `reset`. A `setValue` call (undo and redo restore through it) carries no event type and is not an edit. With no provider the context is null and other forms are unchanged.

## Errors wait for the pointer

An error drawn when a field is left pushes everything below it down before a button comes up, so the click lands on whatever slid under the pointer (a press on Classification with Name empty never opened it). `useField` therefore keeps what it draws as it stood when the press began (`useSettledWhilePressed`, over `usePointerHeld`: document listeners for `pointerdown`, `pointerup`, `pointercancel` and the window's `blur`) and catches up on release: an error already showing stays, one just raised waits. Hiding errors during a press would take a showing one away and read as flicker; reserving room for the line leaves a gap under every field. Tab shows an error at once. `errorShown` stays pure, and the IngredientForm section flags stand still the same way, so a fold is not flagged a moment before its field.

## Undo and redo

`useFormHistory` gives a react-hook-form form an undo and a redo. The form stays the one store of values; the hook watches its changes and puts values back with `setValue`, not `reset`, which would also wipe errors and the submit count (`claude-docs/design-decisions/m12.9-plan.md`).

```tsx
const root = useRef<HTMLFormElement>(null);
const history = useFormHistory(methods, { root, enabled: !discard.asking });
<FormHistoryContext.Provider value={history}>
  <form ref={root}>
    <FormHistoryButtons />
    ...
```

- **A step is what one action changed.** Fields changed in the same moment are one step. Typing in one text box joins one step until a pause of half a second (`pauseMs`) or until focus leaves; a pick never joins typing. A drag is one step (every change while a pointer is held, until `pointerup` or `pointercancel` on the document); a change landing on `click`, after the pointer is up, is its own. The list keeps 100 steps (`limit`); a new edit after an undo drops what could have been redone.
- **Undoing to the starting values turns `isDirty` off**, so Save goes off and a modal's unsaved-changes guard lets go ([`modal.md`](modal.md#unsaved-changes)). After a submit, a restored value is validated again, so its error shows; before one it is not.
- **Chords**: Ctrl or Cmd with Z undoes, with Shift redoes, and Ctrl with Y redoes. Either modifier works on every platform, with no platform sniffing. The hook always calls `preventDefault` on the chord, even with nothing to undo, because the browser's own per-text-box undo knows nothing of the form and would revert a box behind its back; with nothing to do, the live region says so.
- **Focus follows the undo.** After a step is applied the hook calls `onRestored(names, diffs, direction)` first, so a form can open whatever holds those fields. A returned field name takes focus, otherwise the first changed field. A list field has no single control, so focus goes to its fieldset's first control, else the fieldset. If nothing can take it, the Undo button does, never the page.
- **The live region** is an `<output>` named "Edit History" in `FormHistoryButtons` ("Undid change to Name", "Nothing to undo"). The field's name is read from the page at undo time: its label, else `aria-label`, else its fieldset's legend.
- **`skip(name)`** keeps interface state out of the history (the ingredient form's reference-panel-open note). **`prepare(name, value)`** adjusts a value just before an undo or redo writes it back, for values naming things that can stop existing (the spell builder turns a step's saved id into none when a save has since deleted that step).
- **A `reset` clears the history**; a form that makes its saved values the new start another way calls `history.clear()`. `enabled: false` makes the chords, buttons, `canUndo` and `canRedo` inert; forms turn it off while a question is asked over them.
- **Two react-hook-form internals are read.** `control._fields` finds a control with no `name` attribute (a select's box, a colour box) by its registered ref; `setFocus` reads the same ref but focuses on a timer, too late for the Undo-button fall-back. The single-subscription test reads `control._subjects`. A react-hook-form upgrade re-checks both.
- **The buttons** are small quiet icon buttons in an `IconTip`, joined as a pair with one hairline between and no gap. In a modal they portal into the header slot's toolbar row ([`modal.md`](modal.md#a-control-in-the-header)); elsewhere they sit at the start of the form. `FormHistoryButtons` draws nothing without a `FormHistoryContext`. The `.form-history` row is styled in `src/scss/_primitives.scss`.

Wired in [`GroupedValueForm`](grouped-value-form.md), [`GroupForm`](group-form.md) and [`IngredientForm`](ingredient-form.md#undo-and-redo).

### How the undo and redo chords are heard

- **Listeners are native, on the document, in the bubble phase**, not a React `onKeyDown` on the form. The accessibility lint refuses a key handler on a non-interactive element, and after a click on a blank part of a dialog focus sits on the page, outside the form. React dispatches from the root container, so these listeners run before any React `onKeyDown` inside the form (Downshift's, a panel's); the target checks therefore read the DOM (`aria-expanded`) rather than wait for `defaultPrevented`.
- **A chord is accepted** when this form owns its target, or the target is outside every form and this form was the last to hold focus (`held`, a ref kept by a `focusin` listener).
- **Owning is exclusive**, so a chord never undoes twice. Each root carries `data-form-history`, and an element belongs only to the hook whose root is its nearest marked ancestor. A nested form (a panel) takes its own chords whether or not it passes `ignore`. The form's own Undo and Redo buttons sit outside the root and count as owned. `ignore(target)` leaves alone a target the form owns but does not govern.
- **It stands aside** for a key already handled, text being composed, Alt, anything inside a listbox, and a text-box combobox while an option is highlighted (a non-empty `aria-activedescendant`: Downshift owns those keys). An open list with nothing highlighted lets the chord through. A select's toggle never owns Ctrl+Z, because it highlights an item the moment it opens; a closed select would take Ctrl+Z as a letter to search for ([`combobox.md`](combobox.md#the-select-only-box)).
- `enabled`, `ignore`, `undo` and `redo` are effect dependencies, so listeners never see a stale one.

## Styling

Field has no stylesheet: the block is the field primitives (`.field`, `.field__label`, `.field__hint`, `.field__error`, `.field__required`, `.input`, `.textarea`, and `.field__label-row`, positioned so the tip can place itself above it) in [`styling.md`](../styling.md), "Form fields". `SwitchField` is the `.switch` primitive. `SearchField` is `.search-field` beside them: `.input`'s edge and fill on a flex row, as Combobox's control is, the inner input borderless, the box drawing the focus ring, and the submit an `icon-button`.

## Used by

Every form in the app, and the list filters (`SwitchField`, `SearchField`, `FilterSelectField`).

## Not here

`SuggestField`, `MultiSelectField`, `ListField`, `ToggleField` (`IngredientForm/fields.tsx`); the date field ([`date-field.md`](date-field.md)).

Tests are in `tests/components/Field/` and in the tests of the forms and lists that use it (claude-docs/testing/layer-ownership.md, "What a test may assert", rule 5). Stories are in `src/components/Field/index.stories.tsx`. Space on `SwitchField` is the platform's and happy-dom does not run it; Enter is asserted in `tests/components/Field/switch-field.test.tsx` and walked in Playwright on `/curator/compendium`.
