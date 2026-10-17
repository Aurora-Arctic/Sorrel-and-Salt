import { fireEvent, render, screen, within } from '@testing-library/react';
import { useState } from 'react';
import { describe, expect, it, vi } from 'vitest';
import Combobox, { ComboboxEntry, ComboboxMultiSelect } from '@/components/Combobox';
import type { ComboboxChoice, ComboboxOption } from '@/components/Combobox/types';

// The multi-select's counts and disabled rows, and the chip's icon, count and
// loading mark (M12.4): what a faceted filter draws, with the box unchanged
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
  disableZeros?: boolean;
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
const press = (name: string) => fireEvent.keyDown(box(), { key: name });

describe('the multi-select box with counts', () => {
  it('reads each option as its name and count together', () => {
    render(<Harness />);
    fireEvent.click(box());

    expect(screen.getByRole('option', { name: 'Fire (9)' })).toBeInTheDocument();
    expect(screen.getByRole('option', { name: 'Earth (4)' })).toBeInTheDocument();
  });

  it('leaves zero-count options chooseable and in place unless asked', () => {
    render(<Harness />);
    fireEvent.click(box());

    expect(names().map((text) => text?.split(' (')[0])).toEqual([
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

  describe('when it disables zero counts', () => {
    it('lists the zero-count options last, disabled, with the reason beside them', () => {
      render(<Harness disableZeros />);
      fireEvent.click(box());

      expect(names().map((text) => text?.split(' (')[0])).toEqual([
        'Earth',
        'Fire',
        'Spirit',
        'Air',
        'Water',
      ]);
      const air = screen.getByRole('option', { name: /^Air/ });
      expect(air).toHaveAttribute('aria-disabled', 'true');
      // Still read, and still says its count and why it is out.
      expect(air).toHaveTextContent('Air (0)');
      expect(air).toHaveTextContent('Nothing Matches');
      expect(screen.getByRole('option', { name: 'Earth (4)' })).not.toHaveAttribute(
        'aria-disabled',
        'true',
      );
    });

    it('refuses a press on a disabled option, where the same press chooses it unasked', () => {
      const { unmount } = render(<Harness />);
      fireEvent.click(box());
      fireEvent.click(screen.getByRole('option', { name: /^Air/ }));
      expect(chosen()).toBe('air');
      unmount();

      render(<Harness disableZeros />);
      fireEvent.click(box());
      fireEvent.click(screen.getByRole('option', { name: /^Air/ }));
      expect(chosen()).toBe('');
    });

    it('steps the arrow keys over disabled options and never chooses one', () => {
      render(<Harness disableZeros initial={['earth', 'fire']} />);
      fireEvent.click(box());
      // Spirit, then the two disabled rows.
      expect(names().map((text) => text?.split(' (')[0])).toEqual(['Spirit', 'Air', 'Water']);

      press('ArrowDown');
      expect(box()).toHaveAttribute(
        'aria-activedescendant',
        screen.getByRole('option', { name: 'Spirit (2)' }).id,
      );
      press('ArrowDown');
      // Nothing past Spirit is reachable: the highlight stays or wraps to it.
      expect(box()).toHaveAttribute(
        'aria-activedescendant',
        screen.getByRole('option', { name: 'Spirit (2)' }).id,
      );
      press('Enter');
      expect(chosen()).toBe('earth,fire,spirit');
    });

    it('closes once only disabled options are left, and offers them again when a chip goes', () => {
      render(<Harness disableZeros initial={['earth', 'fire']} />);
      fireEvent.click(box());
      fireEvent.click(screen.getByRole('option', { name: 'Spirit (2)' }));

      expect(chosen()).toBe('earth,fire,spirit');
      expect(box()).toHaveAttribute('aria-expanded', 'false');
    });

    it('never disables a zero-count value that is already chosen', () => {
      render(<Harness disableZeros initial={['air']} />);

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
    expect(chip).toHaveTextContent('Fire (9)');
    expect(chip.querySelector('[data-icon]')?.closest('[aria-hidden="true"]')).not.toBeNull();
    expect(screen.getByRole('button', { name: 'Remove Element: Fire' })).toBeInTheDocument();
  });

  it('puts a hidden placeholder where the count goes while loading, naming the cross the same', () => {
    const { rerender } = render(<Harness removeNoun="Element" initial={['fire']} />);
    const name = screen
      .getByRole('button', { name: 'Remove Element: Fire' })
      .getAttribute('aria-label');

    rerender(<Harness removeNoun="Element" initial={['fire']} loading />);
    const chip = screen.getByRole('listitem');
    expect(within(chip).getByRole('button')).toHaveAttribute('aria-label', name);
    expect(chip.querySelector('.combobox__entry-count.is-pending')).toHaveAttribute(
      'aria-hidden',
      'true',
    );
    expect(chip).not.toHaveTextContent('(');
  });

  it('takes the count off the chip for a value without one', () => {
    render(<Harness initial={['fire']} choices={[{ value: 'fire', label: 'Fire' }]} />);

    expect(screen.getByRole('listitem')).not.toHaveTextContent('(');
  });
});

describe('a standalone entry', () => {
  it('removes itself from its cross, named for its noun, outlined or filled', () => {
    const onRemove = vi.fn();
    render(
      <ul>
        <ComboboxEntry value="Water" count={7} removeNoun="Element" outlined onRemove={onRemove} />
      </ul>,
    );

    expect(screen.getByRole('listitem')).toHaveTextContent('Water (7)');
    fireEvent.click(screen.getByRole('button', { name: 'Remove Element: Water' }));
    expect(onRemove).toHaveBeenCalledOnce();
  });

  it('keeps a category chip filled in its colours even when outlined chips are asked for', () => {
    render(
      <ul>
        <ComboboxEntry
          value="Testward"
          colors={{ colorDark: '#336699', colorLight: '#224466' }}
          outlined
          onRemove={() => {}}
        />
      </ul>,
    );

    const chip = screen.getByRole('listitem');
    expect(chip).toHaveClass('is-coloured');
    expect(chip).not.toHaveClass('is-outlined');
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
    expect(disabled).toHaveTextContent('Nothing Matches');
    fireEvent.click(disabled);
    expect(onPick).not.toHaveBeenCalled();

    fireEvent.click(screen.getByRole('option', { name: 'Testward (3)' }));
    expect(onPick).toHaveBeenCalledWith('Testward', expect.objectContaining({ count: 3 }));
  });
});
