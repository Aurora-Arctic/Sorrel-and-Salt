import { act, fireEvent, render, screen } from '@testing-library/react';
import { StrictMode } from 'react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { byLabel, choose, press, redo, type, typeIn, undo } from '../../support/interact';
import { HistoryProbe, type ProbeHandles } from '../../support/form-history';

// Undo and redo for a react-hook-form form (M12.9): what a chord, a pause and
// a reset do to the history, and where the focus goes after a restore.

function mount(props: Parameters<typeof HistoryProbe>[0] = {}) {
  const handles: { current: ProbeHandles | null } = { current: null };
  const view = render(
    <HistoryProbe
      {...props}
      onHandles={(next) => {
        handles.current = next;
      }}
    />,
  );
  const values = () => handles.current!.methods.getValues();
  return { ...view, handles, values };
}

/** Puts the focus in the text box labelled `label`, where a person's keys would go. */
const focusIn = (label: string) => act(() => byLabel(label, 'input').focus());

/** The form's submit count, read from the store: `formState` only reports what a render subscribed to. */
const submits = (handles: { current: ProbeHandles | null }) =>
  (handles.current!.methods.control as unknown as { _formState: { submitCount: number } })
    ._formState.submitCount;

const save = () => screen.getByRole('button', { name: 'Save' });

afterEach(() => {
  vi.useRealTimers();
});

describe('useFormHistory', () => {
  it('brings a removed row back through useFieldArray', () => {
    const { values } = mount();

    press('Remove Item 1');
    expect(values().items).toEqual([{ value: 'second' }]);
    expect(screen.queryByRole('textbox', { name: 'Item 2' })).toBeNull();

    focusIn('Title');
    undo();

    expect(values().items).toEqual([{ value: 'first' }, { value: 'second' }]);
    expect(byLabel('Item 2', 'input')).toHaveValue('second');
  });

  it('undoes a select pick, disabling Save, and redoes it', () => {
    const { values } = mount();
    choose('Kind', 'Two');
    expect(values().kind).toBe('two');
    expect(save()).toBeEnabled();

    focusIn('Title');
    undo();
    expect(values().kind).toBe('one');
    expect(save()).toBeDisabled();

    redo();
    expect(values().kind).toBe('two');
    expect(save()).toBeEnabled();
  });

  it('acts on Ctrl+Shift+Z, Cmd+Shift+Z and Ctrl+Y, and leaves Cmd+Y, Alt+Z and composing alone', () => {
    const { values } = mount();
    choose('Kind', 'Two');
    focusIn('Title');

    for (const [chord, then] of [
      [() => redo(), 'two'],
      [() => redo({ meta: true }), 'two'],
      [() => redo({ viaY: true }), 'two'],
    ] as const) {
      undo();
      expect(values().kind).toBe('one');
      chord();
      expect(values().kind).toBe(then);
      // The chord is not a letter for the select under focus to search with.
      expect(byLabel('Kind', '[role="combobox"]')).toHaveAttribute('aria-expanded', 'false');
    }

    undo({ meta: true });
    expect(values().kind).toBe('one');
    // Cmd+Y is the browser's history, Alt+Z is a character on some layouts.
    expect(redo({ meta: true, viaY: true })).toBe(true);
    expect(undo({ alt: true })).toBe(true);
    expect(values().kind).toBe('one');
    redo();
    expect(values().kind).toBe('two');
    expect(
      fireEvent.keyDown(document.activeElement!, { key: 'z', ctrlKey: true, isComposing: true }),
    ).toBe(true);
    expect(values().kind).toBe('two');
  });

  it('leaves the values alone and keeps the key from the browser when there is nothing to undo', () => {
    const { values } = mount();
    focusIn('Title');
    const before = values();

    expect(undo()).toBe(false);

    expect(values()).toEqual(before);
    expect(screen.getByRole('status', { name: 'Edit History' })).not.toBeEmptyDOMElement();
  });

  it('forgets its steps when the form is reset elsewhere, and records nothing of its own restores', () => {
    const { handles } = mount();
    choose('Kind', 'Two');
    expect(handles.current!.history.canUndo).toBe(true);

    press('Start Over');
    expect(handles.current!.history.canUndo).toBe(false);
    expect(handles.current!.history.canRedo).toBe(false);

    choose('Kind', 'Three');
    focusIn('Title');
    undo();
    // Both the pick and the title it emptied were one step, now one redo.
    expect(handles.current!.history.canUndo).toBe(false);
    expect(handles.current!.history.canRedo).toBe(true);
  });

  it('skips a chord inside an open combobox, and does nothing when not enabled', () => {
    const { values, rerender, handles } = mount({ openCombobox: true });
    choose('Kind', 'Two');
    act(() => byLabel('Open Box', 'input').focus());

    expect(undo()).toBe(true);
    expect(values().kind).toBe('two');

    focusIn('Title');
    rerender(
      <HistoryProbe
        openCombobox
        enabled={false}
        onHandles={(next) => {
          handles.current = next;
        }}
      />,
    );
    expect(undo()).toBe(true);
    expect(values().kind).toBe('two');
    expect(handles.current!.history.canUndo).toBe(false);
  });

  it('keeps the names skip matches out of the history', () => {
    const { values } = mount({ skip: (name) => name === 'note' });
    typeIn(byLabel('Note', 'input, textarea'), 'x');
    expect(screen.getByRole('button', { name: 'Undo' })).toBeDisabled();

    choose('Kind', 'Two');
    focusIn('Title');
    undo();
    expect(values().kind).toBe('one');
    expect(values().note).toBe('x');
    expect(screen.getByRole('button', { name: 'Undo' })).toBeDisabled();
  });

  it('skips a target the form says to ignore', () => {
    const { values } = mount({ ignore: (target) => target.getAttribute('name') === 'title' });
    choose('Kind', 'Two');
    focusIn('Title');

    expect(undo()).toBe(true);
    expect(values().kind).toBe('two');
  });

  describe('after a submit', () => {
    // Two typed steps a pause apart, so undoing the second lands on a blank title.
    async function twoTitleEdits(submit: boolean) {
      vi.useFakeTimers({ toFake: ['Date'] });
      const view = mount();
      type('Title', '');
      vi.setSystemTime(Date.now() + 5000);
      type('Title', 'Abc');
      focusIn('Title');
      if (submit) await act(async () => press('Save'));
      return view;
    }
    const titleBox = () => byLabel('Title', 'input');

    it('shows the field its error when an undo lands on an invalid value, without submitting again', async () => {
      const { handles } = await twoTitleEdits(true);
      const count = submits(handles);
      expect(count).toBe(1);
      expect(titleBox()).not.toBeInvalid();

      await act(async () => {
        undo();
      });

      expect(titleBox()).toHaveValue('');
      expect(titleBox()).toBeInvalid();
      expect(submits(handles)).toBe(count);
    });

    it('keeps the form quiet when no submit has happened', async () => {
      await twoTitleEdits(false);

      await act(async () => {
        undo();
      });

      expect(titleBox()).toHaveValue('');
      expect(titleBox()).not.toBeInvalid();
    });
  });

  describe('the live region', () => {
    const region = () => screen.getByRole('status', { name: 'Edit History' });

    it('has text after an undo, a redo and an empty undo', () => {
      mount();
      choose('Kind', 'Two');
      focusIn('Title');

      undo();
      expect(region().textContent?.trim()).toBeTruthy();
      const afterUndo = region().textContent;
      redo();
      expect(region().textContent?.trim()).toBeTruthy();
      expect(region().textContent).not.toBe(afterUndo);
      undo();
      undo();
      expect(region().textContent?.trim()).toBeTruthy();
    });

    it('differs in the DOM when the same thing is said twice', () => {
      mount();
      focusIn('Title');
      undo();
      const first = region().textContent;
      undo();
      expect(region().textContent).not.toBe(first);
      expect(region().textContent?.trim()).toBe(first?.trim());
    });
  });

  it('records a pointer drag as one step, and a change after it as another', async () => {
    const { values } = mount();
    const slider = screen.getByRole('slider', { name: 'Level' });
    const tick = () => act(() => new Promise<void>((resolve) => setTimeout(resolve)));

    fireEvent.pointerDown(slider);
    fireEvent.pointerMove(slider);
    await tick();
    fireEvent.pointerMove(slider);
    await tick();
    fireEvent.pointerMove(slider);
    await tick();
    fireEvent.pointerUp(document);
    expect(values().level).toBe(3);

    // A change after the hold is a step of its own.
    choose('Kind', 'Two');
    expect(values().kind).toBe('two');

    focusIn('Title');
    undo();
    expect(values().kind).toBe('one');
    expect(values().level).toBe(3);
    undo();
    expect(values().level).toBe(0);
    redo();
    expect(values().level).toBe(3);
  });

  it('subscribes once under StrictMode, and one keypress undoes one step', () => {
    const observers = (handles: { current: ProbeHandles | null }) =>
      (
        handles.current!.methods.control as unknown as {
          _subjects: { state: { observers: unknown[] } };
        }
      )._subjects.state.observers.length;

    const plain = mount();
    const expected = observers(plain.handles);
    plain.unmount();

    const handles: { current: ProbeHandles | null } = { current: null };
    render(
      <StrictMode>
        <HistoryProbe
          onHandles={(next) => {
            handles.current = next;
          }}
        />
      </StrictMode>,
    );
    expect(observers(handles)).toBe(expected);

    choose('Kind', 'Two');
    press('Add Item');
    focusIn('Title');
    undo();

    expect(handles.current!.methods.getValues('items')).toHaveLength(2);
    expect(handles.current!.methods.getValues('kind')).toBe('two');
  });

  describe('what makes a step', () => {
    const steps = () => {
      // Count steps by undoing until nothing is left.
      let count = 0;
      const { handles } = current;
      while (handles.current!.history.canUndo) {
        act(() => handles.current!.history.undo());
        count += 1;
      }
      return count;
    };
    let current: ReturnType<typeof mount>;

    it('merges typing within the pause into one step', () => {
      vi.useFakeTimers({ toFake: ['Date'] });
      current = mount();
      type('Title', 'F');
      vi.setSystemTime(Date.now() + 100);
      type('Title', 'Fi');
      expect(steps()).toBe(1);
      expect(current.values().title).toBe('Fixture');
    });

    it('starts another step after a pause', () => {
      vi.useFakeTimers({ toFake: ['Date'] });
      current = mount();
      type('Title', 'F');
      vi.setSystemTime(Date.now() + 5000);
      type('Title', 'Fi');
      expect(steps()).toBe(2);
    });

    it('starts another step after a blur', () => {
      current = mount();
      type('Title', 'F');
      focusIn('Title');
      act(() => byLabel('Note', 'input, textarea').focus());
      focusIn('Title');
      type('Title', 'Fi');
      expect(steps()).toBe(2);
    });

    it('starts another step on a different field', () => {
      current = mount();
      type('Title', 'F');
      type('Note', 'n');
      expect(steps()).toBe(2);
    });

    it('never merges a select pick with typing, or with another pick', () => {
      current = mount();
      type('Title', 'F');
      choose('Kind', 'Two');
      choose('Kind', 'One');
      expect(steps()).toBe(3);
    });

    it('joins what one action sets in the same turn into one step', () => {
      current = mount();
      choose('Kind', 'Three');
      expect(current.values().title).toBe('');
      expect(steps()).toBe(1);
      expect(current.values().kind).toBe('one');
      expect(current.values().title).toBe('Fixture');
    });
  });

  describe('where the focus goes', () => {
    it('lands in the field an undo changed, not the one the person was in', () => {
      mount();
      choose('Kind', 'Two');
      focusIn('Title');

      undo();

      expect(document.activeElement).toBe(byLabel('Kind', '[role="combobox"]'));
    });

    it('lands inside the list when a removed row comes back', () => {
      mount();
      press('Remove Item 1');
      focusIn('Title');

      undo();

      expect(screen.getByRole('group', { name: 'Items' }).contains(document.activeElement)).toBe(
        true,
      );
    });

    it('tells onRestored the names, so a collapsed field can be opened and reached', () => {
      const onRestored = vi.fn();
      mount({ onRestored });
      typeIn(byLabel('Note', 'input, textarea'), 'x');
      focusIn('Title');

      undo();

      expect(onRestored).toHaveBeenCalledWith(['note'], expect.anything(), 'undo');
      expect(screen.getByText('More').closest('details')).toHaveAttribute('open');
      expect(document.activeElement).toBe(byLabel('Note', 'input, textarea'));
    });

    it('tells onRestored the diffs and the direction, and lands where it names', () => {
      const onRestored = vi.fn(() => 'kind');
      mount({ onRestored });
      typeIn(byLabel('Note', 'input, textarea'), 'x');
      focusIn('Title');

      undo();
      expect(onRestored).toHaveBeenLastCalledWith(
        ['note'],
        [{ name: 'note', before: '', after: 'x' }],
        'undo',
      );
      expect(document.activeElement).toBe(byLabel('Kind', '[role="combobox"]'));

      redo();
      expect(onRestored).toHaveBeenLastCalledWith(
        ['note'],
        [{ name: 'note', before: '', after: 'x' }],
        'redo',
      );
    });

    it('falls back to the Undo button when there is nothing to land on', () => {
      // The list starts empty, so undoing the added row leaves it nothing to land on.
      mount({ items: [] });
      choose('Kind', 'Two');
      press('Add Item');
      focusIn('Title');

      undo();

      expect(document.activeElement).toBe(screen.getByRole('button', { name: 'Undo' }));
    });
  });
});
