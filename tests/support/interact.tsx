import { fireEvent, screen, within } from '@testing-library/react';

// What a person does to a form in a component test — press a button, pick a
// choice from a list, type into a field — written once for every form's
// tests, where each test file had its own copy (MB.115).
//
// The fields are found by their labels rather than by role and name: a role
// query names every element of the role, which in the ingredient form's 25
// fields is most of a test's time (MB.181). A required field's label ends in
// a marker hidden from its accessible name, dropped here so the label is
// written as the name is.

const byLabel = (label: string, selector: string) =>
  screen.getByLabelText(label, {
    selector,
    normalizer: (text) => text.replace(/\*$/, '').trim(),
  });

/**
 * Presses the button named `name`: focused first, as a pointer press focuses
 * it, so a form that reads where the focus went — a guard asking before Cancel
 * closes, say — sees what a browser would show it.
 */
export function press(name: string): void {
  const button = screen.getByRole('button', { name });
  button.focus();
  fireEvent.click(button);
}

/** Opens the type-ahead labelled `name` and picks `label` from its `${name} choices` list. */
export function choose(name: string, label: string): void {
  fireEvent.click(byLabel(name, '[role="combobox"]'));
  fireEvent.click(
    within(screen.getByRole('listbox', { name: `${name} choices` })).getByRole('option', {
      name: label,
    }),
  );
}

/**
 * Sets the text of the field labelled `label` — a text box, a text area or a
 * type-ahead's box — as one change, the way the forms' tests have always
 * typed: a form reads the value, not each key.
 */
export function type(label: string, text: string): void {
  fireEvent.change(byLabel(label, 'input:not([role]), textarea, [role="combobox"]'), {
    target: { value: text },
  });
}
