import { fireEvent, render, screen, within } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import SaveStatus from '@/components/SaveStatus';
import type { SaveStatusProps } from '@/components/SaveStatus/types';

// An autosaving form's status line (M13.16): inline, a line that always
// shows the latest, a live region that announces a burst of saves once, an
// alert with Retry that stays until a save succeeds, and a caution notice for
// a conflict.

/** 2:02 pm and some seconds on the reader's clock. */
const at = (minute: number, second = 0) => new Date(2026, 9, 27, 14, minute, second);

function setup(props: Partial<SaveStatusProps> = {}) {
  const handlers = { onRetry: vi.fn(), onReload: vi.fn(), onKeepMine: vi.fn() };
  const base: SaveStatusProps = {
    status: 'idle',
    savedAt: null,
    conflictMessage: 'This record was changed elsewhere.',
    ...handlers,
    ...props,
  };
  const view = render(<SaveStatus {...base} />);
  const update = (more: Partial<SaveStatusProps>) => {
    Object.assign(base, more);
    view.rerender(<SaveStatus {...base} />);
  };
  return { ...view, update, ...handlers };
}

describe('SaveStatus', () => {
  it('renders its live region empty, then shows Saving… and Saved with the time', () => {
    const { update } = setup();
    expect(screen.getByRole('status')).toHaveTextContent(/^$/);

    update({ status: 'saving' });
    expect(screen.getByText('Saving…')).toBeInTheDocument();

    update({ status: 'saved', savedAt: at(2, 10) });
    expect(screen.queryByText('Saving…')).toBeNull();
    expect(screen.getByRole('status')).toHaveTextContent('Saved 2:02 pm');
  });

  it('says Draft saved for a draft', () => {
    setup({ status: 'saved', savedAt: at(2), draft: true });
    expect(screen.getByRole('status')).toHaveTextContent('Draft saved 2:02 pm');
  });

  it('announces the first save of a burst only, while the visible line keeps up', () => {
    const { update } = setup({ status: 'saved', savedAt: at(2, 10) });
    expect(screen.getByRole('status')).toHaveTextContent('Saved 2:02 pm');

    // Another save 50 s on: the same burst.
    update({ status: 'saving' });
    update({ status: 'saved', savedAt: at(3, 0) });
    expect(screen.getByText('Saved 2:03 pm')).toBeInTheDocument();
    expect(screen.getByRole('status')).toHaveTextContent('Saved 2:02 pm');

    // A save more than the gap after the last opens a new burst.
    update({ status: 'saved', savedAt: at(5, 0) });
    expect(screen.getByRole('status')).toHaveTextContent('Saved 2:05 pm');
  });

  it('shows Couldn’t save with Retry as an alert that stays until a save succeeds', () => {
    const { update, onRetry } = setup({ status: 'saved', savedAt: at(2) });

    update({ status: 'failed' });
    const alert = screen.getByRole('alert');
    fireEvent.click(within(alert).getByRole('button', { name: 'Retry' }));
    expect(onRetry).toHaveBeenCalledTimes(1);

    // The retry is under way: the alert stays, its button busy.
    update({ status: 'saving' });
    expect(screen.getByRole('alert')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Retry' })).toBeDisabled();

    update({ status: 'saved', savedAt: at(2, 30) });
    expect(screen.queryByRole('alert')).toBeNull();
    // A save after a failure is news, even inside the gap.
    expect(screen.getByRole('status')).toHaveTextContent('Saved 2:02 pm');
  });

  it('shows a conflict as a caution notice with Reload Latest and Keep My Version', () => {
    const { onReload, onKeepMine } = setup({ status: 'conflict', savedAt: at(2) });

    expect(screen.getByRole('alert')).toHaveTextContent('This record was changed elsewhere.');
    fireEvent.click(screen.getByRole('button', { name: 'Reload Latest' }));
    fireEvent.click(screen.getByRole('button', { name: 'Keep My Version' }));
    expect(onReload).toHaveBeenCalledTimes(1);
    expect(onKeepMine).toHaveBeenCalledTimes(1);
  });
});
