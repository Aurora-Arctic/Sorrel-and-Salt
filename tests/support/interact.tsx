import { act, fireEvent, screen, within } from '@testing-library/react';

// What a person does to a form in a component test (press, choose, type), written once for every form.
// Fields are found by label, not role and name, as a role query names every element of the role, most of a
// test's time in a 25-field form. A required field's marker, hidden from its accessible name, is dropped.

export const byLabel = (label: string, selector: string) =>
  screen.getByLabelText(label, {
    selector,
    normalizer: (text) => text.replace(/\*$/, '').trim(),
  });

// Focused first, as a pointer press focuses it, so a form that reads where the focus went sees what a browser would.
export function press(button: string | HTMLElement): void {
  const pressed =
    typeof button === 'string' ? screen.getByRole('button', { name: button }) : button;
  // In `act`: moving the focus blurs the box it leaves, which sets state.
  act(() => pressed.focus());
  fireEvent.click(pressed);
}

export function choose(name: string, label: string): void {
  fireEvent.click(byLabel(name, '[role="combobox"]'));
  fireEvent.click(
    within(screen.getByRole('listbox', { name: `${name} choices` })).getByRole('option', {
      name: label,
    }),
  );
}

// One change, not a keystroke each: a form reads the value.
export function type(label: string, text: string): void {
  typeIn(byLabel(label, 'input:not([role]), textarea, [role="combobox"]'), text);
}

export function typeIn(field: HTMLElement, text: string): void {
  fireEvent.change(field, { target: { value: text } });
}

// Returns `fireEvent`'s answer: false when the form took the key.
export function undo({ meta = false, shift = false, alt = false } = {}): boolean {
  return fireEvent.keyDown(document.activeElement ?? document.body, {
    key: 'z',
    ctrlKey: !meta,
    metaKey: meta,
    shiftKey: shift,
    altKey: alt,
  });
}

export function redo({ meta = false, viaY = false } = {}): boolean {
  return fireEvent.keyDown(document.activeElement ?? document.body, {
    key: viaY ? 'y' : 'z',
    ctrlKey: !meta,
    metaKey: meta,
    shiftKey: !viaY,
  });
}

// The form's Save button, whatever it is named: Save, Save Draft, Saving.
export const save = (): HTMLElement => screen.getByRole('button', { name: /^Sav/ });

// Submits the form `button` sits in, as pressing it does, without the click.
export const submitForm = (button: HTMLElement = save()): boolean =>
  fireEvent.submit(button.closest('form') as HTMLFormElement);

// One change, then the blur that follows it, for a form that tidies or validates a field when it is left.
export function fill(label: string, text: string): void {
  const field = screen.getByRole('textbox', { name: label });
  fireEvent.change(field, { target: { value: text } });
  fireEvent.blur(field);
}
