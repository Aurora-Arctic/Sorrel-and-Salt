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

  it('opens from its chevron, which only a source gives it', () => {
    const { rerender } = render(<Harness suggestions={TWO_BUCKETS} />);

    fireEvent.click(screen.getByRole('button', { name: 'Show Form suggestions' }));
    expect(box()).toHaveAttribute('aria-expanded', 'true');
    expect(options()).toHaveLength(3);

    rerender(<Harness />);
    expect(screen.queryByRole('button', { name: /Show/ })).not.toBeInTheDocument();
  });

  // Regression, found by MB.221's e2e flow: a box left while its list was
  // empty — a pick-only box's lookup still answering — kept wanting it open,
  // and when the answer came the list opened and took the focus back from
  // whatever box was then in use.
  it('stays shut and unfocused when suggestions arrive after it was left with none', () => {
    const PICK_ONLY = { offerTyped: false };
    const { rerender } = render(
      <>
        <Harness suggestions={{ options: [], pending: true }} {...PICK_ONLY} />
        <input aria-label="Elsewhere" />
      </>,
    );
    act(() => box().focus());
    fireEvent.click(screen.getByRole('button', { name: 'Show Form suggestions' }));
    const elsewhere = screen.getByRole('textbox', { name: 'Elsewhere' });
    act(() => elsewhere.focus());

    rerender(
      <>
        <Harness suggestions={TWO_BUCKETS} {...PICK_ONLY} />
        <input aria-label="Elsewhere" />
      </>,
    );

    expect(box()).toHaveAttribute('aria-expanded', 'false');
    expect(elsewhere).toHaveFocus();
  });

  it('opens as text is typed, what was typed first and then each suggestion', () => {
    render(<Harness suggestions={TWO_BUCKETS} />);

    type('wax');

    expect(box()).toHaveAttribute('aria-expanded', 'true');
    expect(options()).toEqual([
      expect.stringContaining('wax'),
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

  // M12.7: an option's icon is decoration, left out of the name a screen
  // reader gets. Where it sits beside the label is layout, which happy-dom does not draw.
  it('draws an option icon without adding it to the name', () => {
    const suggestions: Suggestions = {
      options: [{ value: 'Wax', icon: <svg /> }, { value: 'Rhizomes' }],
      pending: false,
    };
    render(<Harness suggestions={suggestions} />);
    type('x');

    const withIcon = screen.getByRole('option', { name: 'Wax' });
    const mark = withIcon.querySelector('svg')!;
    expect(mark.closest('[aria-hidden="true"]')).not.toBeNull();
    expect(screen.getByRole('option', { name: 'Rhizomes' }).querySelector('svg')).toBeNull();
  });

  it('lists a source with one bucket without groups', () => {
    render(<Harness suggestions={ONE_BUCKET} />);

    type('fix');

    expect(screen.queryByRole('group')).not.toBeInTheDocument();
    expect(options()).toEqual([
      expect.stringContaining('fix'),
      'Hedge FixtureUsed by Testwort',
      'Fixture Bane',
    ]);
  });

  // MB.126: a source that names its own buckets, a category under its group.
  describe('headed suggestions', () => {
    const HEADED: Suggestions = {
      options: [
        { value: 'Hedge Fixture', heading: 'Mind' },
        { value: 'Fixture Bane', heading: 'Body' },
        { value: 'Mockleaf', heading: 'Mind' },
      ],
      pending: false,
    };

    it('lists them under their headings, in the order the headings first appear', () => {
      render(<Harness suggestions={HEADED} />);

      type('fix');

      const groups = screen.getAllByRole('group');
      expect(groups).toHaveLength(2);
      expect(screen.getByRole('group', { name: 'Mind' })).toBe(groups[0]);
      expect(screen.getByRole('group', { name: 'Body' })).toBe(groups[1]);
      expect(
        within(groups[0]!)
          .getAllByRole('option')
          .map((option) => option.textContent),
      ).toEqual(['Hedge Fixture', 'Mockleaf']);
      expect(options()).toEqual([
        expect.stringContaining('fix'),
        'Hedge Fixture',
        'Mockleaf',
        'Fixture Bane',
      ]);
      expect(screen.queryByRole('group', { name: /From/ })).not.toBeInTheDocument();
    });

    it('tells apart same-named rows under different headings, and announces the count', () => {
      render(
        <Harness
          suggestions={{
            options: [
              { value: 'Fixture Bane', heading: 'Mind' },
              { value: 'Fixture Bane', heading: 'Body' },
            ],
            pending: false,
          }}
        />,
      );

      type('fix');

      expect(screen.getAllByRole('option', { name: 'Fixture Bane' })).toHaveLength(2);
      expect(screen.getByRole('status', { name: 'Form suggestions' })).toHaveTextContent(/\b2\b/);
    });
  });

  it("makes a suggestion's label and note part of its name, so same-named ones are told apart", () => {
    render(<Harness suggestions={TWO_BUCKETS} />);

    type('wax');

    expect(screen.getByRole('option', { name: /^Wax \(Animal\)/ })).toHaveAccessibleName(
      'Wax (Animal) Used by Testwort (Fixtura testalis)',
    );
    expect(screen.getByRole('option', { name: 'Wax (Substance)' })).toBeInTheDocument();
  });

  it('leaves out aria-activedescendant while no option is highlighted', () => {
    render(<Harness suggestions={TWO_BUCKETS} />);
    expect(box()).not.toHaveAttribute('aria-activedescendant');

    type('wax');
    expect(box()).not.toHaveAttribute('aria-activedescendant');
    key('ArrowDown');
    expect(box()).toHaveAttribute('aria-activedescendant');
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

  describe('kept open for the next pick', () => {
    // A box that adds each pick to a list: the list stays open after a pick,
    // with the focus still in the text, and only leaving it closes it.
    it('stays open after a pick by click, with the focus in the text, where a single box closes', () => {
      const onPick = vi.fn();
      const { unmount } = render(<Harness suggestions={TWO_BUCKETS} onPick={onPick} keepOpen />);

      box().focus();
      type('wax');
      fireEvent.click(screen.getByRole('option', { name: 'Wax (Substance)' }));

      expect(onPick).toHaveBeenCalledWith('Wax', WAX_SUBSTANCE);
      expect(box()).toHaveAttribute('aria-expanded', 'true');
      expect(screen.getByRole('option', { name: /Rhizomes/ })).toBeInTheDocument();
      expect(box()).toHaveFocus();
      unmount();

      // Why the list could have closed: the same pick on a single box does.
      render(<Harness suggestions={TWO_BUCKETS} onPick={onPick} />);
      type('wax');
      fireEvent.click(screen.getByRole('option', { name: 'Wax (Substance)' }));
      expect(box()).toHaveAttribute('aria-expanded', 'false');
    });

    it('stays open after a pick by Enter', () => {
      const onPick = vi.fn();
      render(<Harness suggestions={TWO_BUCKETS} onPick={onPick} keepOpen />);

      type('wax');
      key('ArrowDown');
      key('ArrowDown');
      key('Enter');

      expect(onPick).toHaveBeenCalledWith('Wax', WAX_ANIMAL);
      expect(box()).toHaveAttribute('aria-expanded', 'true');
    });

    it('closes on Escape, on Tab away and on a press outside', () => {
      render(
        <>
          <Harness suggestions={TWO_BUCKETS} keepOpen />
          <button type="button">Elsewhere</button>
        </>,
      );
      const pick = () => {
        key('ArrowDown');
        expect(box()).toHaveAttribute('aria-expanded', 'true');
        fireEvent.click(screen.getAllByRole('option')[0] as HTMLElement);
        expect(box()).toHaveAttribute('aria-expanded', 'true');
      };

      pick();
      key('Escape');
      expect(box()).toHaveAttribute('aria-expanded', 'false');

      pick();
      // Tab moves the focus on; Downshift reads the blur.
      fireEvent.blur(box(), { relatedTarget: screen.getByRole('button', { name: 'Elsewhere' }) });
      expect(box()).toHaveAttribute('aria-expanded', 'false');

      // A press on something else: the focus goes to it between the press and the release.
      pick();
      const elsewhere = screen.getByRole('button', { name: 'Elsewhere' });
      fireEvent.mouseDown(elsewhere);
      act(() => elsewhere.focus());
      fireEvent.mouseUp(elsewhere);
      expect(box()).toHaveAttribute('aria-expanded', 'false');
    });
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

  describe('an action row', () => {
    const action = (onSelect = vi.fn()) => ({ label: 'New Reference', onSelect });

    it('is the last row, with no typed one, there with a blank box too', () => {
      render(<Harness suggestions={ONE_BUCKET} action={action()} />);

      key('ArrowDown');
      expect(options()).toEqual(['Hedge FixtureUsed by Testwort', 'Fixture Bane', 'New Reference']);

      type('fix');
      expect(options()[options().length - 1]).toBe('New Reference');
      expect(screen.queryByRole('option', { name: /Use what you typed/ })).not.toBeInTheDocument();
    });

    it('opens on ArrowDown with no suggestions at all, the row being one', () => {
      render(<Harness suggestions={{ options: [], pending: false }} action={action()} />);

      key('ArrowDown');

      expect(box()).toHaveAttribute('aria-expanded', 'true');
      expect(options()).toEqual(['New Reference']);
    });

    it('calls its own callback when picked, by click or by keyboard, and never onPick', () => {
      const onSelect = vi.fn();
      const onPick = vi.fn();
      render(<Harness suggestions={ONE_BUCKET} action={action(onSelect)} onPick={onPick} />);

      type('fix');
      fireEvent.click(screen.getByRole('option', { name: 'New Reference' }));
      // The click closed the list; ArrowUp opens it on its last row.
      key('ArrowUp');
      expect(box()).toHaveAttribute(
        'aria-activedescendant',
        screen.getByRole('option', { name: 'New Reference' }).id,
      );
      key('Enter');

      expect(onSelect).toHaveBeenCalledTimes(2);
      expect(onPick).not.toHaveBeenCalled();
      // The text is the caller's: picking the row leaves it as typed.
      expect(box()).toHaveValue('fix');
    });
  });

  // M10.12: a typed row that only repeats a suggestion is no choice of its own.
  describe('the typed row when a suggestion matches it', () => {
    const BANE: Suggestions = { options: [{ value: 'Fixture Bane' }], pending: false };

    it('is offered for text no suggestion matches', () => {
      render(<Harness suggestions={BANE} />);

      type('fixture ban');

      expect(options()).toEqual(['Use what you typed: fixture ban', 'Fixture Bane']);
    });

    it('is left out when a suggestion matches, spaces and case aside', () => {
      render(<Harness suggestions={BANE} />);

      type('  fixture BANE ');

      expect(options()).toEqual(['Fixture Bane']);
    });

    it('leaves Enter on the first row to pick the matching suggestion', () => {
      const onPick = vi.fn();
      render(<Harness suggestions={BANE} onPick={onPick} />);

      type('fixture bane');
      key('ArrowDown');
      key('Enter');

      expect(onPick).toHaveBeenCalledWith('Fixture Bane', BANE.options[0]);
    });

    it('leaves Enter alone to pick it in a box that highlights its first row', () => {
      const onPick = vi.fn();
      render(<Harness suggestions={BANE} onPick={onPick} highlightFirst />);

      type('Fixture Bane');
      key('Enter');

      expect(onPick).toHaveBeenCalledWith('Fixture Bane', BANE.options[0]);
    });

    it('is offered when only a suggestion’s value matches, its row reading otherwise', () => {
      const labelled: Suggestions = {
        options: [{ value: 'Fixture Bane', label: 'Fixture Bane (Root)' }],
        pending: false,
      };
      render(<Harness suggestions={labelled} />);

      type('fixture bane');

      expect(options()).toEqual(['Use what you typed: fixture bane', 'Fixture Bane (Root)']);
    });
  });

  // MB.174: a list withholds the typed row for text it would refuse.
  describe('the typed row withheld', () => {
    it('offers the suggestions without it', () => {
      render(<Harness suggestions={ONE_BUCKET} offerTyped={false} />);

      type('fix');

      expect(options()).toEqual(['Hedge FixtureUsed by Testwort', 'Fixture Bane']);
      expect(screen.queryByRole('option', { name: /Use what you typed/ })).not.toBeInTheDocument();
    });

    it('still hands Enter with nothing highlighted to the caller', () => {
      const onCommit = vi.fn();
      render(<Harness suggestions={ONE_BUCKET} offerTyped={false} onCommit={onCommit} />);

      type('fix');
      key('Enter');

      expect(onCommit).toHaveBeenCalledWith('fix');
    });

    it('stays closed when it would have been the only row', () => {
      render(<Harness suggestions={{ options: [], pending: false }} offerTyped={false} />);

      type('fix');

      expect(box()).toHaveAttribute('aria-expanded', 'false');
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
    // On the open list the key is the list's, so a modal around it stays.
    expect(key('Escape')).toBe(false);
    expect(box()).toHaveAttribute('aria-expanded', 'false');
    expect(box()).toHaveValue('wax');

    // Escape on a closed box, which Downshift would otherwise empty, and
    // would stop the dialog around it from hearing.
    expect(key('Escape')).toBe(true);
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

  it('marks the box busy while a lookup is pending, and not once it is answered', () => {
    const { rerender } = render(<Harness suggestions={{ options: [], pending: true }} />);
    expect(box()).toHaveAttribute('aria-busy', 'true');

    rerender(<Harness suggestions={{ options: [], pending: false }} />);
    expect(box()).not.toHaveAttribute('aria-busy');
  });

  it('opens once suggestions arrive for what was typed', () => {
    const { rerender } = render(<Harness suggestions={{ options: [], pending: true }} />);

    type('wax');
    expect(screen.getByRole('status', { name: 'Form suggestions' })).toHaveTextContent(/\S/);
    // The typed row alone is a list.
    expect(options()).toEqual([expect.stringContaining('wax')]);

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
    expect(status()).toHaveTextContent(/\b3\b/);

    rerender(<Harness suggestions={{ options: [WAX_ANIMAL], pending: false }} />);
    expect(status()).toHaveTextContent(/\b1\b/);

    rerender(<Harness suggestions={{ options: [], pending: false }} />);
    expect(status()).toHaveTextContent(/\S/);
    expect(status()).not.toHaveTextContent(/\d/);

    key('Escape');
    expect(status()).toBeEmptyDOMElement();
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
      // Read as part of the text, so a press on it puts the caret there.
      fireEvent.mouseDown(qualifier());
      expect(box()).toHaveFocus();
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
      await waitFor(() => expect(tooltip()).toHaveTextContent(DETAIL));
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

    // MB.115: the tip gets out of the way of typing, and comes back on focus
    // or a hover; the detail stays in the box's description throughout.
    it('closes its tooltip at the first printable key and when the list opens', async () => {
      render(
        <Harness
          initial="Wax"
          suggestions={TWO_BUCKETS}
          qualifier={{ text: 'Substance', detail: DETAIL }}
        />,
      );

      act(() => box().focus());
      expect(tooltip()).toBeInTheDocument();
      key('Shift');
      expect(tooltip()).toBeInTheDocument();
      key('x');
      expect(tooltip()).not.toBeInTheDocument();
      expect(box()).toHaveAccessibleDescription(expect.stringContaining(DETAIL));

      fireEvent.mouseEnter(qualifier());
      await waitFor(() => expect(tooltip()).toBeInTheDocument());
      fireEvent.click(screen.getByRole('button', { name: 'Show Form suggestions' }));
      expect(box()).toHaveAttribute('aria-expanded', 'true');
      expect(tooltip()).not.toBeInTheDocument();
    });
  });
  // The entry a list draws inside the control: moved here from IngredientForm
  // (MB.133), whose tests still cover it in the form.
  describe('an entry', () => {
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

    afterEach(() => vi.restoreAllMocks());

    // The owner's call at MB.115's review: the prompt for the next entry
    // stays beside the chips while nothing is typed.
    it('keeps the placeholder of the box beside its entries', () => {
      render(
        <Harness
          placeholder="Add a fixture"
          entries={
            <ul className="combobox__entries">
              <ComboboxEntry value="Hedge Fixture" onRemove={vi.fn()} />
            </ul>
          }
        />,
      );

      expect(screen.getByRole('listitem')).toBeInTheDocument();
      expect(box()).toHaveValue('');
      expect(box()).toHaveAttribute('placeholder', 'Add a fixture');
    });

    it('has an x named for it, in the tab order, that removes it', () => {
      const onRemove = renderEntries(['Hedge Fixture']);

      const remove = screen.getByRole('button', { name: 'Remove Hedge Fixture' });
      expect(remove).not.toHaveAttribute('tabindex');
      fireEvent.click(remove);

      expect(onRemove).toHaveBeenCalledTimes(1);
    });

    // MB.115: a linked entry's text opens a panel beside the chip, which
    // shuts on a second press, on Escape — cancelled, so a modal around the
    // form takes no cancel from it — on a press elsewhere and on the focus
    // leaving it; Escape hands the focus back to the text.
    describe('with a summary', () => {
      const panel = () => screen.queryByRole('dialog', { name: 'About Hedge Fixture' });
      const opener = () => screen.getByRole('button', { name: 'Hedge Fixture' });
      function renderLinked() {
        render(
          <>
            <Harness
              entries={
                <ul className="combobox__entries">
                  <ComboboxEntry
                    value="Hedge Fixture"
                    summary={{
                      label: 'About Hedge Fixture',
                      content: () => <a href="/fixture">Fixture Entry</a>,
                    }}
                    onRemove={vi.fn()}
                  />
                  <ComboboxEntry value="Typed Fixture" onRemove={vi.fn()} />
                </ul>
              }
            />
            <button type="button">Elsewhere</button>
          </>,
        );
      }

      it('opens from its text alone, and shuts on a second press', () => {
        renderLinked();

        expect(opener()).toHaveAttribute('aria-expanded', 'false');
        expect(panel()).not.toBeInTheDocument();
        // The typed entry has its x and nothing else to press.
        expect(screen.queryByRole('button', { name: 'Typed Fixture' })).not.toBeInTheDocument();

        fireEvent.click(opener());
        expect(opener()).toHaveAttribute('aria-expanded', 'true');
        expect(within(panel()!).getByRole('link')).toHaveAttribute('href', '/fixture');

        fireEvent.click(opener());
        expect(panel()).not.toBeInTheDocument();
        expect(opener()).toHaveAttribute('aria-expanded', 'false');
      });

      it('shuts on Escape from inside it, cancelling the key and handing the focus back', () => {
        renderLinked();
        fireEvent.click(opener());
        const link = within(panel()!).getByRole('link');
        act(() => link.focus());

        // fireEvent answers false when a handler cancelled the event.
        expect(fireEvent.keyDown(link, { key: 'Escape' })).toBe(false);
        expect(panel()).not.toBeInTheDocument();
        expect(opener()).toHaveFocus();
        // Shut, an Escape is left alone for whatever holds the form.
        expect(fireEvent.keyDown(opener(), { key: 'Escape' })).toBe(true);
      });

      it('shuts on a press outside it, and when the focus leaves it', () => {
        renderLinked();
        fireEvent.click(opener());
        fireEvent.pointerDown(within(panel()!).getByRole('link'));
        expect(panel()).toBeInTheDocument();
        fireEvent.pointerDown(document.body);
        expect(panel()).not.toBeInTheDocument();

        // Pressed as a browser presses it, the focus on it first.
        act(() => opener().focus());
        fireEvent.click(opener());
        act(() => screen.getByRole('button', { name: 'Elsewhere' }).focus());
        expect(panel()).not.toBeInTheDocument();
      });
    });

    it('opens no tooltip for a text that fits and has no detail', async () => {
      renderEntries(['Hedge Fixture']);

      fireEvent.mouseEnter(entryText('Hedge Fixture'));
      // Past the hover's 300ms rest, when a tooltip would have opened.
      await act(() => new Promise((resolve) => setTimeout(resolve, 350)));
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
        await waitFor(() => expect(tooltip()).toHaveTextContent('Hedge Fixture'));
        expect(tooltip()).toHaveTextContent(DETAIL);
        fireEvent.mouseLeave(entryText('Hedge Fixture'));
        await waitFor(() => expect(tooltip()).not.toBeInTheDocument());

        act(() => screen.getByRole('button', { name: 'Remove Hedge Fixture' }).focus());
        expect(tooltip()).toHaveTextContent(DETAIL);
        fireEvent.keyDown(document, { key: 'Escape' });
        expect(tooltip()).not.toBeInTheDocument();
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
    });
  });

  // MB.170: a list whose order means something, its chips moved by a handle
  // each, on dnd-kit's sortable preset, by keyboard or by pointer.
  describe('sortable entries', () => {
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
    const celestialBodies = (onRemove = vi.fn()) =>
      ['Mars', 'Venus', 'Saturn'].map((value) => ({ id: value, value, onRemove }));

    beforeEach(layOutChips);
    afterEach(() => vi.restoreAllMocks());

    it('gives each entry a handle named for it, ahead of its x, that says how it moves', () => {
      renderSortable(celestialBodies());

      const move = handle('Venus');
      expect(move).toHaveAttribute('aria-roledescription', 'sortable');
      expect(move).toHaveAccessibleDescription(/\S/);
      expect(move).toHaveTextContent('Venus');
      // In the tab order, before the x beside it.
      expect(move).not.toHaveAttribute('tabindex', '-1');
      expect(
        move.compareDocumentPosition(screen.getByRole('button', { name: 'Remove Venus' })) &
          Node.DOCUMENT_POSITION_FOLLOWING,
      ).toBeTruthy();
    });

    it('moves an entry by keyboard, saying each step, the focus kept on the moved entry', async () => {
      const onMove = renderSortable(celestialBodies());
      const mars = handle('Mars');

      act(() => mars.focus());
      await press(mars, ' ');
      expect(announced()).toMatch(/Mars\D+1\D+3/);
      // Held: pressed.
      expect(mars).toHaveAttribute('aria-pressed', 'true');
      await press(mars, 'ArrowRight');
      expect(announced()).toMatch(/Mars\D+2\D+3/);
      await press(mars, ' ');

      expect(onMove).toHaveBeenCalledExactlyOnceWith(0, 1);
      expect(handle('Mars')).toHaveFocus();
      expect(handle('Mars')).not.toHaveAttribute('aria-pressed', 'true');
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

      it('steps one place along the list on Right, whichever row that is on', async () => {
        const onMove = renderSortable(SEVEN);
        const mars = handle('Mars');

        act(() => mars.focus());
        await press(mars, ' ');
        await press(mars, 'ArrowRight');
        expect(announced()).toMatch(/Mars\D+6\D+7/);
        await press(mars, ' ');

        expect(onMove).toHaveBeenCalledExactlyOnceWith(4, 5);
      });

      // Mars, centred at 120px, is beneath Moon on row 1 (centred at 104px)
      // and above Saturn, alone on row 3.
      it('jumps a row on Up, to the place nearest above it', async () => {
        const onMove = renderSortable(SEVEN);
        const mars = handle('Mars');

        act(() => mars.focus());
        await press(mars, ' ');
        await press(mars, 'ArrowUp');
        expect(announced()).toMatch(/Mars\D+2\D+7/);
        await press(mars, ' ');

        expect(onMove).toHaveBeenCalledExactlyOnceWith(4, 1);
      });

      it('stays put on Up from the first row, and on Down from the last', async () => {
        const onMove = renderSortable(SEVEN);

        await moveByKeyboard(handle('Moon'), 'ArrowUp');
        await moveByKeyboard(handle('Saturn'), 'ArrowDown');

        expect(onMove).not.toHaveBeenCalled();
      });

      it('goes to the first place on Home and the last on End', async () => {
        const onMove = renderSortable(SEVEN);

        await moveByKeyboard(handle('Mars'), 'Home');
        expect(onMove).toHaveBeenLastCalledWith(4, 0);
        await moveByKeyboard(handle('Moon'), 'End');
        expect(onMove).toHaveBeenLastCalledWith(1, 6);
      });
    });

    it('moves an entry by Enter as well as Space', async () => {
      const onMove = renderSortable(celestialBodies());
      const venus = handle('Venus');

      act(() => venus.focus());
      await press(venus, 'Enter');
      await press(venus, 'ArrowLeft');
      await press(venus, 'Enter');

      expect(onMove).toHaveBeenCalledExactlyOnceWith(1, 0);
    });

    it('puts an entry back where it was on Escape, moving nothing', async () => {
      const onMove = renderSortable(celestialBodies());
      const mars = handle('Mars');

      act(() => mars.focus());
      await press(mars, ' ');
      await press(mars, 'ArrowRight');
      await press(mars, 'Escape');

      expect(announced()).toMatch(/Mars\D+1\D+3/);
      expect(onMove).not.toHaveBeenCalled();
      expect(handle('Mars')).toHaveFocus();
    });

    it('moves an entry by pointer, dragged onto another’s place', async () => {
      const onMove = renderSortable(celestialBodies());

      // Mars from the first chip onto the third, Saturn, at 200–280px.
      await dragByPointer(handle('Mars'), 245);

      expect(onMove).toHaveBeenCalledExactlyOnceWith(0, 2);
    });

    it('moves nothing on a press that does not drag, or a lift put straight back down', async () => {
      const onMove = renderSortable(celestialBodies());
      const mars = handle('Mars');

      fireEvent.pointerDown(mars, { clientX: 40, clientY: 12, isPrimary: true, button: 0 });
      fireEvent.pointerUp(document, { clientX: 41, clientY: 12, isPrimary: true });
      await moveByKeyboard(mars);

      expect(onMove).not.toHaveBeenCalled();
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

    it('draws the icon of a choice in its row and in the closed value, outside the accessible name', () => {
      const choices = [
        { value: 'earth', label: 'Earth', icon: <svg data-mark="earth" /> },
        { value: 'air', label: 'Air' },
      ];
      function Harness() {
        const [value, setValue] = useState('');
        return (
          <ComboboxSelect
            id="element"
            label="Element"
            value={value}
            onChange={setValue}
            choices={choices}
          />
        );
      }
      render(<Harness />);

      fireEvent.click(element());
      const earth = screen.getByRole('option', { name: 'Earth' });
      const mark = earth.querySelector('[aria-hidden="true"] svg');
      expect(mark).not.toBeNull();
      expect(screen.getByRole('option', { name: 'Air' }).querySelector('svg')).toBeNull();

      fireEvent.click(earth);
      expect(element().querySelector('[aria-hidden="true"] svg')).not.toBeNull();
    });

    it('chooses None, the choice whose value is blank, like any other', () => {
      render(<SelectHarness placeholder="Choose an element" />);

      fireEvent.click(element());
      fireEvent.click(screen.getByRole('option', { name: 'None' }));

      expect(element()).toHaveTextContent('None');
      expect(element()).not.toHaveTextContent('Choose an element');
    });

    it('chooses by the keyboard: the arrows open and move, Enter chooses, Escape closes', () => {
      render(<SelectHarness placeholder="Choose an element" />);
      act(() => element().focus());

      fireEvent.keyDown(element(), { key: 'ArrowDown' });
      expect(element()).toHaveAttribute('aria-expanded', 'true');
      fireEvent.keyDown(element(), { key: 'ArrowDown' });
      expect(element()).toHaveAttribute(
        'aria-activedescendant',
        screen.getByRole('option', { name: 'Earth' }).id,
      );
      fireEvent.keyDown(element(), { key: 'Enter' });
      expect(element()).toHaveAttribute('aria-expanded', 'false');
      expect(element()).toHaveTextContent('Earth');

      // Escape closes without choosing what the arrows reached.
      fireEvent.keyDown(element(), { key: 'ArrowDown' });
      fireEvent.keyDown(element(), { key: 'ArrowDown' });
      fireEvent.keyDown(element(), { key: 'Escape' });
      expect(element()).toHaveAttribute('aria-expanded', 'false');
      expect(element()).toHaveTextContent('Earth');
    });

    it('lists a disabled choice with its note, and neither a press nor the arrows choose it', () => {
      const choices = [
        { value: 'earth', label: 'Earth', disabled: true, note: 'Taken' },
        { value: 'air', label: 'Air' },
      ];
      function Harness() {
        const [value, setValue] = useState('');
        return (
          <ComboboxSelect
            id="element"
            label="Element"
            value={value}
            onChange={setValue}
            choices={choices}
            placeholder="Choose an element"
          />
        );
      }
      render(<Harness />);

      fireEvent.click(element());
      const earth = screen.getByRole('option', { name: /^Earth/ });
      expect(earth).toHaveAttribute('aria-disabled', 'true');
      expect(earth).toHaveTextContent('Taken');
      fireEvent.click(earth);
      expect(element()).toHaveTextContent('Choose an element');

      act(() => element().focus());
      fireEvent.keyDown(element(), { key: 'ArrowDown' });
      fireEvent.keyDown(element(), { key: 'Enter' });
      expect(element()).toHaveTextContent('Air');
    });

    // In a modal, an Escape let through shuts the whole dialog (MB.115); a
    // `<dialog>` ignores one marked handled, which happy-dom cannot show, so the
    // mark is what is asserted here (the browser checks the dialog stays open).
    it('keeps Escape to itself while its list is open, and lets it through once shut', () => {
      render(<SelectHarness placeholder="Choose an element" />);

      fireEvent.click(element());
      const passedOn = fireEvent.keyDown(element(), { key: 'Escape' });

      expect(passedOn).toBe(false);
      expect(element()).toHaveAttribute('aria-expanded', 'false');
      expect(fireEvent.keyDown(element(), { key: 'Escape' })).toBe(true);
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
    });

    // The owner's call at MB.115's review: a placeholder that went with the
    // first chip left nothing prompting for the next.
    // In a modal, an Escape let through shuts the whole dialog (MB.115), as
    // the select-only box's test says.
    it('keeps Escape to itself while its list is open, and lets it through once shut', () => {
      render(<MultiHarness />);

      fireEvent.click(elements());
      const passedOn = fireEvent.keyDown(elements(), { key: 'Escape' });

      expect(passedOn).toBe(false);
      expect(elements()).toHaveAttribute('aria-expanded', 'false');
      expect(fireEvent.keyDown(elements(), { key: 'Escape' })).toBe(true);
    });

    it('keeps the placeholder after the chips while a choice is left, for the eye alone, and drops it once none is', () => {
      render(<MultiHarness />);
      const prompt = () => within(elements()).queryByText('Choose elements');
      // Read as the box's text while nothing is chosen.
      expect(prompt()).not.toHaveAttribute('aria-hidden');

      fireEvent.click(elements());
      pick('Fire');
      expect(chosen()).toBe('fire');
      expect(prompt()).toBeInTheDocument();
      // Beside a chip it would read as a choice.
      expect(prompt()).toHaveAttribute('aria-hidden', 'true');

      for (const label of ['Earth', 'Air', 'Water', 'Spirit']) pick(label);
      expect(chosen()).toBe('fire,earth,air,water,spirit');
      expect(prompt()).not.toBeInTheDocument();
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

    it('lists a value chosen twice as two chips, without React finding two with one key', () => {
      // A form can load a repeat and refuse it only on save (the ingredient form).
      render(<MultiHarness initial={['fire', 'fire']} />);

      expect(screen.getAllByRole('button', { name: 'Remove Fire' })).toHaveLength(2);
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
      // Nothing left to clear: kept in place for its room (MB.115), but out of
      // the tree and the tab order.
      expect(screen.queryByRole('button', { name: 'Clear Element' })).not.toBeInTheDocument();
      expect(
        screen
          .getAllByRole('button', { hidden: true })
          .find((button) => button.getAttribute('aria-label') === 'Clear Element'),
      ).toHaveAttribute('tabindex', '-1');
    });

    it('says what each change did, for a screen reader', () => {
      render(<MultiHarness initial={['earth']} />);
      const changes = () => screen.getByRole('status', { name: 'Element changes' });

      fireEvent.click(elements());
      pick('Spirit');
      expect(changes()).toHaveTextContent('Spirit');
      fireEvent.click(screen.getByRole('button', { name: 'Remove Earth' }));
      expect(changes()).toHaveTextContent('Earth');
      fireEvent.click(screen.getByRole('button', { name: 'Clear Element' }));
      expect(changes()).toHaveTextContent(/\S/);
      expect(changes()).not.toHaveTextContent('Earth');
    });

    it('says every choice is made, in an open list with no options, once there is nothing left to offer', () => {
      render(<MultiHarness initial={['earth', 'air', 'fire', 'water']} />);
      const status = () => screen.getByRole('status', { name: 'Element changes' });

      fireEvent.click(elements());
      expect(offered()).toEqual(['Spirit']);
      pick('Spirit');
      expect(chosen()).toBe('earth,air,fire,water,spirit');

      // Choosing the last closes the list, as before.
      expect(elements()).toHaveAttribute('aria-expanded', 'false');

      // Asking for it again opens it to say so, rather than going dead.
      fireEvent.click(elements());
      expect(elements()).toHaveAttribute('aria-expanded', 'true');
      expect(status()).toHaveTextContent(/\S/);
      expect(screen.queryByRole('option')).not.toBeInTheDocument();

      // Enter has nothing to take, and Escape closes it.
      press('Enter');
      expect(chosen()).toBe('earth,air,fire,water,spirit');
      press('Escape');
      expect(elements()).toHaveAttribute('aria-expanded', 'false');
    });
  });
});

// The empty message (M8.10): a settled lookup with no rows says so, outside the
// listbox, and it is no option.
describe('Combobox empty message', () => {
  const NONE: Suggestions = { options: [], pending: false };
  const status = () => screen.getByRole('status', { name: 'Form suggestions' });
  const listbox = () => screen.getByRole('listbox', { hidden: true });

  it('shows the message on a settled lookup with no rows, outside the listbox and announced', () => {
    render(<Harness offerTyped={false} suggestions={NONE} empty="Nothing Found" />);

    type('zzz');

    const message = screen.getByText('Nothing Found', { selector: 'div' });
    expect(message).toBeVisible();
    expect(listbox()).not.toContainElement(message);
    expect(screen.queryAllByRole('option')).toHaveLength(0);
    expect(status()).toHaveTextContent('Nothing Found');
  });

  it('shows no message while the lookup is pending, the text is blank, or none is given', () => {
    const { rerender } = render(
      <Harness
        offerTyped={false}
        suggestions={{ options: [], pending: true }}
        empty="Nothing Found"
      />,
    );
    type('zzz');
    expect(screen.queryByText('Nothing Found')).not.toBeInTheDocument();

    rerender(<Harness offerTyped={false} suggestions={NONE} empty="Nothing Found" initial="" />);
    type('   ');
    expect(screen.queryByText('Nothing Found')).not.toBeInTheDocument();

    // Passing false is the one way to say nothing.
    rerender(<Harness offerTyped={false} suggestions={NONE} empty={false} />);
    type('zzz');
    expect(screen.queryByText('Nothing Found')).not.toBeInTheDocument();
    expect(status()).not.toHaveTextContent(/\S/);
  });

  it('says it found nothing by default, so a box whose caller forgot `empty` never just shuts', () => {
    render(<Harness offerTyped={false} suggestions={NONE} />);

    type('zzz');

    // The message names what was typed, shown outside the listbox as well as announced.
    const shown = screen.getAllByText(/zzz/).filter((node) => !status().contains(node));
    expect(shown.length).toBeGreaterThan(0);
    expect(shown[0]).toBeVisible();
    expect(listbox()).not.toContainElement(shown[0] as HTMLElement);
    expect(status()).toHaveTextContent('zzz');
    expect(screen.queryAllByRole('option')).toHaveLength(0);
  });

  it('closes the message on Escape alone, then leaves the next Escape to the dialog', () => {
    render(<Harness offerTyped={false} suggestions={NONE} empty="Nothing Found" />);

    type('zzz');
    expect(screen.getByText('Nothing Found', { selector: 'div' })).toBeVisible();

    // The message is open content, so Escape closes it and goes no further.
    expect(key('Escape')).toBe(false);
    expect(screen.queryByText('Nothing Found')).not.toBeInTheDocument();
    expect(status()).not.toHaveTextContent('Nothing Found');
    expect(box()).toHaveValue('zzz');

    // Nothing shown, text in the box: the key is the dialog's.
    expect(key('Escape')).toBe(true);
    expect(box()).toHaveValue('zzz');

    // Typing again asks for the message again.
    type('zzzz');
    expect(screen.getByText('Nothing Found', { selector: 'div' })).toBeVisible();
  });

  it('keeps the count in the status, and no message, once rows arrive', () => {
    render(<Harness offerTyped={false} suggestions={ONE_BUCKET} empty="Nothing Found" />);

    type('fix');

    expect(status()).toHaveTextContent('2 suggestions');
    expect(screen.queryByText('Nothing Found')).not.toBeInTheDocument();
    expect(screen.getAllByRole('option')).toHaveLength(2);
  });
});

describe('Combobox leading node and toggle', () => {
  const control = () => box().closest('.combobox__control') as HTMLElement;

  it('fires the leading button without closing an open list or emptying the value', () => {
    const onGo = vi.fn();
    render(
      <Harness
        suggestions={ONE_BUCKET}
        leading={
          <button type="button" onClick={onGo}>
            Go
          </button>
        }
      />,
    );
    type('fix');
    expect(screen.getAllByRole('option')).toHaveLength(3);

    const go = screen.getByRole('button', { name: 'Go' });
    fireEvent.mouseDown(go);
    fireEvent.mouseUp(go);
    fireEvent.click(go);

    expect(onGo).toHaveBeenCalledTimes(1);
    expect(box()).toHaveValue('fix');
    expect(screen.getAllByRole('option')).toHaveLength(3);
  });

  it('puts the caret in the text on a press beside the leading button, as on the padding', () => {
    render(<Harness suggestions={ONE_BUCKET} leading={<button type="button">Go</button>} />);
    const ground = screen.getByRole('button', { name: 'Go' }).parentElement as HTMLElement;
    // The press lands on the leading node's own ground, not the button or the control.
    expect(ground).not.toBe(control());

    fireEvent.mouseDown(ground);
    expect(box()).toHaveFocus();
  });

  it('leaves out the chevron with toggle false, and still opens as you type', () => {
    render(
      <Harness
        suggestions={ONE_BUCKET}
        toggle={false}
        clear={{ label: 'Clear Form', onClear: () => {}, empty: true }}
      />,
    );

    expect(screen.queryByRole('button', { name: /^Show Form/ })).not.toBeInTheDocument();
    type('fix');
    expect(screen.getAllByRole('option')).toHaveLength(3);
  });

  it('draws no controls beside the box when there is no clear, no suggestions and no leading node', () => {
    render(<Harness />);

    expect(within(control()).queryByRole('button')).not.toBeInTheDocument();
  });
});

describe('an entry action', () => {
  const action = (onClick: () => void, disabled = false) => ({
    label: 'Make Hedge Fixture the Display Name',
    tip: 'Make Display Name',
    icon: <svg />,
    onClick,
    disabled,
  });

  it('is a button named for its entry, beside the remove, and acts without removing', () => {
    const onClick = vi.fn();
    const onRemove = vi.fn();
    render(
      <ul>
        <ComboboxEntry value="Hedge Fixture" action={action(onClick)} onRemove={onRemove} />
      </ul>,
    );

    const buttons = screen.getAllByRole('button');
    expect(buttons.map((button) => button.getAttribute('aria-label'))).toEqual([
      'Make Hedge Fixture the Display Name',
      'Remove Hedge Fixture',
    ]);
    fireEvent.click(buttons[0] as HTMLElement);
    expect(onClick).toHaveBeenCalledOnce();
    expect(onRemove).not.toHaveBeenCalled();
  });

  it('is shut when disabled, and absent when none is given', () => {
    const onClick = vi.fn();
    const { rerender } = render(
      <ul>
        <ComboboxEntry value="Hedge Fixture" action={action(onClick, true)} onRemove={vi.fn()} />
      </ul>,
    );
    fireEvent.click(screen.getByRole('button', { name: 'Make Hedge Fixture the Display Name' }));
    expect(onClick).not.toHaveBeenCalled();

    rerender(
      <ul>
        <ComboboxEntry value="Hedge Fixture" onRemove={vi.fn()} />
      </ul>,
    );
    expect(screen.getAllByRole('button')).toHaveLength(1);
  });
});
