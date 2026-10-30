import { act, fireEvent, screen, within } from '@testing-library/react';

// What a person does to a form in a component test (press, choose, type), written once for every form.
// Fields are found by label, not role and name, as a role query names every element of the role, most of a
// test's time in a 25-field form. A required field's marker, hidden from its accessible name, is dropped.

/**
 * The element labelled `label` and matching `selector`, the selector keeping
 * the query to one kind of control where a label names several.
 */
export const byLabel = (label: string, selector: string) =>
  screen.getByLabelText(label, {
    selector,
    normalizer: (text) => text.replace(/\*$/, '').trim(),
  });

/**
 * Presses the button named `name`, or the button given where a name is not enough (one in a row or panel).
 * Focused first, as a pointer press focuses it, so a form that reads where the focus went sees what a browser would.
 */
export function press(button: string | HTMLElement): void {
  const pressed =
    typeof button === 'string' ? screen.getByRole('button', { name: button }) : button;
  // In `act`: moving the focus blurs the box it leaves, which sets state.
  act(() => pressed.focus());
  fireEvent.click(pressed);
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
  typeIn(byLabel(label, 'input:not([role]), textarea, [role="combobox"]'), text);
}

/**
 * `type` for a field already in hand, where its label is not enough to find
 * it: one of several of the same name, or one found by its role.
 */
export function typeIn(field: HTMLElement, text: string): void {
  fireEvent.change(field, { target: { value: text } });
}

/**
 * The chord for undo (Ctrl+Z) at the focused element, as a keyboard sends
 * it: `meta` for Cmd, `shift` for the redo chord. Returns whether the key was
 * left to the browser, `fireEvent`'s answer: false when the form took it.
 */
export function undo({ meta = false, shift = false, alt = false } = {}): boolean {
  return fireEvent.keyDown(document.activeElement ?? document.body, {
    key: 'z',
    ctrlKey: !meta,
    metaKey: meta,
    shiftKey: shift,
    altKey: alt,
  });
}

/** Redo as the keyboard has it: Ctrl+Shift+Z, or Ctrl+Y with `viaY`; `meta` for Cmd. */
export function redo({ meta = false, viaY = false } = {}): boolean {
  return fireEvent.keyDown(document.activeElement ?? document.body, {
    key: viaY ? 'y' : 'z',
    ctrlKey: !meta,
    metaKey: meta,
    shiftKey: !viaY,
  });
}
