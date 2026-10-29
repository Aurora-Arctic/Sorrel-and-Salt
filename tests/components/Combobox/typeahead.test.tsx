import { act, fireEvent, render, screen } from '@testing-library/react';
import { useState } from 'react';
import { describe, expect, it, vi } from 'vitest';
import { ComboboxTypeahead } from '@/components/Combobox/typeahead';

// The type-ahead box: a closed set chosen by typing, the list
// narrowing to the choices whose label holds the text, and only a choice
// ever the value (claude-docs/components/combobox.md, "The type-ahead box").

const TRADITIONS = [
  { value: 'fixtural', label: 'Fixtural' },
  { value: 'mockish', label: 'Mockish' },
  { value: 'testic', label: 'Old Testic' },
];

/** The box with its value held outside it, and shown, as a form holds a field's. */
function Harness({
  initial = '',
  clearable,
  onSettle,
}: {
  initial?: string;
  clearable?: boolean;
  onSettle?: (value: string) => void;
}) {
  const [value, setValue] = useState(initial);
  return (
    <>
      <ComboboxTypeahead
        id="tradition"
        label="Tradition"
        value={value}
        onChange={setValue}
        onSettle={onSettle}
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

  // A press where the hidden clear sits lands on
  // the indicators' strip, `visibility` passing it through, and enters the
  // box as a press on the rest of the control does.
  it('enters the box from a press where its hidden clear sits', () => {
    render(<Harness initial="" clearable />);
    const kept = screen
      .getAllByRole('button', { hidden: true })
      .find((button) => button.getAttribute('aria-label') === 'Clear Tradition');

    fireEvent.mouseDown(kept!.parentElement!);

    expect(box()).toHaveFocus();
  });

  // An empty box keeps its clear's room, so the
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

  // A choice may say what it is besides its label: a member's role.
  // The row reads it, the chosen box describes it, and typing never matches it.
  it('reads a qualified choice with its qualifier, describes the chosen one by it, and matches the label alone', () => {
    const [plain, ...rest] = TRADITIONS;
    function Qualified() {
      const [value, setValue] = useState('');
      return (
        <ComboboxTypeahead
          id="tradition"
          label="Tradition"
          value={value}
          onChange={setValue}
          choices={[
            { ...plain, qualifier: { text: 'Fixture Isle', detail: 'Practised on the isle.' } },
            ...rest,
          ]}
        />
      );
    }
    render(<Qualified />);

    fireEvent.click(box());
    expect(options()).toEqual(['Fixtural (Fixture Isle)', 'Mockish', 'Old Testic']);
    type('isle');
    expect(options()).toEqual([]);

    type('fix');
    fireEvent.click(screen.getByRole('option', { name: /Fixtural/ }));
    expect(box()).toHaveValue('Fixtural');
    expect(box()).toHaveAccessibleDescription('(Fixture Isle) Practised on the isle.');

    // Typed over in another case, the box is being typed in, not describing.
    type('fixtural');
    expect(box()).not.toHaveAccessibleDescription(/Fixture Isle/);
  });

  // A form group's icon leads the chosen label, as the select-only
  // box's closed value draws it; typed over, the box is being typed in.
  it('draws the chosen choice icon before the text once the box reads its label, never while typed', () => {
    const [marked, ...rest] = TRADITIONS;
    function Marked() {
      const [value, setValue] = useState('');
      return (
        <ComboboxTypeahead
          id="tradition"
          label="Tradition"
          value={value}
          onChange={setValue}
          choices={[{ ...marked, icon: <svg data-mark="fixtural" /> }, ...rest]}
        />
      );
    }
    render(<Marked />);
    const control = () => box().closest('.combobox__control') as HTMLElement;

    fireEvent.click(box());
    const row = screen.getByRole('option', { name: 'Fixtural' });
    expect(row.querySelector('[aria-hidden="true"] svg')).not.toBeNull();
    expect(screen.getByRole('option', { name: 'Mockish' }).querySelector('svg')).toBeNull();
    expect(control().querySelector('[aria-hidden="true"] [data-mark]')).toBeNull();

    fireEvent.click(row);
    expect(box()).toHaveValue('Fixtural');
    expect(control().querySelector('[aria-hidden="true"] [data-mark]')).not.toBeNull();
    expect(box()).toHaveAccessibleName('Tradition');

    type('fixtural');
    expect(control().querySelector('[aria-hidden="true"] [data-mark]')).toBeNull();
  });

  // A filter applies a choice, not each letter typed: it hears the
  // value once a pick, the clear or leaving the box settles it.
  it('settles on a pick, on its clear and on leaving the box, never while typed', () => {
    const onSettle = vi.fn();
    render(<Harness clearable onSettle={onSettle} />);

    type('mock');
    type('mockish');
    expect(value()).toHaveTextContent('mockish');
    expect(onSettle).not.toHaveBeenCalled();

    fireEvent.blur(box());
    expect(onSettle).toHaveBeenLastCalledWith('mockish');

    type('zz');
    fireEvent.blur(box());
    expect(onSettle).toHaveBeenLastCalledWith('');

    type('fix');
    fireEvent.click(screen.getByRole('option', { name: 'Fixtural' }));
    expect(onSettle).toHaveBeenLastCalledWith('fixtural');

    fireEvent.click(screen.getByRole('button', { name: 'Clear Tradition' }));
    expect(onSettle).toHaveBeenLastCalledWith('');
    expect(onSettle).toHaveBeenCalledTimes(4);
  });
});
