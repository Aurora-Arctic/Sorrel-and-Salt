import { fireEvent, render, screen, within } from '@testing-library/react';
import { useState } from 'react';
import { describe, expect, it, vi } from 'vitest';
import Combobox, { ComboboxEntry, ComboboxMultiSelect } from '@/components/Combobox';
import type { ComboboxChoice, ComboboxOption } from '@/components/Combobox/types';

// The multi-select's counts and disabled rows, and the chip's icon, count and
// loading mark: what a faceted filter draws, with the box unchanged
// for a caller that passes none of them.

const ELEMENTS: ComboboxChoice[] = [
  { value: 'earth', label: 'Earth', count: 4 },
  { value: 'air', label: 'Air', count: 0 },
  { value: 'fire', label: 'Fire', count: 9 },
  { value: 'water', label: 'Water', count: 0 },
  { value: 'spirit', label: 'Spirit', count: 2 },
];

function Harness({
  initial = [],
  choices = ELEMENTS,
  ...props
}: {
  initial?: string[];
  choices?: ComboboxChoice[];
  hideZeros?: boolean;
  loading?: boolean;
  chipsOutlined?: boolean;
  removeNoun?: string;
}) {
  const [values, setValues] = useState(initial);
  return (
    <>
      <ComboboxMultiSelect
        id="elements"
        label="Element"
        values={values}
        onChange={setValues}
        choices={choices}
        {...props}
      />
      <output aria-label="Chosen">{values.join(',')}</output>
    </>
  );
}

const box = () => screen.getByRole('combobox', { name: 'Element' });
const chosen = () => screen.getByRole('status', { name: 'Chosen' }).textContent;
const rows = () => screen.queryAllByRole('option');
const names = () => rows().map((row) => row.textContent);

describe('the multi-select box with counts', () => {
  it('reads each option as its name and count together', () => {
    render(<Harness />);
    fireEvent.click(box());

    expect(screen.getByRole('option', { name: 'Fire 9' })).toBeInTheDocument();
    expect(screen.getByRole('option', { name: 'Earth 4' })).toBeInTheDocument();
  });

  it('leaves zero-count options chooseable and in place unless asked', () => {
    render(<Harness />);
    fireEvent.click(box());

    expect(names().map((text) => text?.replace(/ \d+$/, ''))).toEqual([
      'Earth',
      'Air',
      'Fire',
      'Water',
      'Spirit',
    ]);
    expect(rows().every((row) => row.getAttribute('aria-disabled') !== 'true')).toBe(true);
    fireEvent.click(screen.getByRole('option', { name: /^Air/ }));
    expect(chosen()).toBe('air');
  });

  describe('when it hides zero counts', () => {
    it('leaves the zero-count options out and keeps the rest in place', () => {
      render(<Harness hideZeros />);
      fireEvent.click(box());

      // Why they could have been listed: Air and Water are in the choices, at 0.
      expect(ELEMENTS.filter((choice) => choice.count === 0)).toHaveLength(2);
      expect(names().map((text) => text?.replace(/ \d+$/, ''))).toEqual([
        'Earth',
        'Fire',
        'Spirit',
      ]);
      expect(screen.queryByRole('option', { name: /^Air/ })).not.toBeInTheDocument();
    });

    it('lists no option at all when every choice is zero, and the box stays', () => {
      render(<Harness hideZeros choices={ELEMENTS.map((choice) => ({ ...choice, count: 0 }))} />);
      fireEvent.click(box());

      expect(rows()).toHaveLength(0);
      expect(box()).toBeInTheDocument();
    });

    it('keeps a zero-count value that is already chosen as a removable chip', () => {
      render(<Harness hideZeros initial={['air']} />);

      const remove = screen.getByRole('button', { name: 'Remove Air' });
      expect(remove).toBeEnabled();
      fireEvent.click(remove);
      expect(chosen()).toBe('');
    });
  });

  it('disables a choice the caller marks, last, whatever its count', () => {
    render(
      <Harness
        choices={[
          { value: 'a', label: 'Alpha', disabled: true, note: 'Retired' },
          { value: 'b', label: 'Beta' },
        ]}
      />,
    );
    fireEvent.click(box());

    expect(names()).toEqual(['Beta', 'AlphaRetired']);
    fireEvent.click(screen.getByRole('option', { name: /^Alpha/ }));
    expect(chosen()).toBe('');
  });
});

describe('a chip in the multi-select', () => {
  it('shows its count and a leading mark outside its name, and the cross names the value', () => {
    render(
      <Harness
        removeNoun="Element"
        initial={['fire']}
        choices={[{ value: 'fire', label: 'Fire', count: 9, icon: <svg data-icon /> }]}
      />,
    );

    const chip = screen.getByRole('listitem');
    expect(chip).toHaveTextContent('Fire 9');
    expect(chip.querySelector('[data-icon]')?.closest('[aria-hidden="true"]')).not.toBeNull();
    expect(screen.getByRole('button', { name: 'Remove Element: Fire' })).toBeInTheDocument();
  });

  it('announces no count while loading, naming the cross the same', () => {
    const { rerender } = render(<Harness removeNoun="Element" initial={['fire']} />);
    const name = screen
      .getByRole('button', { name: 'Remove Element: Fire' })
      .getAttribute('aria-label');

    rerender(<Harness removeNoun="Element" initial={['fire']} loading />);
    const chip = screen.getByRole('listitem');
    expect(within(chip).getByRole('button')).toHaveAttribute('aria-label', name);
    expect(chip).not.toHaveTextContent('(');
  });

  it('takes the count off the chip for a value without one', () => {
    render(<Harness initial={['fire']} choices={[{ value: 'fire', label: 'Fire' }]} />);

    expect(screen.getByRole('listitem')).not.toHaveTextContent('(');
  });
});

describe('a standalone entry', () => {
  it('removes itself from its cross, named for its noun', () => {
    const onRemove = vi.fn();
    render(
      <ul>
        <ComboboxEntry value="Water" count={7} removeNoun="Element" outlined onRemove={onRemove} />
      </ul>,
    );

    expect(screen.getByRole('listitem')).toHaveTextContent('Water 7');
    fireEvent.click(screen.getByRole('button', { name: 'Remove Element: Water' }));
    expect(onRemove).toHaveBeenCalledOnce();
  });
});

describe('the suggesting box with counts', () => {
  const OPTIONS: ComboboxOption[] = [
    { value: 'Testward', count: 3 },
    { value: 'Testcraft', count: 0, disabled: true, note: 'Nothing Matches' },
  ];

  function Typed({ onPick }: { onPick: (value: string) => void }) {
    const [text, setText] = useState('');
    return (
      <Combobox
        id="typed"
        label="Category"
        value={text}
        onChange={setText}
        onPick={onPick}
        suggestions={{ options: OPTIONS, pending: false }}
        offerTyped={false}
      />
    );
  }

  it('reads an option as its name and count, and refuses a disabled one a press', () => {
    const onPick = vi.fn();
    render(<Typed onPick={onPick} />);
    fireEvent.click(screen.getByRole('button', { name: 'Show Category suggestions' }));

    const disabled = screen.getByRole('option', { name: /^Testcraft/ });
    expect(disabled).toHaveAttribute('aria-disabled', 'true');
    fireEvent.click(disabled);
    expect(onPick).not.toHaveBeenCalled();

    fireEvent.click(screen.getByRole('option', { name: 'Testward 3' }));
    expect(onPick).toHaveBeenCalledWith('Testward', expect.objectContaining({ count: 3 }));
  });
});
