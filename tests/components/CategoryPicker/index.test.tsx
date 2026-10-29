import { act, cleanup, fireEvent, render, screen, within } from '@testing-library/react';
import { useState } from 'react';
import { describe, expect, it, vi } from 'vitest';
import CategoryPicker from '@/components/CategoryPicker';
import type {
  CategoryPickerProps,
  PickerCategory,
  PickerGroup,
} from '@/components/CategoryPicker/types';

// The categories picked from one box, as a list field's entries are, the
// rows under their groups and each pick a chip in its group's colour: the
// form's category field and, in M8.11, the ingredients filter
// (claude-docs/components/category-picker.md).

const fixtureWard: PickerGroup = {
  id: 'g-ward',
  name: 'Fixture Wards',
  colorDark: '#4e8bc2',
  colorLight: '#0c5393',
};
// A group no code names: the picker knows groups only from the rows.
const zanthic: PickerGroup = {
  id: 'g-zanthic',
  name: 'Zanthic Oddments',
  colorDark: '#8e7bd1',
  colorLight: '#5a3fa8',
};
const ashen: PickerGroup = {
  id: 'g-ashen',
  name: 'Ashen Fixtures',
  colorDark: '#35987d',
  colorLight: '#097255',
};

const category = (
  id: string,
  name: string,
  group: PickerGroup,
  description?: string,
): PickerCategory => ({ id, name, group, description });

// In the order the vocabulary read gives them, groups and names alphabetical
// : the picker keeps the order it is given.
const CATEGORIES: PickerCategory[] = [
  category('c-cn', 'Cinderfix', ashen),
  category('c-tc', 'Testcraft', fixtureWard),
  category('c-tw', 'Testward', fixtureWard, 'Guards nothing in particular.'),
  category('c-ab', 'Ablefix', zanthic),
  category('c-zz', 'Zestwort', zanthic),
];

const PROPS: CategoryPickerProps = {
  legend: 'Categories',
  entry: 'Category',
  categories: CATEGORIES,
  value: [],
  onChange: () => {},
};

function renderPicker(props: Partial<CategoryPickerProps> = {}) {
  const onChange = vi.fn();
  render(<CategoryPicker {...PROPS} onChange={onChange} {...props} />);
  return { onChange };
}

/** The picker holding its own picks, as the form holds them for it. */
function renderControlled(initial: string[] = [], props: Partial<CategoryPickerProps> = {}) {
  function Controlled() {
    const [value, setValue] = useState(initial);
    return <CategoryPicker {...PROPS} {...props} value={value} onChange={setValue} />;
  }
  render(<Controlled />);
}

const box = () => screen.getByRole('combobox', { name: 'Category' });
const open = () =>
  fireEvent.click(screen.getByRole('button', { name: 'Show Category suggestions' }));
const type = (text: string) => fireEvent.change(box(), { target: { value: text } });
const option = (name: string) => screen.getByRole('option', { name: new RegExp(`^${name}`) });
const removeButton = (name: string) => screen.getByRole('button', { name: `Remove ${name}` });
/** An entry's chip: the row around its x. */
const entry = (name: string) => removeButton(name).closest('li')!;
const changes = () => screen.getByRole('status', { name: 'Categories changes' });

describe('CategoryPicker', () => {
  it('is a group named by its legend, holding one box named for an entry', () => {
    renderPicker({ hint: 'What it is used for.' });

    expect(screen.getByRole('group', { name: 'Categories' })).toBeInTheDocument();
    expect(box()).toHaveAccessibleDescription('What it is used for.');
  });

  // The order is the read's, sorted in SQL, so the picker sorts
  // nothing. Groups and names here run against the alphabet, so a re-sort
  // would read differently.
  it('lists every category under its group in the order given, a novel group included', () => {
    renderPicker({
      categories: [
        category('c-zz', 'Zestwort', zanthic),
        category('c-ab', 'Ablefix', zanthic),
        category('c-tw', 'Testward', fixtureWard, 'Guards nothing in particular.'),
        category('c-tc', 'Testcraft', fixtureWard),
        category('c-cn', 'Cinderfix', ashen),
      ],
    });

    open();
    const list = screen.getByRole('listbox', { name: 'Category suggestions' });
    const groups = within(list).getAllByRole('group');
    expect(
      groups.map((group) => group.getAttribute('aria-labelledby') && group.textContent),
    ).toEqual([
      expect.stringContaining('Zanthic Oddments'),
      expect.stringContaining('Fixture Wards'),
      expect.stringContaining('Ashen Fixtures'),
    ]);
    expect(
      within(screen.getByRole('group', { name: 'Zanthic Oddments' }))
        .getAllByRole('option')
        .map((row) => row.textContent),
    ).toEqual([expect.stringMatching(/^Zestwort/), expect.stringMatching(/^Ablefix/)]);
    expect(
      within(screen.getByRole('group', { name: 'Fixture Wards' }))
        .getAllByRole('option')
        .map((row) => row.textContent),
    ).toEqual([expect.stringMatching(/^Testward/), expect.stringMatching(/^Testcraft/)]);
    // A description reads beneath its row.
    expect(option('Testward')).toHaveTextContent('Guards nothing in particular.');
  });

  it('narrows the rows to the names holding the text, and offers nothing typed', () => {
    renderPicker();

    open();
    type('test');

    expect(screen.getAllByRole('option').map((row) => row.textContent)).toEqual([
      expect.stringMatching(/^Testcraft/),
      expect.stringMatching(/^Testward/),
    ]);
    expect(screen.queryByRole('option', { name: /Use what you typed/ })).not.toBeInTheDocument();
  });

  it('adds a pick after the others, empties the box, announces it, and offers it no more', () => {
    renderControlled(['c-zz']);

    open();
    type('able');
    fireEvent.click(option('Ablefix'));

    expect(box()).toHaveValue('');
    expect(changes()).toHaveTextContent('Ablefix');
    expect(removeButton('Zestwort')).toBeInTheDocument();
    expect(removeButton('Ablefix')).toBeInTheDocument();
    open();
    expect(screen.queryByRole('option', { name: /^Ablefix/ })).not.toBeInTheDocument();
    expect(screen.queryByRole('option', { name: /^Zestwort/ })).not.toBeInTheDocument();
  });

  // Each pick adds a chip, so the list stays open for the next, in the facet and a form alike.
  it('keeps the list open after a pick, with the focus in the box, for the next', () => {
    renderControlled();

    box().focus();
    open();
    fireEvent.click(option('Ablefix'));

    expect(removeButton('Ablefix')).toBeInTheDocument();
    expect(box()).toHaveAttribute('aria-expanded', 'true');
    expect(box()).toHaveFocus();
  });

  // The ×, Backspace and the clear are Combobox's; what the picker does with
  // each is its own.
  it('reports the picks in order through onChange, as one is added, removed, taken by Backspace or cleared', () => {
    const { onChange } = renderPicker({ value: ['c-zz', 'c-tw'] });

    open();
    fireEvent.click(option('Cinderfix'));
    expect(onChange).toHaveBeenLastCalledWith(['c-zz', 'c-tw', 'c-cn']);

    fireEvent.click(removeButton('Zestwort'));
    expect(onChange).toHaveBeenLastCalledWith(['c-tw']);

    fireEvent.keyDown(box(), { key: 'Escape' });
    fireEvent.keyDown(box(), { key: 'Backspace' });
    expect(onChange).toHaveBeenLastCalledWith(['c-zz']);

    fireEvent.click(screen.getByRole('button', { name: 'Clear Categories' }));
    expect(onChange).toHaveBeenLastCalledWith([]);
    expect(box()).toHaveFocus();
  });

  it('describes each pick by its group and description, its tooltip naming the group', async () => {
    renderPicker({ value: ['c-ab', 'c-tw'] });

    expect(removeButton('Testward')).toHaveAccessibleDescription(
      'Fixture Wards Guards nothing in particular.',
    );
    // No description: the group alone.
    expect(removeButton('Ablefix')).toHaveAccessibleDescription('Zanthic Oddments');
    fireEvent.mouseEnter(
      within(entry('Testward')).getByText('Testward', { ignore: '[role="tooltip"]' }),
    );
    expect(await screen.findByRole('tooltip')).toHaveTextContent('Fixture Wards');
  });

  // Nothing typed is a category, so Enter adds only the one the text names whole.
  it('adds on Enter the one category the text names whole, and nothing for part of a name', () => {
    renderControlled();

    act(() => box().focus());
    type('test');
    fireEvent.keyDown(box(), { key: 'Enter' });
    expect(screen.queryByRole('button', { name: /^Remove / })).not.toBeInTheDocument();
    expect(box()).toHaveValue('test');

    type('testward');
    fireEvent.keyDown(box(), { key: 'Enter' });
    expect(removeButton('Testward')).toBeInTheDocument();
    expect(box()).toHaveValue('');
  });

  it('marks the box and the entries an error names, each described by it', () => {
    renderPicker({
      value: ['c-ab', 'c-tw'],
      invalid: ['c-tw'],
      errorId: 'categories-error',
      error: <p id="categories-error">Testward: No such category</p>,
    });

    expect(box()).toBeInvalid();
    expect(box()).toHaveAccessibleDescription('Testward: No such category');
    expect(removeButton('Testward')).toHaveAccessibleDescription(
      expect.stringContaining('Testward: No such category'),
    );
    expect(removeButton('Ablefix')).not.toHaveAccessibleDescription(
      expect.stringContaining('No such category'),
    );
  });

  it('says its status beneath the box, read with it', () => {
    renderPicker({ categories: [], status: 'The categories could not be loaded.' });

    expect(screen.getByText('The categories could not be loaded.')).toBeInTheDocument();
    expect(box()).toHaveAccessibleDescription('The categories could not be loaded.');
    expect(box()).not.toBeInvalid();
  });

  it('marks its box busy while the categories are read', () => {
    const { rerender } = render(<CategoryPicker {...PROPS} categories={[]} pending />);
    expect(screen.getByRole('combobox')).toHaveAttribute('aria-busy', 'true');

    rerender(<CategoryPicker {...PROPS} />);
    expect(screen.getByRole('combobox')).not.toHaveAttribute('aria-busy');
  });

  // An edit's picks arrive before the categories do.
  it('holds a pick the categories do not name yet while they are read, then draws it by its id', () => {
    const { rerender } = render(
      <CategoryPicker {...PROPS} categories={[]} pending value={['c-gone']} />,
    );
    expect(screen.queryByRole('button', { name: /^Remove / })).not.toBeInTheDocument();

    rerender(<CategoryPicker {...PROPS} value={['c-gone']} />);
    expect(removeButton('c-gone')).toBeInTheDocument();
  });

  // The filter reads the picker with counts: how many entries each
  // category would leave.
  describe('with counts', () => {
    const counted = (): PickerCategory[] =>
      CATEGORIES.map((c) => ({
        ...c,
        count: ({ 'c-tw': 4, 'c-tc': 0 } as Record<string, number>)[c.id] ?? 1,
      }));

    it('reads a row as its name and count together, and a pick the same', () => {
      renderControlled(['c-tw'], { categories: counted() });

      expect(entry('Testward')).toHaveTextContent('4');
      open();
      expect(screen.getByRole('option', { name: /^Testcraft 0/ })).toBeInTheDocument();
      expect(screen.getByRole('option', { name: /^Ablefix 1/ })).toBeInTheDocument();
    });

    it('leaves a zero-count row choosable unless asked, and leaves it out when asked', () => {
      const { onChange } = renderPicker({ categories: counted() });
      open();
      fireEvent.click(screen.getByRole('option', { name: /^Testcraft 0/ }));
      expect(onChange).toHaveBeenCalledWith(['c-tc']);

      cleanup();
      renderPicker({ categories: counted(), hideZeros: true });
      open();
      expect(screen.queryByRole('option', { name: /^Testcraft/ })).not.toBeInTheDocument();
      expect(screen.getByRole('option', { name: /^Ablefix 1/ })).toBeInTheDocument();
    });

    it('names a pick for removal by the noun it is given', () => {
      renderPicker({ categories: counted(), value: ['c-tw'], removeNoun: 'Category' });

      expect(screen.getByRole('button', { name: 'Remove Category: Testward' })).toBeInTheDocument();
    });
  });
});
