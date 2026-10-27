import { act, render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { FormHistoryButtons } from '@/components/Field';
import { HistoryProbe } from '../../support/form-history';
import { byLabel, choose, press } from '../../support/interact';

// The Undo and Redo buttons of a form with history (M12.9).

const undoButton = () => screen.getByRole('button', { name: 'Undo' });
const redoButton = () => screen.getByRole('button', { name: 'Redo' });

describe('FormHistoryButtons', () => {
  it('draws nothing outside a form with a history', () => {
    render(<FormHistoryButtons />);

    expect(screen.queryByRole('button')).toBeNull();
  });

  it('is off while there is nothing to undo or redo, and on as the history grows', () => {
    render(<HistoryProbe />);
    expect(undoButton()).toBeDisabled();
    expect(redoButton()).toBeDisabled();

    choose('Kind', 'Two');
    expect(undoButton()).toBeEnabled();
    expect(redoButton()).toBeDisabled();

    press('Undo');
    expect(undoButton()).toBeDisabled();
    expect(redoButton()).toBeEnabled();
  });

  it('undoes and redoes on a click and moves the focus to the field it changed', () => {
    let kind = '';
    render(
      <HistoryProbe
        onHandles={({ methods }) => {
          kind = methods.getValues('kind');
        }}
      />,
    );
    choose('Kind', 'Two');
    expect(kind).toBe('two');

    press('Undo');

    expect(kind).toBe('one');
    expect(document.activeElement).toBe(byLabel('Kind', '[role="combobox"]'));

    press('Redo');

    expect(kind).toBe('two');
    expect(document.activeElement).toBe(byLabel('Kind', '[role="combobox"]'));
  });

  it('keeps a button that is about to go off from losing the focus to the page', () => {
    render(<HistoryProbe />);
    choose('Kind', 'Two');
    act(() => undoButton().focus());

    press('Undo');

    // The Kind box takes the focus, not the Undo button that is now off.
    expect(document.activeElement).not.toBe(document.body);
  });
});
