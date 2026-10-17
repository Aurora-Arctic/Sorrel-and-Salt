import { fireEvent, render, screen, within } from '@testing-library/react';
import { useState } from 'react';
import { renderToString } from 'react-dom/server';
import { describe, expect, it, vi } from 'vitest';
import FacetCombobox from '@/components/FacetCombobox';
import type { FacetComboboxProps } from '@/components/FacetCombobox/types';

// A filter's closed set with how many entries each value would leave (M12.4):
// the multi-select box with counts, zero rows last and disabled, and each
// chosen value a hidden input of the filter's GET form
// (claude-docs/components/facet-combobox.md).

const CHOICES = [
  { value: 'air', label: 'Testair', count: 3 },
  { value: 'earth', label: 'Testearth', count: 0 },
  { value: 'fire', label: 'Testfire', count: 9 },
  { value: 'water', label: 'Testwater', count: 7 },
];

const PROPS: FacetComboboxProps = {
  label: 'Elements',
  name: 'elements',
  choices: CHOICES,
  values: [],
  onChange: () => {},
  placeholder: 'Add an element',
  removeNoun: 'Element',
};

function Controlled({
  initial = [],
  ...props
}: Partial<FacetComboboxProps> & { initial?: string[] }) {
  const [values, setValues] = useState(initial);
  return <FacetCombobox {...PROPS} {...props} values={values} onChange={setValues} />;
}

const box = () => screen.getByRole('combobox', { name: 'Elements' });
const open = () => fireEvent.click(box());
const hidden = (container: HTMLElement) =>
  [...container.querySelectorAll<HTMLInputElement>('input[type="hidden"][name="elements"]')].map(
    (input) => input.value,
  );

describe('FacetCombobox', () => {
  it('offers each value with its count, and a choice reaches onChange', () => {
    const onChange = vi.fn();
    render(<FacetCombobox {...PROPS} onChange={onChange} />);

    open();
    expect(screen.getByRole('option', { name: 'Testfire (9)' })).toBeInTheDocument();
    fireEvent.click(screen.getByRole('option', { name: 'Testfire (9)' }));

    expect(onChange).toHaveBeenCalledWith(['fire']);
  });

  it('lists a value with nothing behind it last, disabled, unless asked not to', () => {
    const { unmount } = render(<FacetCombobox {...PROPS} />);
    open();
    const rows = screen.getAllByRole('option');
    expect(rows[rows.length - 1]).toHaveAccessibleName(/^Testearth \(0\)/);
    expect(rows[rows.length - 1]).toHaveAttribute('aria-disabled', 'true');
    unmount();

    render(<FacetCombobox {...PROPS} disableZeros={false} />);
    open();
    expect(screen.getByRole('option', { name: /^Testearth \(0\)/ })).toHaveAttribute(
      'aria-disabled',
      'false',
    );
  });

  it('submits each chosen value as a hidden input under the name, in the order chosen', () => {
    const { container } = render(<Controlled />);
    expect(hidden(container)).toEqual([]);

    open();
    fireEvent.click(screen.getByRole('option', { name: 'Testwater (7)' }));
    fireEvent.click(screen.getByRole('option', { name: 'Testair (3)' }));

    expect(hidden(container)).toEqual(['water', 'air']);
  });

  it('draws a chosen value as a chip with its count, and its cross is named by the noun with or without it', () => {
    const { rerender } = render(<Controlled initial={['fire']} loading />);
    const chip = () =>
      screen.getByRole('button', { name: 'Remove Element: Testfire' }).closest('li')!;

    expect(chip()).not.toHaveTextContent('(9)');

    rerender(<Controlled initial={['fire']} />);
    expect(chip()).toHaveTextContent('(9)');
  });

  it('removes a value by its cross and empties by its clear, each reaching the hidden inputs', () => {
    const { container } = render(<Controlled initial={['fire', 'water']} />);

    fireEvent.click(screen.getByRole('button', { name: 'Remove Element: Testfire' }));
    expect(hidden(container)).toEqual(['water']);

    fireEvent.click(screen.getByRole('button', { name: 'Clear Elements' }));
    expect(hidden(container)).toEqual([]);
  });

  it('keeps a chosen value with a count of nothing removable', () => {
    render(<Controlled initial={['earth']} />);

    expect(screen.getByRole('button', { name: 'Remove Element: Testearth' })).toBeEnabled();
  });

  // Before the script runs, a press on the search's magnifier sends the form,
  // so the server draws a native multiple select that carries the values.
  it('is drawn by the server as a native multiple select holding the values, zero rows disabled', () => {
    const markup = renderToString(<FacetCombobox {...PROPS} values={['fire']} />);
    const host = document.createElement('div');
    host.innerHTML = markup;
    document.body.append(host);

    const select = within(host).getByRole('listbox', { name: 'Elements' });
    expect(select).toHaveAttribute('name', 'elements');
    expect(select).toHaveAttribute('multiple');
    expect(within(select).getByRole('option', { name: 'Testfire (9)' })).toHaveProperty(
      'selected',
      true,
    );
    expect(within(select).getByRole('option', { name: 'Testair (3)' })).toHaveProperty(
      'selected',
      false,
    );
    expect(within(select).getByRole('option', { name: 'Testearth (0)' })).toBeDisabled();
    host.remove();
  });

  describe('typeahead', () => {
    const typeInto = (text: string) => fireEvent.change(box(), { target: { value: text } });

    it('narrows the rows to what is typed, and a pick reaches the hidden inputs and clears the text', () => {
      const { container } = render(<Controlled typeahead />);

      typeInto('wat');
      expect(screen.getAllByRole('option')).toHaveLength(1);
      fireEvent.click(screen.getByRole('option', { name: 'Testwater (7)' }));

      expect(hidden(container)).toEqual(['water']);
      expect(box()).toHaveValue('');
    });

    it('lists no chosen value, and a value with nothing behind it last and unchoosable', () => {
      const { container } = render(<Controlled typeahead initial={['fire']} />);

      open();
      const rows = screen.getAllByRole('option');
      expect(rows.map((row) => row.textContent)).not.toContain('Testfire (9)');
      expect(rows[rows.length - 1]).toHaveAccessibleName(/^Testearth \(0\)/);
      expect(rows[rows.length - 1]).toHaveAttribute('aria-disabled', 'true');
      fireEvent.click(rows[rows.length - 1]!);

      expect(hidden(container)).toEqual(['fire']);
    });

    it('draws chips with counts, removes by cross and by clear, and keeps a zero chip removable', () => {
      const { container } = render(<Controlled typeahead initial={['earth', 'fire', 'water']} />);

      expect(screen.getByRole('button', { name: 'Remove Element: Testearth' })).toBeEnabled();
      fireEvent.click(screen.getByRole('button', { name: 'Remove Element: Testfire' }));
      expect(hidden(container)).toEqual(['earth', 'water']);
      fireEvent.click(screen.getByRole('button', { name: 'Clear Elements' }));
      expect(hidden(container)).toEqual([]);
    });

    it("holds a placeholder where a chip's count will be while loading", () => {
      render(<Controlled typeahead initial={['fire']} loading />);

      expect(
        screen.getByRole('button', { name: 'Remove Element: Testfire' }).closest('li'),
      ).not.toHaveTextContent('(9)');
    });
  });

  describe('groups', () => {
    const GROUPED = [
      { value: 'air', label: 'Testair', count: 3, group: 'Classical' },
      { value: 'fire', label: 'Testfire', count: 9, group: 'Classical' },
      { value: 'spirit', label: 'Testspirit', count: 1, group: 'Other' },
    ];

    it('sets each choice under its group heading in the list, and a pick still submits', () => {
      const { container } = render(<Controlled typeahead choices={GROUPED} />);

      open();
      const classical = screen.getByRole('group', { name: 'Classical' });
      expect(within(classical).getAllByRole('option')).toHaveLength(2);
      expect(
        within(screen.getByRole('group', { name: 'Other' })).getByRole('option', {
          name: 'Testspirit (1)',
        }),
      ).toBeInTheDocument();
      fireEvent.click(screen.getByRole('option', { name: 'Testspirit (1)' }));

      expect(hidden(container)).toEqual(['spirit']);
    });

    it('draws the native select with the groups as optgroups', () => {
      const markup = renderToString(<FacetCombobox {...PROPS} typeahead choices={GROUPED} />);
      const host = document.createElement('div');
      host.innerHTML = markup;

      expect([...host.querySelectorAll('optgroup')].map((group) => group.label)).toEqual([
        'Classical',
        'Other',
      ]);
    });
  });
});
