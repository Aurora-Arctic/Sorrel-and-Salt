import { act, fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import { useState } from 'react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import Combobox, { ComboboxEntry } from '@/components/Combobox';
import type { ComboboxOption, Suggestions } from '@/components/Combobox/types';
import type { HarnessProps } from './types';

// A text box that suggests as it is typed in, on Downshift's `useCombobox`:
// the suggestions in their buckets, what was typed as the last row, and a
// pick that writes nothing itself (claude-docs/components/combobox.md).

const WAX_ANIMAL: ComboboxOption = {
  value: 'Wax',
  label: 'Wax (Animal)',
  note: 'Used by Testwort (Fixtura testalis)',
  curated: true,
};
const WAX_SUBSTANCE: ComboboxOption = { value: 'Wax', label: 'Wax (Substance)', curated: true };
const RHIZOMES: ComboboxOption = { value: 'Rhizomes', note: 'Used by Mockleaf', curated: false };
const TWO_BUCKETS: Suggestions = {
  options: [WAX_ANIMAL, WAX_SUBSTANCE, RHIZOMES],
  pending: false,
};
const ONE_BUCKET: Suggestions = {
  options: [{ value: 'Hedge Fixture', note: 'Used by Testwort' }, { value: 'Fixture Bane' }],
  pending: false,
};

/** The box with its text held outside it, as a form holds a field's. */
function Harness({ initial = '', ...props }: HarnessProps) {
  const [value, setValue] = useState(initial);
  return (
    <>
      <Combobox
        id="box"
        label="Form"
        value={value}
        onChange={setValue}
        onPick={() => {}}
        {...props}
      />
      <output>{value}</output>
    </>
  );
}

const box = () => screen.getByRole('combobox', { name: 'Form' });
const type = (text: string) => fireEvent.change(box(), { target: { value: text } });
const key = (name: string) => fireEvent.keyDown(box(), { key: name });
const options = () => screen.queryAllByRole('option').map((option) => option.textContent);

describe('Combobox', () => {
  it('is a combobox named by its label, closed until something is typed', () => {
    render(<Harness suggestions={TWO_BUCKETS} />);

    expect(box()).toHaveAttribute('aria-expanded', 'false');
    expect(box()).toHaveAttribute('aria-autocomplete', 'list');
    expect(screen.queryByRole('option')).not.toBeInTheDocument();
  });

  it('can be named by a label element instead, its list and status by the label text', () => {
    render(
      <>
        <label id="box-label" htmlFor="box">
          Form
        </label>
        <Harness labelId="box-label" suggestions={TWO_BUCKETS} />
      </>,
    );

    expect(box()).not.toHaveAttribute('aria-label');
    expect(box()).toHaveAttribute('aria-labelledby', 'box-label');
    expect(screen.getByRole('listbox', { name: 'Form suggestions' })).toBeInTheDocument();
    expect(screen.getByRole('status', { name: 'Form suggestions' })).toBeInTheDocument();
  });

  it('opens from its chevron, which only a source gives it', () => {
    const { rerender } = render(<Harness suggestions={TWO_BUCKETS} />);

    fireEvent.click(screen.getByRole('button', { name: 'Show Form suggestions' }));
    expect(box()).toHaveAttribute('aria-expanded', 'true');
    expect(options()).toHaveLength(3);

    rerender(<Harness />);
    expect(screen.queryByRole('button', { name: /Show/ })).not.toBeInTheDocument();
  });

  it('draws the entries it is given inside the control, with a clear control while there are any', () => {
    const onClear = vi.fn();
    render(
      <Harness
        entries={<span>Hedge Fixture</span>}
        clear={{ label: 'Clear Folk Names', onClear }}
      />,
    );

    const control = box().closest('.combobox__control');
    expect(control).toContainElement(screen.getByText('Hedge Fixture'));
    fireEvent.click(screen.getByRole('button', { name: 'Clear Folk Names' }));
    expect(onClear).toHaveBeenCalledTimes(1);
  });

  it('puts the caret in the text when the control itself is pressed', () => {
    render(<Harness entries={<span>Hedge Fixture</span>} />);

    const control = box().closest('.combobox__control') as HTMLElement;
    fireEvent.mouseDown(control);

    expect(box()).toHaveFocus();
  });

  it('opens as text is typed, what was typed first and then each suggestion', () => {
    render(<Harness suggestions={TWO_BUCKETS} />);

    type('wax');

    expect(box()).toHaveAttribute('aria-expanded', 'true');
    expect(options()).toEqual([
      'Use what you typed: wax',
      'Wax (Animal)Used by Testwort (Fixtura testalis)',
      'Wax (Substance)',
      'RhizomesUsed by Mockleaf',
    ]);
  });

  it('tells curated suggestions from ones in use by their group, not their colour', () => {
    render(<Harness suggestions={TWO_BUCKETS} />);

    type('wax');

    const curated = screen.getByRole('group', { name: 'Curated' });
    const inUse = screen.getByRole('group', { name: 'In use' });
    expect(within(curated).getAllByRole('option')).toHaveLength(2);
    expect(within(inUse).getAllByRole('option')).toHaveLength(1);
    expect(within(inUse).getByRole('option', { name: /Rhizomes/ })).toBeInTheDocument();
    // What was typed is neither curated nor in use.
    expect(screen.getByRole('option', { name: 'Use what you typed: wax' })).not.toBe(
      within(curated).queryByRole('option', { name: /typed/ }),
    );
    expect(within(inUse).queryByRole('option', { name: /typed/ })).not.toBeInTheDocument();
  });

  it('lists a source with one bucket without groups', () => {
    render(<Harness suggestions={ONE_BUCKET} />);

    type('fix');

    expect(screen.queryByRole('group')).not.toBeInTheDocument();
    expect(options()).toEqual([
      'Use what you typed: fix',
      'Hedge FixtureUsed by Testwort',
      'Fixture Bane',
    ]);
  });

  it("makes a suggestion's label and note part of its name, so same-named ones are told apart", () => {
    render(<Harness suggestions={TWO_BUCKETS} />);

    type('wax');

    expect(screen.getByRole('option', { name: /^Wax \(Animal\)/ })).toHaveAccessibleName(
      'Wax (Animal) Used by Testwort (Fixtura testalis)',
    );
    expect(screen.getByRole('option', { name: 'Wax (Substance)' })).toBeInTheDocument();
  });

  it('picks a suggestion with the arrow keys and Enter, writing nothing itself', () => {
    const onPick = vi.fn();
    render(<Harness suggestions={TWO_BUCKETS} onPick={onPick} />);

    type('wax');
    key('ArrowDown');
    key('ArrowDown');
    key('ArrowDown');
    expect(box()).toHaveAttribute(
      'aria-activedescendant',
      screen.getByRole('option', { name: 'Wax (Substance)' }).id,
    );
    expect(screen.getByRole('option', { name: 'Wax (Substance)' })).toHaveAttribute(
      'aria-selected',
      'true',
    );
    key('Enter');

    expect(onPick).toHaveBeenCalledWith('Wax', WAX_SUBSTANCE);
    expect(box()).toHaveAttribute('aria-expanded', 'false');
    // The text is the caller's to set: it still reads what was typed.
    expect(box()).toHaveValue('wax');
  });

  it('picks a suggestion by click', () => {
    const onPick = vi.fn();
    render(<Harness suggestions={TWO_BUCKETS} onPick={onPick} />);

    type('rhi');
    fireEvent.click(screen.getByRole('option', { name: /Rhizomes/ }));

    expect(onPick).toHaveBeenCalledWith('Rhizomes', RHIZOMES);
  });

  it('picks what was typed from its own row, as no suggestion', () => {
    const onPick = vi.fn();
    render(<Harness suggestions={TWO_BUCKETS} onPick={onPick} />);

    type('rhizome');
    fireEvent.click(screen.getByRole('option', { name: 'Use what you typed: rhizome' }));

    expect(onPick).toHaveBeenCalledWith('rhizome', null);
  });

  it('offers the typed row only once something is typed', () => {
    render(<Harness suggestions={TWO_BUCKETS} />);

    key('ArrowDown');

    expect(box()).toHaveAttribute('aria-expanded', 'true');
    expect(options()).toHaveLength(3);
    expect(screen.queryByRole('option', { name: /typed/ })).not.toBeInTheDocument();
  });

  it('hands Enter with nothing highlighted to the caller, closing the list', () => {
    const onCommit = vi.fn();
    const onPick = vi.fn();
    render(<Harness suggestions={TWO_BUCKETS} onCommit={onCommit} onPick={onPick} />);

    type('rhizome');
    const enter = fireEvent.keyDown(box(), { key: 'Enter' });

    expect(onCommit).toHaveBeenCalledWith('rhizome');
    expect(onPick).not.toHaveBeenCalled();
    // Swallowed: Enter in a text box would otherwise submit the form.
    expect(enter).toBe(false);
    expect(box()).toHaveAttribute('aria-expanded', 'false');
  });

  it('hands Enter to the caller with the list closed too', () => {
    const onCommit = vi.fn();
    render(<Harness onCommit={onCommit} initial="Hedge Fixture" />);

    const enter = fireEvent.keyDown(box(), { key: 'Enter' });

    expect(onCommit).toHaveBeenCalledWith('Hedge Fixture');
    expect(enter).toBe(false);
  });

  it('lets Enter through to the form when it has no caller for it and the list is closed', () => {
    render(<Harness suggestions={TWO_BUCKETS} initial="dried leaf" />);

    expect(fireEvent.keyDown(box(), { key: 'Enter' })).toBe(true);
  });

  it('closes an open list on Enter when it has no caller for it, keeping the text', () => {
    render(<Harness suggestions={TWO_BUCKETS} />);

    type('wax');
    const enter = fireEvent.keyDown(box(), { key: 'Enter' });

    expect(enter).toBe(false);
    expect(box()).toHaveAttribute('aria-expanded', 'false');
    expect(box()).toHaveValue('wax');
  });

  it('closes on Escape and keeps the text, opening again on ArrowDown', () => {
    render(<Harness suggestions={TWO_BUCKETS} />);

    type('wax');
    key('Escape');
    expect(box()).toHaveAttribute('aria-expanded', 'false');
    expect(box()).toHaveValue('wax');

    // Escape on a closed box, which Downshift would otherwise empty.
    key('Escape');
    expect(box()).toHaveValue('wax');

    key('ArrowDown');
    expect(box()).toHaveAttribute('aria-expanded', 'true');
  });

  it('closes on blur without picking the highlighted suggestion', () => {
    const onPick = vi.fn();
    render(<Harness suggestions={TWO_BUCKETS} onPick={onPick} />);

    type('wax');
    key('ArrowDown');
    // The focus moving to something else: Downshift would otherwise read a
    // blur with no `relatedTarget` as a tab away and already not select.
    fireEvent.blur(box(), { relatedTarget: document.body });

    expect(onPick).not.toHaveBeenCalled();
    expect(box()).toHaveAttribute('aria-expanded', 'false');
    expect(box()).toHaveValue('wax');
  });

  it('never opens without a source, and still hands Enter to the caller', () => {
    const onCommit = vi.fn();
    render(<Harness onCommit={onCommit} />);

    type('Hedge Fixture');
    key('ArrowDown');
    expect(box()).toHaveAttribute('aria-expanded', 'false');
    expect(screen.queryByRole('option')).not.toBeInTheDocument();
    expect(screen.queryByRole('status', { name: 'Form suggestions' })).not.toBeInTheDocument();

    key('Enter');
    expect(onCommit).toHaveBeenCalledWith('Hedge Fixture');
  });

  it('opens once suggestions arrive for what was typed', () => {
    const { rerender } = render(<Harness suggestions={{ options: [], pending: true }} />);

    type('wax');
    expect(screen.getByRole('status', { name: 'Form suggestions' })).toHaveTextContent(
      'Looking for suggestions',
    );
    // The typed row alone is a list.
    expect(options()).toEqual(['Use what you typed: wax']);

    rerender(<Harness suggestions={TWO_BUCKETS} />);

    expect(options()).toHaveLength(4);
  });

  it('hands Backspace or Delete in an empty box to the caller, and not with text in it', () => {
    const onRemoveLast = vi.fn();
    render(<Harness onRemoveLast={onRemoveLast} initial="wa" />);

    key('Backspace');
    key('Delete');
    expect(onRemoveLast).not.toHaveBeenCalled();

    type('');
    key('Backspace');
    key('Delete');
    expect(onRemoveLast).toHaveBeenCalledTimes(2);
  });

  it('announces how many suggestions there are, and when there are none', () => {
    const { rerender } = render(<Harness suggestions={TWO_BUCKETS} />);
    const status = () => screen.getByRole('status', { name: 'Form suggestions' });

    expect(status()).toBeEmptyDOMElement();
    type('wax');
    expect(status()).toHaveTextContent('3 suggestions');

    rerender(<Harness suggestions={{ options: [WAX_ANIMAL], pending: false }} />);
    expect(status()).toHaveTextContent('1 suggestion');

    rerender(<Harness suggestions={{ options: [], pending: false }} />);
    expect(status()).toHaveTextContent('No suggestions');

    key('Escape');
    expect(status()).toBeEmptyDOMElement();
  });

  it('carries what the field says about the box', () => {
    render(
      <>
        <Harness suggestions={TWO_BUCKETS} aria-describedby="why" aria-invalid name="form" />
        <p id="why">Press Add to keep it</p>
      </>,
    );

    expect(box()).toBeInvalid();
    expect(box()).toHaveAccessibleDescription('Press Add to keep it');
    expect(box()).toHaveAttribute('name', 'form');
  });

  it('reports its text as it changes, and its focus and blur', () => {
    const onFocus = vi.fn();
    const onBlur = vi.fn();
    render(<Harness suggestions={TWO_BUCKETS} onFocus={onFocus} onBlur={onBlur} />);

    act(() => box().focus());
    type('wa');
    fireEvent.blur(box());

    expect(onFocus).toHaveBeenCalledTimes(1);
    expect(onBlur).toHaveBeenCalledTimes(1);
    expect(screen.getByRole('status', { name: '' })).toHaveTextContent('wa');
  });
  // The entry a list draws inside the control: moved here from IngredientForm
  // (MB.133), whose tests still cover it in the form.
  describe('an entry', () => {
    const LONG = 'Fixturawortiamtestalisfixturawortiamtestalisfixturawortiamtestalisfixturawortiam';
    const tooltip = () => screen.queryByRole('tooltip');
    const entryText = (value: string) =>
      within(screen.getByRole('list')).getByText(value, { ignore: '[role="tooltip"]' });

    function renderEntries(values: string[], onRemove = vi.fn()) {
      render(
        <Harness
          entries={
            <ul className="combobox__entries">
              {values.map((value) => (
                <ComboboxEntry key={value} value={value} onRemove={onRemove} />
              ))}
            </ul>
          }
        />,
      );
      return onRemove;
    }

    // jsdom lays nothing out, so a text is cut off when it is longer than 30
    // characters: wider than the 240px left to it.
    beforeEach(() => {
      vi.spyOn(HTMLElement.prototype, 'scrollWidth', 'get').mockImplementation(function (
        this: HTMLElement,
      ) {
        return (this.textContent ?? '').length * 8;
      });
      vi.spyOn(HTMLElement.prototype, 'clientWidth', 'get').mockReturnValue(240);
    });
    afterEach(() => vi.restoreAllMocks());

    it('has an x named for it, in the tab order, that removes it', () => {
      const onRemove = renderEntries(['Hedge Fixture']);

      const remove = screen.getByRole('button', { name: 'Remove Hedge Fixture' });
      expect(remove).not.toHaveAttribute('tabindex');
      fireEvent.click(remove);

      expect(onRemove).toHaveBeenCalledTimes(1);
    });

    it('shows a cut-off text whole in a tooltip on hover, and while its x has focus', async () => {
      renderEntries([LONG]);

      expect(tooltip()).not.toBeInTheDocument();
      fireEvent.mouseEnter(entryText(LONG));
      expect(tooltip()).toHaveTextContent(LONG);
      fireEvent.mouseLeave(entryText(LONG));
      await waitFor(() => expect(tooltip()).not.toBeInTheDocument());

      act(() => screen.getByRole('button', { name: `Remove ${LONG}` }).focus());
      expect(tooltip()).toHaveTextContent(LONG);
      fireEvent.keyDown(document, { key: 'Escape' });
      expect(tooltip()).not.toBeInTheDocument();
    });

    it('shows no tooltip on a text that fits', () => {
      renderEntries(['Hedge Fixture']);

      fireEvent.mouseEnter(entryText('Hedge Fixture'));
      act(() => screen.getByRole('button', { name: 'Remove Hedge Fixture' }).focus());

      expect(tooltip()).not.toBeInTheDocument();
    });

    it('is marked by the error that names it, which its x reads as its description', () => {
      render(
        <>
          <Harness
            entries={
              <ul className="combobox__entries">
                <ComboboxEntry value="Hedge Fixture" errorId="why" onRemove={() => {}} />
              </ul>
            }
          />
          <p id="why">This folk name is already listed</p>
        </>,
      );

      expect(
        screen.getByRole('button', { name: 'Remove Hedge Fixture' }),
      ).toHaveAccessibleDescription('This folk name is already listed');
      expect(screen.getByRole('listitem')).toHaveClass('is-invalid');
    });
  });
});
