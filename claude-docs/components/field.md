# Field

`src/components/Field/` draws one form field's block once, tied together by id. Props are in `types.ts`; this page holds the rules the types do not.

- **Import a part from its own file** (`Field/shell`, `Field/text-field`, …), not from the barrel, in any component a page loads first. A barrel counts every re-export, and `tests/guards/first-load-scripts.test.ts` fails a first-load file that reaches react-hook-form or zod through it.
- **The shell** (`FieldShell`, `fieldDescription`) knows no form library and has no hook, so a plain-state form (NameForm, EmailForm) or a server component renders it around its own control. `TextField` and `SelectField` need a `<FormProvider>`.
- `SuggestField`, `MultiSelectField`, `ListField` and `ToggleField` stay in `IngredientForm/fields.tsx` on the same shell, and `CupboardEntryForm` imports two of them from there. The date field is [`date-field.md`](date-field.md).
- Field has no size prop: the StockDialog's shorter Add Form wears `.field--compact` itself (`_primitives.scss`). Field has no stylesheet; the primitives are in [`styling.md`](../styling.md), "Form fields".

## Contracts

- **The control names its hint, note and error** in `aria-describedby` and carries `aria-invalid` while there is an error, which also draws the error edge ([`styling.md`](../styling.md), "Form fields"). `fieldDescription` returns both together so one cannot ship without the other. The hint is read whether its tip is open or not: its text stays in the page, `aria-hidden` while closed ([`info-tip.md`](info-tip.md)).
- **Required is `aria-required` on the control plus an `aria-hidden` `*`**, so a screen reader hears "Name, required". Not `required`, whose `:invalid` would mark an empty field before anyone tried to save. A caller rendering its own control sets it; a radio group puts it on every radio, having no one control.
- **A field is optional unless marked required**, so a label never says "(Optional)". What a field is for goes in `hint`, behind the info tip.
- **A placeholder is a short action, never a description**: one or two words, three at most, sentence case ("Add a name"). A prose box may take a one-line prompt ("What this category covers"), never instructions or examples, which go in `hint`; `note` is for a live state, such as why a field is shut. The label stays the accessible name. A plain-state form sets the placeholder on its own control, since `FieldShell` draws none. A `date` field takes none. A box holding several values names one ("Add a body") and keeps it after the chips while it can take another ([`combobox.md`](combobox.md)).
- **`labelSuffix`** is read after the label, out of sight, and in the hint's tip name, so a field drawn once per row (the StockDialog's) never shares a name between rows.
- **`disabled` is the attribute**, not react-hook-form's option, which would drop the value from what is validated and sent.
- **`TextField`**: `type="number"` is read back as the text typed. `rows` sets a textarea's height where prose outgrows the 6rem default (the compendium's Description and each variant's take 7). `busy` shows the [`Spinner`](busy-button.md#spinner) after 100ms, so a quick answer never flashes it.
- **Text fields share `TextControlProps`** (`types.ts`, behaviour in `text-control.tsx`). `TextField` needs a `<FormProvider>`; `PlainTextField` takes `value` and `onChange` and needs none, so a plain-state form gets the same shell, tidying, limit and attributes. A plain-state form is not moved to react-hook-form for this.
- **`format`** runs when the person leaves the field. A single-line field defaults to `tidy` (`src/lib/formats.ts`: trims the ends and collapses runs of spaces); a multiline one to none, and its schema passes `trimEnds`. `requiredText` and `optionalText` in `src/lib/validation.ts` apply the same function with `.overwrite`, so the server stores what the browser showed. Pass a field-specific formatter (`formatLocator`, `formatReferenceLink`) to replace the default.
- **`limit`** is soft: no `maxlength`, a `CharacterCount` from 75% of it, and Save refuses past it. A form with a resolver needs the number in its schema too (`.max(limit, { error: limitMessage(limit) })`), because react-hook-form ignores a field's own `validate` when a resolver is present.
- **Browser attributes**: `type` takes `email` and `tel` as well as `text`, `date`, `url` and `number`; `inputMode` takes `numeric`, `decimal`, `email`, `tel` and `url`; `autoComplete` takes a real autofill token. `spellCheck` defaults on for multiline and off for `email`, `url` and `tel`; `autoCapitalize` defaults to `none` for `email` and `url`. `enterKeyHint` is passed through.
- **`SelectField`**: `typeahead` is for a set long enough to want a search; text naming no option is no value, so a required one shows its error on save ([`combobox.md`](combobox.md), "The type-ahead box"). `disabled` applies to the select-only box only.
- **`FieldShell`**'s `className` carries a filter's `filter-row__choice` ([`filter-form.md`](filter-form.md), "Styling").

## Form actions

`FormActions` is the row beneath `GroupForm`, `GroupedValueForm`, `IngredientForm` and its reference panel, and the admin invitation form.

- **Save is the form's submit**, or with `onSave` a plain button, for the reference panel, which sits inside the ingredient form's own `<form>`. A form with several saves passes `busy` for the one pressed, its `saveValue`, and the others as children between Save and Cancel (the ingredient form's Save & Add Another). A form that sends rather than saves renames the submit with `label` and `busyLabel` in title case ("Send Invitation", "Sending"); `noun` still names Delete.
- **`saveReason`** says why Save is off, in an `IconTip`. The button is then `aria-disabled`, not `disabled`, which would leave no hover or focus to open the tip from. It looks the same, and the press does nothing.
- **Cancel is drawn only when `onCancel` is given.** A form that saves on close (the ingredient form, the Annotate dialog, the spell builder) leaves it out, since Cancel would only close as Close does. Record a Working and Edit Stock throw changes away on close and keep it, passing their discard guard's `request` ([`modal.md`](modal.md), "Unsaved changes"). `holdCancel` makes it wait while a save is in flight.
- **`aside`** takes Delete's place for further choices that are not a delete (the Annotate dialog's More menu).
- **The row is `.form__actions`**, not `.modal__actions`: it wraps, so a third button never squeezes it.

`ReasonField` is a keeper change's optional Reason. Its `hint` says where the reason is kept: by default with the change in the record of who changed what; the invitation form passes its own, since an invitation's reason is kept with the invitation first. `UserList`'s confirmed actions and the invitation form use it.

## Radio groups

`RadioGroupField` is native radios, so the arrow keys move the choice. The caller holds `value`. The group carries `margin-block: space(5)` where nothing else spaces it (a confirm's modal) and none as a direct child of a `.form`, whose gap spaces it. Every layout is radios underneath, the fill and focus ring following the radio through `:has()` (`_primitives.scss`).

- **`strip`**: icon-only segments for a choice seen before it is read. A `description` is not drawn. Each segment's label is an [`IconTip`](icon-tip.md) as decoration, since the radio keeps its name. `.radio-strip` has no `overflow: hidden`, so the tips show: the end segments round their own corners, and dividers are counted on the tips' wrappers.
- **`segmented`**: the same bar with names in text (the compendium filter's Match and Toxic). `disabled` disables the whole group (Toxic when a count is zero, with a hint saying why). The legend takes a field label's weight and gap so a row of mixed controls shares one top. It submits as a GET before the script loads.

## Switch, search and select fields for filters

**`SwitchField`** draws its own `.field` block, not `FieldShell`: it has no error and its label takes the press feedback (`data-pressed`, `src/lib/press-feedback.ts`, since a phone shows `:active` late or not at all). Label above, toggle beneath, which lines a filter bar's switch up among its boxes. The ingredient form sets its Toxic switches at the column start ([`ingredient-form.md`](ingredient-form.md), "Styling"), and the spell builder its Shared switch on its own line above the footer row, as one left-aligned column of label, switch, then note and tip ([`spell-builder.md`](spell-builder.md), "Visibility"). `VisibilitySwitch` (who can see a spell or working) holds no rule: the caller says when it is shut and why.

- The toggle is a native checkbox with `role="switch"`, so it submits `name=value` as a GET before hydration. It writes no `aria-checked`: a second written state would go stale on a press before hydration, so the lint rule asking for it is switched off on that line.
- A list filter takes `defaultChecked`: it applies on change, and the new list draws it again from the filter it shows ([`filter-form.md`](filter-form.md)). Otherwise the caller holds `checked`.
- **Enter turns it as a click does**; on a native checkbox it would only submit the surrounding form. Space is the platform's, which happy-dom does not run; Enter is asserted in `tests/components/Field/switch-field.test.tsx` and walked in Playwright on `/curator/compendium`.

**`SearchField`**'s submit is its form's, so in a `FilterForm` the search applies by a press on the magnifier or Enter. It is never disabled: the same text again reads the list again.

**`FilterSelectField`** serves the user list's Role, the ledger's Privilege, the compendium's Classification and Form, and the curated lists' group.

- The server and the hydrating render draw a native `<select>` whose first choice, `all` ("All Roles"), is blank, so a press on the magnifier before the script loads sends `role=` and the page reads no filter. A change to that select applies nothing until the magnifier is pressed.
- Once hydrated (`useHydrated()`, `src/lib/hydrated.ts`) it is one of Combobox's boxes, so every closed set in the row looks alike.
- It calls `onChange` only for a different choice from `defaultValue` (a type-ahead's once it settles), since the list keys its filter by the filter shown ([`filter-form.md`](filter-form.md)). `onChange` hands over the raw string; a caller narrowing it uses `oneOf` (`src/lib/search-params.ts`).
- Every form stands in `filter-row__choice`, one width, so the swap moves nothing. It is not `SelectField`: a filter has no form state, and its select must submit natively.

## Character count

`CharacterCount` never stops typing and sets no `maxlength`; the service is the authority on the limit, and the form says the overrun on send. The caller puts its `id` in the field's `describedBy`.

## Errors wait for an edit and a leave

`errorShown` draws a field's error when the form has been submitted, or the field has been **left** (`touchedFields`) and **ever edited** since the form started. A field that has shown an error re-checks as the person types and clears it once fixed. A required field passed through with Tab stays quiet. One typed into, emptied and left shows "Required" where the form supplies the edit record below; a form without it flags an empty required field only on Save (`ShownState.empty`). A field made invalid by another field (a classification pick raising the formal-name rule) stays quiet until it is edited and left itself, or the form is submitted. It is one rule, so no field or section flag repeats it.

## The edited-fields record

`edited-fields.ts` records every field path that has ever received a `change` event, kept even when its value returns to the default. react-hook-form's `dirtyFields` unsets a field whose value goes back to its default, so a name typed and deleted would read as never edited and its "Required" would stay hidden. `useEditedFields(form.subscribe)` asks `subscribe` for `values`, which makes react-hook-form send each input event's `name` and `type`. The form hands the set down through `EditedFieldsContext` and calls `clear()` beside every `reset`. A `setValue` call (undo and redo restore through it) carries no event type and is not an edit. With no provider the rule falls back to touched alone.

## Errors wait for the pointer

An error drawn when a field is left pushes everything below it down before a button comes up, so the click lands on whatever slid under the pointer (a press on Classification with Name empty never opened it). `useField` therefore keeps what it draws as it stood when the press began (`useSettledWhilePressed`, over `usePointerHeld`) and catches up on release: an error already showing stays, one just raised waits. Hiding errors during a press would take a showing one away and read as flicker; reserving room for the line leaves a gap under every field. Tab shows an error at once. `errorShown` stays pure, and the IngredientForm section flags stand still the same way, so a fold is not flagged a moment before its field.

## Undo and redo

`useFormHistory` gives a react-hook-form form an undo and a redo. The form stays the one store of values; the hook puts values back with `setValue`, not `reset`, which would also wipe errors and the submit count. The form passes `{ root, enabled }` (`root` is its `<form>` ref) and provides the result through `FormHistoryContext` to `FormHistoryButtons`. Wired in [`GroupedValueForm`](grouped-value-form.md), [`GroupForm`](group-form.md) and [`IngredientForm`](ingredient-form.md#undo-and-redo).

- **A step is what one action changed.** Fields changed in the same moment are one step. Typing in one text box joins one step until a pause of half a second (`pauseMs`) or until focus leaves; a pick never joins typing. A drag is one step (every change while a pointer is held); a change landing on `click`, after the pointer is up, is its own. The list keeps 100 steps (`limit`); a new edit after an undo drops what could have been redone.
- **Undoing to the starting values turns `isDirty` off**, so Save goes off and a modal's unsaved-changes guard lets go ([`modal.md`](modal.md#unsaved-changes)). After a submit, a restored value is validated again, so its error shows; before one it is not.
- **Chords**: Ctrl or Cmd with Z undoes, with Shift redoes, and Ctrl with Y redoes. Either modifier works on every platform, with no platform sniffing. The hook always calls `preventDefault` on the chord, even with nothing to undo, because the browser's own per-text-box undo knows nothing of the form and would revert a box behind its back.
- **Focus follows the undo.** `onRestored` runs first, so a form can open whatever holds those fields; a name it returns takes focus, otherwise the first changed field. A list field has no single control, so focus goes to its fieldset's first control, else the fieldset. If nothing can take it, the Undo button does, never the page.
- **`skip(name)`** keeps interface state out of the history (the ingredient form's reference-panel-open note). **`prepare(name, value)`** adjusts a value just before an undo or redo writes it back, for values naming things that can stop existing (the spell builder turns a step's saved id into none when a save has since deleted that step).
- **A `reset` clears the history**; a form that makes its saved values the new start another way calls `history.clear()`. `enabled: false` makes the chords, buttons, `canUndo` and `canRedo` inert; forms turn it off while a question is asked over them.
- **Two react-hook-form internals are read.** `control._fields` finds a control with no `name` attribute (a select's box, a colour box) by its registered ref; `setFocus` reads the same ref but focuses on a timer, too late for the Undo-button fall-back. The single-subscription test reads `control._subjects`. A react-hook-form upgrade re-checks both.
- **The buttons**, in a modal, portal into the header slot's toolbar row ([`modal.md`](modal.md#a-control-in-the-header)); elsewhere they sit at the start of the form.

### How the undo and redo chords are heard

- **Listeners are native, on the document, in the bubble phase**, not a React `onKeyDown` on the form. The accessibility lint refuses a key handler on a non-interactive element, and after a click on a blank part of a dialog focus sits on the page, outside the form. React dispatches from the root container, so these listeners run before any React `onKeyDown` inside the form (Downshift's, a panel's); the target checks therefore read the DOM (`aria-expanded`) rather than wait for `defaultPrevented`.
- **A chord is accepted** when this form owns its target, or the target is outside every form and this form was the last to hold focus (`held`, a ref kept by a `focusin` listener).
- **Owning is exclusive**, so a chord never undoes twice. Each root carries `data-form-history`, and an element belongs only to the hook whose root is its nearest marked ancestor. A nested form (a panel) takes its own chords whether or not it passes `ignore`. The form's own Undo and Redo buttons sit outside the root and count as owned. `ignore(target)` leaves alone a target the form owns but does not govern.
- **It stands aside** for a key already handled, text being composed, Alt, anything inside a listbox, and a text-box combobox while an option is highlighted (a non-empty `aria-activedescendant`: Downshift owns those keys). An open list with nothing highlighted lets the chord through. A select's toggle never owns Ctrl+Z, because it highlights an item the moment it opens; a closed select would take Ctrl+Z as a letter to search for ([`combobox.md`](combobox.md#the-select-only-box)).
- `enabled`, `ignore`, `undo` and `redo` are effect dependencies, so listeners never see a stale one.

Tests are in `tests/components/Field/` and in the tests of the forms and lists that use it (claude-docs/testing/layer-ownership.md, "What a test may assert", rule 5).

## Announcing errors

- **`FieldError`** is always in the page, so a screen reader has a live region before the text arrives. Its message sits behind a visually hidden "Error:" and the region is `aria-live="polite"`. An empty one is `position: absolute` (`.field__error:empty`) so it adds no gap.
- **`FormErrorSummary`** goes inside a `<FormProvider>` form, beneath any form-wide notice. After a failed Save it lists each error (the field's label and message) as a link to its control, takes focus once per Save, and prefixes the document title with "Error: " while it shows. It reads the `aria-invalid` controls in the form, in page order, so a control outside react-hook-form (a list entry) is included; `within` points it at another container, as the reference panel does.
- **A form using it sets `shouldFocusError: false`**, or react-hook-form's own focus takes the focus back from the summary. A form with a near-match question that must keep focus (IngredientForm's duplicate warning) does not draw the summary while that question is open.
- **`tests/support/error-summary.ts`**'s `expectSummaryLinksTo(control)` is the test for it.
