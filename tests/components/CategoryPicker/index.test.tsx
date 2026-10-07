import { act, fireEvent, render, screen, within } from '@testing-library/react';
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
  name: 'Zanthic Testery',
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

// Out of order on purpose, groups and names both.
const CATEGORIES: PickerCategory[] = [
  category('c-zz', 'Zestwort', zanthic),
  category('c-tw', 'Testward', fixtureWard, 'Guards nothing in particular.'),
  category('c-ab', 'Ablefix', zanthic),
  category('c-tc', 'Testcraft', fixtureWard),
  category('c-cn', 'Cinderfix', ashen),
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

  it('lists every category under its group, groups and names alphabetical, a novel group included', () => {
    renderPicker();

    open();
    const list = screen.getByRole('listbox', { name: 'Category suggestions' });
    const groups = within(list).getAllByRole('group');
    expect(
      groups.map((group) => group.getAttribute('aria-labelledby') && group.textContent),
    ).toEqual([
      expect.stringContaining('Ashen Fixtures'),
      expect.stringContaining('Fixture Wards'),
      expect.stringContaining('Zanthic Testery'),
    ]);
    expect(
      within(screen.getByRole('group', { name: 'Fixture Wards' }))
        .getAllByRole('option')
        .map((row) => row.textContent),
    ).toEqual([expect.stringMatching(/^Testcraft/), expect.stringMatching(/^Testward/)]);
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

  it('adds a pick after the others, empties the box, says so, and offers it no more', () => {
    renderControlled(['c-zz']);

    open();
    type('able');
    fireEvent.click(option('Ablefix'));

    expect(box()).toHaveValue('');
    expect(changes()).toHaveTextContent('Added Ablefix');
    expect(screen.getAllByRole('button', { name: /^Remove / }).map((x) => x.textContent)).toEqual([
      '×',
      '×',
    ]);
    expect(removeButton('Zestwort')).toBeInTheDocument();
    expect(removeButton('Ablefix')).toBeInTheDocument();
    open();
    expect(screen.queryByRole('option', { name: /^Ablefix/ })).not.toBeInTheDocument();
    expect(screen.queryByRole('option', { name: /^Zestwort/ })).not.toBeInTheDocument();
  });

  it('reports the picks in order through onChange', () => {
    const { onChange } = renderPicker({ value: ['c-zz', 'c-tw'] });

    open();
    fireEvent.click(option('Cinderfix'));
    expect(onChange).toHaveBeenLastCalledWith(['c-zz', 'c-tw', 'c-cn']);

    fireEvent.click(removeButton('Zestwort'));
    expect(onChange).toHaveBeenLastCalledWith(['c-tw']);
  });

  it("draws each pick as an entry in its group's stored colour pair, its tooltip naming the group", () => {
    renderPicker({ value: ['c-ab', 'c-tw'] });

    const ablefix = entry('Ablefix');
    expect(ablefix).toHaveClass('combobox__entry', 'is-coloured');
    expect(ablefix.style.getPropertyValue('--chip-dark')).toBe('#8e7bd1');
    expect(ablefix.style.getPropertyValue('--chip-light')).toBe('#5a3fa8');
    expect(entry('Testward').style.getPropertyValue('--chip-dark')).toBe('#4e8bc2');
    expect(removeButton('Testward')).toHaveAccessibleDescription(
      'Fixture Wards Guards nothing in particular.',
    );
    // No description: the group alone.
    expect(removeButton('Ablefix')).toHaveAccessibleDescription('Zanthic Testery');
    // The tooltip's first line is the name with its group, the description beneath.
    fireEvent.mouseEnter(
      within(entry('Testward')).getByText('Testward', { ignore: '[role="tooltip"]' }),
    );
    expect(screen.getByRole('tooltip')).toHaveTextContent(/^Testward \(Fixture Wards\)/);
    // The chip itself reads the bare name.
    expect(entry('Ablefix')).toHaveTextContent(/^Ablefix/);
  });

  it("edges each row in its group's stored colour pair", () => {
    renderPicker();

    open();
    expect(option('Ablefix')).toHaveClass('combobox__option', 'is-coloured');
    expect(option('Ablefix').style.getPropertyValue('--chip-dark')).toBe('#8e7bd1');
    expect(option('Ablefix').style.getPropertyValue('--chip-light')).toBe('#5a3fa8');
    expect(option('Testward').style.getPropertyValue('--chip-dark')).toBe('#4e8bc2');
  });

  it('takes an entry out by its x, keeps the focus in the box, and says so', () => {
    renderControlled(['c-ab', 'c-tw']);

    fireEvent.click(removeButton('Ablefix'));

    expect(screen.queryByRole('button', { name: 'Remove Ablefix' })).not.toBeInTheDocument();
    expect(removeButton('Testward')).toBeInTheDocument();
    expect(box()).toHaveFocus();
    expect(changes()).toHaveTextContent('Removed Ablefix');
  });

  it('takes the last entry on Backspace in the empty box', () => {
    const { onChange } = renderPicker({ value: ['c-ab', 'c-tw'] });

    fireEvent.keyDown(box(), { key: 'Backspace' });

    expect(onChange).toHaveBeenLastCalledWith(['c-ab']);
  });

  it('clears every pick from its clear, shown only while there are picks', () => {
    renderControlled(['c-ab', 'c-tw']);

    fireEvent.click(screen.getByRole('button', { name: 'Clear Categories' }));

    expect(screen.queryByRole('button', { name: /^Remove / })).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Clear Categories' })).not.toBeInTheDocument();
    expect(changes()).toHaveTextContent('Cleared Categories');
    expect(box()).toHaveFocus();
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
    expect(entry('Testward')).toHaveClass('is-invalid');
    expect(removeButton('Testward')).toHaveAccessibleDescription(
      expect.stringContaining('Testward: No such category'),
    );
    expect(entry('Ablefix')).not.toHaveClass('is-invalid');
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

  // An edit's picks arrive before the categories do.
  it('holds a pick the categories do not name yet while they are read, then draws it by its id', () => {
    const { rerender } = render(
      <CategoryPicker {...PROPS} categories={[]} pending value={['c-gone']} />,
    );
    expect(screen.queryByRole('button', { name: /^Remove / })).not.toBeInTheDocument();

    rerender(<CategoryPicker {...PROPS} value={['c-gone']} />);
    expect(removeButton('c-gone')).toBeInTheDocument();
    expect(entry('c-gone')).not.toHaveClass('is-coloured');
  });
});
