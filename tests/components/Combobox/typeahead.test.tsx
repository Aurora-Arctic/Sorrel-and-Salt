import { act, fireEvent, render, screen } from '@testing-library/react';
import { useState } from 'react';
import { describe, expect, it } from 'vitest';
import { ComboboxTypeahead } from '@/components/Combobox/typeahead';

// The type-ahead box (MB.115): a closed set chosen by typing, the list
// narrowing to the choices whose label holds the text, and only a choice
// ever the value (claude-docs/components/combobox.md, "The type-ahead box").

const TRADITIONS = [
  { value: 'fixtural', label: 'Fixtural' },
  { value: 'mockish', label: 'Mockish' },
  { value: 'testic', label: 'Old Testic' },
];

/** The box with its value held outside it, and shown, as a form holds a field's. */
function Harness({ initial = '', clearable }: { initial?: string; clearable?: boolean }) {
  const [value, setValue] = useState(initial);
  return (
    <>
      <ComboboxTypeahead
        id="tradition"
        label="Tradition"
        value={value}
        onChange={setValue}
        choices={TRADITIONS}
        placeholder="Choose a tradition"
        required
        clearable={clearable}
      />
      <output aria-label="Value">{value}</output>
    </>
  );
}

const box = () => screen.getByRole('combobox', { name: 'Tradition' });
const value = () => screen.getByRole('status', { name: 'Value' });
const type = (text: string) => fireEvent.change(box(), { target: { value: text } });
const key = (name: string) => fireEvent.keyDown(box(), { key: name });
const options = () => screen.queryAllByRole('option').map((option) => option.textContent);

describe('ComboboxTypeahead', () => {
  it('is a required text combobox that opens on a press with every choice', () => {
    render(<Harness />);

    expect(box()).toHaveAttribute('aria-autocomplete', 'list');
    expect(box()).toBeRequired();
    expect(box()).toHaveValue('');
    fireEvent.click(box());

    expect(screen.getByRole('listbox')).toBeVisible();
    expect(options()).toEqual(['Fixtural', 'Mockish', 'Old Testic']);
    // No "use what you typed" row: nothing but a choice can be picked.
    type('zzz');
    expect(options()).toEqual([]);
  });

  it('narrows the list to the choices holding the text, in any case and anywhere in the name', () => {
    render(<Harness />);

    type('TEST');
    expect(options()).toEqual(['Old Testic']);
    type('i');
    expect(options()).toEqual(['Fixtural', 'Mockish', 'Old Testic']);
    type('ish');
    expect(options()).toEqual(['Mockish']);
    expect(value()).toBeEmptyDOMElement();
  });

  it('chooses by the keyboard: the first match highlighted, the arrows move, Enter chooses', () => {
    render(<Harness />);
    act(() => box().focus());

    type('i');
    expect(box()).toHaveAttribute(
      'aria-activedescendant',
      screen.getByRole('option', { name: 'Fixtural' }).id,
    );
    key('ArrowDown');
    key('Enter');

    expect(value()).toHaveTextContent('mockish');
    expect(box()).toHaveValue('Mockish');
    expect(box()).toHaveAttribute('aria-expanded', 'false');
  });

  it('chooses by a click, and Escape closes without choosing', () => {
    render(<Harness />);

    type('fix');
    key('Escape');
    expect(box()).toHaveAttribute('aria-expanded', 'false');
    expect(value()).toBeEmptyDOMElement();

    type('fixt');
    fireEvent.click(screen.getByRole('option', { name: 'Fixtural' }));
    expect(value()).toHaveTextContent('fixtural');
    expect(box()).toHaveValue('Fixtural');
  });

  it('opens on every choice while it holds one, not only on the one it holds', () => {
    render(<Harness initial="mockish" />);

    expect(box()).toHaveValue('Mockish');
    fireEvent.click(box());
    expect(options()).toEqual(['Fixtural', 'Mockish', 'Old Testic']);
  });

  it('holds no value while the text names no choice, and a choice once it names one in full', () => {
    render(<Harness initial="mockish" />);

    type('Mocki');
    expect(value()).toBeEmptyDOMElement();
    expect(box()).toHaveValue('Mocki');

    type('old testic');
    expect(value()).toHaveTextContent('testic');
    // Left, the box reads the choice's own label.
    fireEvent.blur(box());
    expect(box()).toHaveValue('Old Testic');
  });

  // The owner's call (MB.115): an empty box keeps its clear's room, so the
  // clear is drawn from the first render, hidden from the tree and the tab
  // order while there is nothing to clear, and offered once there is.
  it('clears to no choice from its clear, offered while it holds text or a choice and kept, hidden, while it does not', () => {
    render(<Harness initial="" clearable />);
    const clear = () => screen.queryByRole('button', { name: 'Clear Tradition' });
    // Out of the tree, it has no accessible name to be found by: found among
    // every button, hidden ones too, by the label it carries.
    const kept = () =>
      screen
        .getAllByRole('button', { hidden: true })
        .find((button) => button.getAttribute('aria-label') === 'Clear Tradition');

    expect(clear()).not.toBeInTheDocument();
    expect(kept()).toHaveAttribute('tabindex', '-1');

    type('zz');
    expect(clear()).toBeInTheDocument();
    expect(kept()).not.toHaveAttribute('tabindex');

    type('mockish');
    fireEvent.click(clear()!);
    expect(value()).toBeEmptyDOMElement();
    expect(box()).toHaveValue('');
    expect(box()).toHaveFocus();
    expect(clear()).not.toBeInTheDocument();
    expect(kept()).toHaveAttribute('tabindex', '-1');
  });
});
