# MB.131 — A closed set wears the combobox

**Decided:** a closed enum's field is the combobox's select-only box,
`ComboboxSelect`, on Downshift's `useSelect`, not a native `<select>`. It has
the suggesting fields' control, chevron and list, with nothing to type. This
corrects DESIGN.md §14's "Closed enums … are native `<select>`s". It is the
owner's call, made while MB.131 put lookups on the form's four remaining list
boxes.

## Why

By MB.131, every other field on `IngredientForm` but the plain text fields was
the `Combobox`: the form, and all six lists. The two closed sets were the only
controls drawing a different box with a different menu, the browser's own,
which no token reaches. The owner asked for the classification to look like
the form field, "obviously not typable".

## What it costs

- **A second hook, from the same library.** `useSelect` is Downshift's
  select-only combobox, the ARIA 1.2 pattern. It owns the keyboard, typeahead
  included, as `useCombobox` does for the typed box. Nothing is installed.
- **The control is a `div`, not a form control.** A `<label htmlFor>` does not
  label it, so it is labelled through `aria-labelledby`, and it carries
  `aria-required` and `aria-invalid` itself. react-hook-form holds it through
  `useController` rather than `register`, with `deps` in the controller's
  rules, so the field still revalidates the field it is coupled to.
- **No native picker on a phone.** The list is ours on every device. The sets
  are seven choices at most, so the list fits on one screen.

## What it changed

- DESIGN.md §14 (the form-library row).
- `claude-docs/components/combobox.md`, "The select-only box", and
  `ingredient-form.md`, where the closed sets are described.
- `SelectField` in `src/components/IngredientForm/fields.tsx`, and the
  component test's `choose`, which opens the box and clicks the choice.
