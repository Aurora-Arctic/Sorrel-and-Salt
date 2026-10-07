import { act, fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import { useState } from 'react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import Combobox, {
  ComboboxEntry,
  ComboboxMultiSelect,
  ComboboxSelect,
  ComboboxSortableEntries,
} from '@/components/Combobox';
import type {
  ComboboxOption,
  ComboboxSortableEntry,
  Suggestions,
} from '@/components/Combobox/types';
import {
  dragByPointer,
  layOutChips,
  moveByKeyboard,
  press,
  wrapChips,
} from '../../support/sortable';
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

    const curated = screen.getByRole('group', { name: 'From Compendium' });
    const inUse = screen.getByRole('group', { name: 'From Coven' });
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

  // Two ingredients can share a label, a formal name and a tier (MB.131).
  it('tells apart rows that read alike by their own keys', () => {
    const errors = vi.spyOn(console, 'error').mockImplementation(() => {});
    const onPick = vi.fn();
    const first: ComboboxOption = { value: 'Mockwort', note: 'This coven’s entry', key: 'one' };
    const second: ComboboxOption = { ...first, key: 'two' };
    render(<Harness suggestions={{ options: [first, second], pending: false }} onPick={onPick} />);

    type('mock');
    key('ArrowDown');
    key('ArrowDown');
    key('ArrowDown');
    key('Enter');

    expect(onPick).toHaveBeenCalledWith('Mockwort', second);
    // React's warning for two rows under one key.
    expect(errors.mock.calls.flat().join(' ')).not.toContain('same key');
    errors.mockRestore();
  });

  it('picks a suggestion by click', () => {
    const onPick = vi.fn();
    render(<Harness suggestions={TWO_BUCKETS} onPick={onPick} />);

    type('rhi');
    fireEvent.click(screen.getByRole('option', { name: /Rhizomes/ }));

    expect(onPick).toHaveBeenCalledWith('Rhizomes', RHIZOMES);
  });

  // Regression (MB.154): Downshift remembered the first pick, and the second
  // read as the held-null `selectedItem` changing, writing '' into the box.
  it('keeps the text through a second pick, as through the first', () => {
    const onPick = vi.fn();
    render(<Harness suggestions={TWO_BUCKETS} onPick={onPick} />);

    type('rhi');
    fireEvent.click(screen.getByRole('option', { name: /Rhizomes/ }));
    key('ArrowDown');
    fireEvent.click(screen.getByRole('option', { name: /Rhizomes/ }));

    expect(onPick).toHaveBeenCalledTimes(2);
    expect(box()).toHaveValue('rhi');
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

  describe('a create row', () => {
    const create = (onCreate = vi.fn()) => ({ label: 'Add a reference', onCreate });

    it('is the first row in place of the typed one, there with a blank box too', () => {
      render(<Harness suggestions={ONE_BUCKET} create={create()} />);

      key('ArrowDown');
      expect(options()).toEqual([
        'Add a reference',
        'Hedge FixtureUsed by Testwort',
        'Fixture Bane',
      ]);

      type('fix');
      expect(options()[0]).toBe('Add a reference');
      expect(screen.queryByRole('option', { name: /Use what you typed/ })).not.toBeInTheDocument();
    });

    it('opens on ArrowDown with no suggestions at all, the row being one', () => {
      render(<Harness suggestions={{ options: [], pending: false }} create={create()} />);

      key('ArrowDown');

      expect(box()).toHaveAttribute('aria-expanded', 'true');
      expect(options()).toEqual(['Add a reference']);
    });

    it('calls its own callback when picked, by click or by keyboard, and never onPick', () => {
      const onCreate = vi.fn();
      const onPick = vi.fn();
      render(<Harness suggestions={ONE_BUCKET} create={create(onCreate)} onPick={onPick} />);

      type('fix');
      fireEvent.click(screen.getByRole('option', { name: 'Add a reference' }));
      // The click closed the list; ArrowDown opens it on its first row.
      key('ArrowDown');
      expect(box()).toHaveAttribute(
        'aria-activedescendant',
        screen.getByRole('option', { name: 'Add a reference' }).id,
      );
      key('Enter');

      expect(onCreate).toHaveBeenCalledTimes(2);
      expect(onPick).not.toHaveBeenCalled();
      // The text is the caller's: picking the row leaves it as typed.
      expect(box()).toHaveValue('fix');
    });
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

  // MB.169: what a pick leaves out of the text, a picked form's group, muted
  // inside the control before the indicators, its detail in a tooltip.
  describe('a qualifier', () => {
    const DETAIL = 'Candle and poppet wax.';
    const tooltip = () => screen.queryByRole('tooltip');
    const qualifier = () =>
      within(screen.getByRole('presentation')).getByText('(Substance)', {
        ignore: '[role="tooltip"]',
      });

    it('is drawn inside the control and read as the box’s description, after the field’s own', () => {
      render(
        <>
          <Harness
            initial="Wax"
            suggestions={TWO_BUCKETS}
            qualifier={{ text: 'Substance', detail: DETAIL }}
            aria-describedby="why"
          />
          <p id="why">How it comes</p>
        </>,
      );

      expect(qualifier()).toBeInTheDocument();
      expect(box()).toHaveAccessibleDescription(`How it comes (Substance) ${DETAIL}`);
    });

    it('shows its detail in a tooltip on hover and while the box has focus, closing on Escape', async () => {
      const onFocus = vi.fn();
      render(
        <Harness
          initial="Wax"
          suggestions={TWO_BUCKETS}
          qualifier={{ text: 'Substance', detail: DETAIL }}
          onFocus={onFocus}
        />,
      );

      expect(tooltip()).not.toBeInTheDocument();
      fireEvent.mouseEnter(qualifier());
      expect(tooltip()).toHaveTextContent(DETAIL);
      fireEvent.mouseLeave(qualifier());
      await waitFor(() => expect(tooltip()).not.toBeInTheDocument());

      act(() => box().focus());
      expect(tooltip()).toHaveTextContent(DETAIL);
      expect(onFocus).toHaveBeenCalledTimes(1);
      fireEvent.keyDown(document, { key: 'Escape' });
      expect(tooltip()).not.toBeInTheDocument();
      expect(box()).toHaveFocus();

      act(() => box().blur());
      act(() => box().focus());
      expect(tooltip()).toHaveTextContent(DETAIL);
      act(() => box().blur());
      expect(tooltip()).not.toBeInTheDocument();
    });

    it('opens no tooltip without a detail, and is still the box’s description', () => {
      render(<Harness initial="Wax" suggestions={TWO_BUCKETS} qualifier={{ text: 'Substance' }} />);

      fireEvent.mouseEnter(qualifier());
      act(() => box().focus());

      expect(tooltip()).not.toBeInTheDocument();
      expect(box()).toHaveAccessibleDescription('(Substance)');
    });

    it('follows the text, in brackets, before the clear and the chevron', () => {
      render(
        <Harness
          initial="Wax"
          suggestions={TWO_BUCKETS}
          qualifier={{ text: 'Substance' }}
          clear={{ label: 'Clear Form', onClear: () => {} }}
        />,
      );

      const clear = screen.getByRole('button', { name: 'Clear Form' });
      expect(
        box().compareDocumentPosition(qualifier()) & Node.DOCUMENT_POSITION_FOLLOWING,
      ).toBeTruthy();
      expect(
        qualifier().compareDocumentPosition(clear) & Node.DOCUMENT_POSITION_FOLLOWING,
      ).toBeTruthy();
    });

    it('puts the caret in the text when pressed, reading as part of it', () => {
      render(<Harness initial="Wax" suggestions={TWO_BUCKETS} qualifier={{ text: 'Substance' }} />);

      fireEvent.mouseDown(qualifier());

      expect(box()).toHaveFocus();
    });

    it('is not drawn, nor read, without one', () => {
      render(<Harness initial="Wax" suggestions={TWO_BUCKETS} />);

      expect(box()).not.toHaveAccessibleDescription();
    });
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

    // MB.164: what a chip leaves out, such as a linked substitute's form and
    // tier. The test above is the precondition: the same text, with no
    // detail, opens nothing.
    describe('with a detail', () => {
      const DETAIL = 'Dried leaf · Compendium entry';

      function renderDetailed(errorId?: string) {
        render(
          <>
            <Harness
              entries={
                <ul className="combobox__entries">
                  <ComboboxEntry
                    value="Hedge Fixture"
                    detail={DETAIL}
                    errorId={errorId}
                    onRemove={() => {}}
                  />
                </ul>
              }
            />
            <p id="why">This substitute is already listed</p>
          </>,
        );
      }

      it('shows its text and its detail in a tooltip, though the text fits', async () => {
        renderDetailed();

        fireEvent.mouseEnter(entryText('Hedge Fixture'));
        expect(tooltip()).toHaveTextContent('Hedge Fixture');
        expect(tooltip()).toHaveTextContent(DETAIL);
        fireEvent.mouseLeave(entryText('Hedge Fixture'));
        await waitFor(() => expect(tooltip()).not.toBeInTheDocument());

        act(() => screen.getByRole('button', { name: 'Remove Hedge Fixture' }).focus());
        expect(tooltip()).toHaveTextContent(DETAIL);
        fireEvent.keyDown(document, { key: 'Escape' });
        expect(tooltip()).not.toBeInTheDocument();
      });

      it('is its x’s description, after the error that names it', () => {
        renderDetailed('why');

        expect(
          screen.getByRole('button', { name: 'Remove Hedge Fixture' }),
        ).toHaveAccessibleDescription(`This substitute is already listed ${DETAIL}`);
      });

      it('is its x’s whole description while no error names it', () => {
        renderDetailed();

        expect(
          screen.getByRole('button', { name: 'Remove Hedge Fixture' }),
        ).toHaveAccessibleDescription(DETAIL);
      });
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

    it('has no handle to move it by', () => {
      renderEntries(['Hedge Fixture', 'Fixture Bane']);

      // The precondition: the chips are drawn, each with its x.
      expect(screen.getByRole('button', { name: 'Remove Fixture Bane' })).toBeInTheDocument();
      expect(screen.queryByRole('button', { name: /^Move / })).not.toBeInTheDocument();
    });
  });

  // MB.170: a list whose order means something, its chips moved by a handle
  // each, on dnd-kit's sortable preset, by keyboard or by pointer.
  describe('sortable entries', () => {
    const INSTRUCTIONS =
      'Press Space or Enter to pick it up, the arrow keys to move it, and Space or Enter to put it down, or Escape to cancel.';
    const handle = (value: string) => screen.getByRole('button', { name: `Move ${value}` });
    /** Everything the page's status regions say: dnd-kit's own is one. */
    const announced = () =>
      screen
        .getAllByRole('status')
        .map((region) => region.textContent)
        .join(' | ');

    function renderSortable(entries: ComboboxSortableEntry[], onMove = vi.fn()) {
      render(<Harness entries={<ComboboxSortableEntries entries={entries} onMove={onMove} />} />);
      return onMove;
    }
    const planets = (onRemove = vi.fn()) =>
      ['Mars', 'Venus', 'Saturn'].map((value) => ({ id: value, value, onRemove }));

    beforeEach(layOutChips);
    afterEach(() => vi.restoreAllMocks());

    it('gives each entry a handle named for it, ahead of its x, that says how it moves', () => {
      renderSortable(planets());

      const move = handle('Venus');
      expect(move).toHaveAttribute('aria-roledescription', 'sortable');
      expect(move).toHaveAccessibleDescription(INSTRUCTIONS);
      expect(move).toHaveTextContent('Venus');
      // In the tab order, before the x beside it.
      expect(move).not.toHaveAttribute('tabindex', '-1');
      expect(
        move.compareDocumentPosition(screen.getByRole('button', { name: 'Remove Venus' })) &
          Node.DOCUMENT_POSITION_FOLLOWING,
      ).toBeTruthy();
    });

    it('moves an entry by keyboard, saying each step, the focus kept on the moved entry', async () => {
      const onMove = renderSortable(planets());
      const mars = handle('Mars');

      act(() => mars.focus());
      await press(mars, ' ');
      expect(announced()).toContain('Picked up Mars, at position 1 of 3.');
      // Held: pressed, and the chip drawn as picked up.
      expect(mars).toHaveAttribute('aria-pressed', 'true');
      expect(mars.closest('li')).toHaveClass('is-dragging');
      await press(mars, 'ArrowRight');
      expect(announced()).toContain('Mars moved to position 2 of 3.');
      await press(mars, ' ');

      expect(announced()).toContain('Mars put down at position 2 of 3.');
      expect(onMove).toHaveBeenCalledExactlyOnceWith(0, 1);
      expect(handle('Mars')).toHaveFocus();
      expect(handle('Mars').closest('li')).not.toHaveClass('is-dragging');
    });

    // The owner's reports: on wrapped rows the arrows moved a chip by where
    // the chips sit, so Left from the second chip on row 2 went to a chip on
    // row 1 whose corners were nearer; and the chips making way overlapped or
    // left gaps. Left and Right step through the list, Up and Down jump a
    // row, and the chips making way sit as the row would lay them out.
    describe('on wrapped rows', () => {
      const SEVEN = ['Sun', 'Moon', 'Mercury', 'Venus', 'Mars', 'Jupiter', 'Saturn'].map(
        (value) => ({ id: value, value, onRemove: () => {} }),
      );

      // Sun, Moon and Mercury on row 1; Venus, Mars and Jupiter on row 2;
      // Saturn alone on row 3.
      beforeEach(() => {
        vi.restoreAllMocks();
        wrapChips(300);
      });

      it.each([
        ['Left', 'ArrowLeft', 3],
        ['Right', 'ArrowRight', 5],
      ])('steps one place along the list on %s, whichever row that is on', async (_, key, to) => {
        const onMove = renderSortable(SEVEN);
        const mars = handle('Mars');

        act(() => mars.focus());
        await press(mars, ' ');
        await press(mars, key);
        expect(announced()).toContain(`Mars moved to position ${to + 1} of 7.`);
        await press(mars, ' ');

        expect(onMove).toHaveBeenCalledExactlyOnceWith(4, to);
      });

      // Mars, centred at 120px, is beneath Moon on row 1 (centred at 104px)
      // and above Saturn, alone on row 3.
      it.each([
        ['Up', 'ArrowUp', 1],
        ['Down', 'ArrowDown', 6],
      ])('jumps a row on %s, to the place nearest above or below it', async (_, key, to) => {
        const onMove = renderSortable(SEVEN);
        const mars = handle('Mars');

        act(() => mars.focus());
        await press(mars, ' ');
        await press(mars, key);
        expect(announced()).toContain(`Mars moved to position ${to + 1} of 7.`);
        await press(mars, ' ');

        expect(onMove).toHaveBeenCalledExactlyOnceWith(4, to);
      });

      it('stays put on Up from the first row, and on Down from the last', async () => {
        const onMove = renderSortable(SEVEN);

        await moveByKeyboard(handle('Moon'), 'ArrowUp');
        await moveByKeyboard(handle('Saturn'), 'ArrowDown');

        expect(onMove).not.toHaveBeenCalled();
      });

      it('lays the chips out as the row would while one is moved, with no overlap or gap', async () => {
        renderSortable(SEVEN);
        const saturn = handle('Saturn');
        /** Where a chip is drawn: its box, moved by its transform. */
        const drawnAt = (value: string) => {
          const chip = handle(value).closest('li') as HTMLElement;
          const { left, top } = chip.getBoundingClientRect();
          const [, x = '0', y = '0'] =
            /translate3d\((-?[\d.]+)px, (-?[\d.]+)px/.exec(chip.style.transform) ?? [];
          return [left + Number(x), top + Number(y)];
        };

        // Saturn, from row 3, to second place: the screenshot's move.
        act(() => saturn.focus());
        await press(saturn, ' ');
        await press(saturn, 'Home');
        await press(saturn, 'ArrowRight');

        // Sun 64px wide, Saturn 88, Moon 72, then Mercury, 96, wraps.
        expect(
          ['Sun', 'Saturn', 'Moon', 'Mercury', 'Venus', 'Mars', 'Jupiter'].map(drawnAt),
        ).toEqual([
          [0, 0],
          [68, 0],
          [160, 0],
          [0, 32],
          [100, 32],
          [184, 32],
          [0, 64],
        ]);
      });

      it('steps onto the row above from the start of a row, and back', async () => {
        const onMove = renderSortable(SEVEN);
        const venus = handle('Venus');

        await moveByKeyboard(venus, 'ArrowLeft', 'ArrowLeft', 'ArrowRight');

        expect(onMove).toHaveBeenCalledExactlyOnceWith(3, 2);
      });

      it('goes to the first place on Home and the last on End', async () => {
        const onMove = renderSortable(SEVEN);

        await moveByKeyboard(handle('Mars'), 'Home');
        expect(onMove).toHaveBeenLastCalledWith(4, 0);
        await moveByKeyboard(handle('Moon'), 'End');
        expect(onMove).toHaveBeenLastCalledWith(1, 6);
      });

      it('stays put at either end', async () => {
        const onMove = renderSortable(SEVEN);

        await moveByKeyboard(handle('Sun'), 'ArrowLeft');
        await moveByKeyboard(handle('Saturn'), 'ArrowRight');

        expect(onMove).not.toHaveBeenCalled();
      });
    });

    it('moves an entry by Enter as well as Space', async () => {
      const onMove = renderSortable(planets());
      const venus = handle('Venus');

      act(() => venus.focus());
      await press(venus, 'Enter');
      await press(venus, 'ArrowLeft');
      await press(venus, 'Enter');

      expect(onMove).toHaveBeenCalledExactlyOnceWith(1, 0);
    });

    it('puts an entry back where it was on Escape, moving nothing', async () => {
      const onMove = renderSortable(planets());
      const mars = handle('Mars');

      act(() => mars.focus());
      await press(mars, ' ');
      await press(mars, 'ArrowRight');
      await press(mars, 'Escape');

      expect(announced()).toContain('Move cancelled. Mars is back at position 1 of 3.');
      expect(onMove).not.toHaveBeenCalled();
      expect(handle('Mars')).toHaveFocus();
    });

    it('moves an entry by pointer, dragged onto another’s place', async () => {
      const onMove = renderSortable(planets());

      // Mars from the first chip onto the third, Saturn, at 200–280px.
      await dragByPointer(handle('Mars'), 245);

      expect(onMove).toHaveBeenCalledExactlyOnceWith(0, 2);
    });

    it('moves nothing on a press that does not drag, or a lift put straight back down', async () => {
      const onMove = renderSortable(planets());
      const mars = handle('Mars');

      fireEvent.pointerDown(mars, { clientX: 40, clientY: 12, isPrimary: true, button: 0 });
      fireEvent.pointerUp(document, { clientX: 41, clientY: 12, isPrimary: true });
      await moveByKeyboard(mars);

      expect(onMove).not.toHaveBeenCalled();
    });

    it('still removes an entry by its x', () => {
      const onRemove = vi.fn();
      renderSortable(planets(onRemove));

      fireEvent.click(screen.getByRole('button', { name: 'Remove Saturn' }));

      expect(onRemove).toHaveBeenCalledTimes(1);
    });

    it('shows an entry’s detail while its handle has focus, and reads it and its error first', () => {
      render(
        <>
          <Harness
            entries={
              <ComboboxSortableEntries
                entries={[
                  {
                    id: 'hecate',
                    value: 'Hecate (Greek)',
                    detail: 'Of crossroads and the moon.',
                    errorId: 'why',
                    onRemove: () => {},
                  },
                ]}
                onMove={() => {}}
              />
            }
          />
          <p id="why">This deity is already listed</p>
        </>,
      );

      const move = handle('Hecate (Greek)');
      expect(move).toHaveAccessibleDescription(
        `This deity is already listed Of crossroads and the moon. ${INSTRUCTIONS}`,
      );
      act(() => move.focus());
      expect(screen.getByRole('tooltip')).toHaveTextContent('Of crossroads and the moon.');
      act(() => move.blur());
      expect(screen.queryByRole('tooltip')).not.toBeInTheDocument();
    });
  });

  // The closed-set sibling (MB.131): the same control and list, nothing typed.
  describe('the select-only box', () => {
    const ELEMENTS = [
      { value: '', label: 'None' },
      { value: 'earth', label: 'Earth' },
      { value: 'air', label: 'Air' },
    ];

    function SelectHarness({ placeholder }: { placeholder?: string }) {
      const [value, setValue] = useState('unset');
      return (
        <ComboboxSelect
          id="element"
          label="Element"
          value={value}
          onChange={setValue}
          choices={ELEMENTS}
          placeholder={placeholder}
          required
          aria-describedby="element-hint"
        />
      );
    }
    const element = () => screen.getByRole('combobox', { name: 'Element' });

    it('is a select-only combobox named by its label, showing the placeholder until a choice', () => {
      render(<SelectHarness placeholder="Choose an element" />);

      expect(element()).toHaveAttribute('aria-label', 'Element');
      expect(element()).not.toHaveAttribute('aria-autocomplete');
      expect(element()).toBeRequired();
      expect(element()).toHaveAttribute('aria-describedby', 'element-hint');
      expect(element()).toHaveTextContent('Choose an element');

      fireEvent.click(element());
      const list = screen.getByRole('listbox', { name: 'Element choices' });
      expect(
        within(list)
          .getAllByRole('option')
          .map((option) => option.textContent),
      ).toEqual(['None', 'Earth', 'Air']);
      fireEvent.click(within(list).getByRole('option', { name: 'Air' }));

      expect(element()).toHaveTextContent('Air');
      expect(element()).toHaveAttribute('aria-expanded', 'false');
    });

    it('chooses None, the choice whose value is blank, like any other', () => {
      render(<SelectHarness placeholder="Choose an element" />);

      fireEvent.click(element());
      fireEvent.click(screen.getByRole('option', { name: 'None' }));

      expect(element()).toHaveTextContent('None');
      expect(element()).not.toHaveTextContent('Choose an element');
    });
  });

  // A closed set holding several values (MB.159): the select-only box, its
  // choices drawn as chips inside the control, as a list's entries are.
  describe('the multi-select box', () => {
    const FIVE = [
      { value: 'earth', label: 'Earth' },
      { value: 'air', label: 'Air' },
      { value: 'fire', label: 'Fire' },
      { value: 'water', label: 'Water' },
      { value: 'spirit', label: 'Spirit' },
    ];

    function MultiHarness({ initial = [] }: { initial?: string[] }) {
      const [values, setValues] = useState(initial);
      return (
        <>
          <ComboboxMultiSelect
            id="elements"
            label="Element"
            values={values}
            onChange={setValues}
            choices={FIVE}
            placeholder="Choose elements"
            required
            aria-describedby="elements-hint"
          />
          <output aria-label="Chosen">{values.join(',')}</output>
        </>
      );
    }
    const elements = () => screen.getByRole('combobox', { name: 'Element' });
    const chosen = () => screen.getByRole('status', { name: 'Chosen' }).textContent;
    const offered = () =>
      within(screen.getByRole('listbox', { name: 'Element choices' }))
        .queryAllByRole('option')
        .map((option) => option.textContent);
    const pick = (label: string) => fireEvent.click(screen.getByRole('option', { name: label }));
    const press = (name: string) => fireEvent.keyDown(elements(), { key: name });

    it('is a select-only combobox named by its label, showing the placeholder until a choice', () => {
      render(<MultiHarness />);

      expect(elements()).toHaveAttribute('aria-label', 'Element');
      expect(elements()).not.toHaveAttribute('aria-autocomplete');
      expect(elements()).toBeRequired();
      expect(elements()).toHaveAttribute('aria-describedby', 'elements-hint');
      expect(elements()).toHaveTextContent('Choose elements');
      // Nothing to type, and no Add: the list is the only way in.
      expect(screen.queryByRole('textbox')).not.toBeInTheDocument();
      expect(screen.queryByRole('button', { name: /^Add/ })).not.toBeInTheDocument();

      fireEvent.click(elements());
      expect(offered()).toEqual(['Earth', 'Air', 'Fire', 'Water', 'Spirit']);
    });

    it('adds a choice as a chip inside the control, in the order chosen, offering only what is left', () => {
      render(<MultiHarness />);

      fireEvent.click(elements());
      pick('Fire');
      // Still open, for the next choice, without the one just made.
      expect(elements()).toHaveAttribute('aria-expanded', 'true');
      expect(offered()).toEqual(['Earth', 'Air', 'Water', 'Spirit']);
      pick('Earth');

      expect(chosen()).toBe('fire,earth');
      expect(offered()).toEqual(['Air', 'Water', 'Spirit']);
      const control = elements().closest('.combobox__control') as HTMLElement;
      expect(control).toContainElement(screen.getByRole('button', { name: 'Remove Fire' }));
      expect(control).toContainElement(screen.getByRole('button', { name: 'Remove Earth' }));
      expect(
        within(control)
          .getAllByRole('listitem')
          .map((chip) => chip.textContent),
      ).toEqual([expect.stringContaining('Fire'), expect.stringContaining('Earth')]);
      // The box reads what it holds, as a select reads its choice.
      expect(elements()).toHaveTextContent('Fire, Earth');
      expect(elements()).not.toHaveTextContent('Choose elements');
    });

    it('chooses by the keyboard: the arrows open and move, Enter or Space chooses, Escape closes', () => {
      render(<MultiHarness />);
      act(() => elements().focus());
      const active = (label: string) =>
        expect(elements()).toHaveAttribute(
          'aria-activedescendant',
          screen.getByRole('option', { name: label }).id,
        );

      press('ArrowDown');
      expect(elements()).toHaveAttribute('aria-expanded', 'true');
      active('Earth');
      press('ArrowDown');
      active('Air');
      press('ArrowDown');
      active('Fire');
      press('ArrowUp');
      active('Air');

      press('Enter');
      expect(chosen()).toBe('air');
      // The row below takes the chosen one's place under the highlight.
      active('Fire');
      press(' ');
      expect(chosen()).toBe('air,fire');
      expect(elements()).toHaveAttribute('aria-expanded', 'true');

      press('Escape');
      expect(elements()).toHaveAttribute('aria-expanded', 'false');
      expect(chosen()).toBe('air,fire');
    });

    it('opens from a press on the control around the box, as from the box itself', () => {
      render(<MultiHarness initial={['earth']} />);
      const control = elements().closest('.combobox__control') as HTMLElement;

      fireEvent.mouseDown(control);
      expect(elements()).toHaveFocus();
      expect(elements()).toHaveAttribute('aria-expanded', 'true');
      // An x is its own: pressing it opens nothing.
      fireEvent.keyDown(elements(), { key: 'Escape' });
      fireEvent.mouseDown(screen.getByRole('button', { name: 'Remove Earth' }));
      expect(elements()).toHaveAttribute('aria-expanded', 'false');
    });

    it('takes the last chip on Backspace in the box, and nothing once it is empty', () => {
      render(<MultiHarness initial={['water', 'earth']} />);
      act(() => elements().focus());

      press('Backspace');
      expect(chosen()).toBe('water');
      expect(screen.queryByRole('button', { name: 'Remove Earth' })).not.toBeInTheDocument();
      press('Backspace');
      expect(chosen()).toBe('');
      press('Backspace');
      expect(chosen()).toBe('');
      expect(elements()).toHaveTextContent('Choose elements');
    });

    it('removes one chip by its x, and every chip by the clear, leaving the focus in the box', () => {
      render(<MultiHarness initial={['earth', 'air', 'fire']} />);

      fireEvent.click(screen.getByRole('button', { name: 'Remove Air' }));
      expect(chosen()).toBe('earth,fire');
      expect(elements()).toHaveFocus();
      fireEvent.click(elements());
      expect(offered()).toEqual(['Air', 'Water', 'Spirit']);
      press('Escape');

      fireEvent.click(screen.getByRole('button', { name: 'Clear Element' }));
      expect(chosen()).toBe('');
      expect(elements()).toHaveFocus();
      // Nothing left to clear.
      expect(screen.queryByRole('button', { name: 'Clear Element' })).not.toBeInTheDocument();
    });

    it('says what each change did, for a screen reader', () => {
      render(<MultiHarness initial={['earth']} />);
      const changes = () => screen.getByRole('status', { name: 'Element changes' });

      fireEvent.click(elements());
      pick('Spirit');
      expect(changes()).toHaveTextContent('Added Spirit');
      fireEvent.click(screen.getByRole('button', { name: 'Remove Earth' }));
      expect(changes()).toHaveTextContent('Removed Earth');
      fireEvent.click(screen.getByRole('button', { name: 'Clear Element' }));
      expect(changes()).toHaveTextContent('Cleared Element');
    });

    it('has nothing to offer once every choice is made, and does not open', () => {
      render(<MultiHarness initial={['earth', 'air', 'fire', 'water']} />);

      fireEvent.click(elements());
      expect(offered()).toEqual(['Spirit']);
      pick('Spirit');

      expect(chosen()).toBe('earth,air,fire,water,spirit');
      expect(elements()).toHaveAttribute('aria-expanded', 'false');
      fireEvent.click(elements());
      expect(elements()).toHaveAttribute('aria-expanded', 'false');
      press('ArrowDown');
      expect(elements()).toHaveAttribute('aria-expanded', 'false');
      expect(screen.queryByRole('option')).not.toBeInTheDocument();
    });
  });
});
