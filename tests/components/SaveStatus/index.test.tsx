import { fireEvent, render, screen } from '@testing-library/react';
import axe from 'axe-core';
import { describe, expect, it, vi } from 'vitest';
import SaveStatus, { BURST_GAP_MS } from '@/components/SaveStatus';
import type { SaveStatusProps } from '@/components/SaveStatus/types';
import { clockTime } from '@/components/LastEdit/relative';

// An autosaving form's status line (M13.16): inline, a line that always
// shows the latest, a live region that announces a burst of saves once, an
// alert with Retry that stays until a save succeeds, and a caution notice for
// a conflict.

/** 14:02 and some seconds on the reader's clock. */
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

describe('clockTime', () => {
  it('reads the time of day as hours and minutes on a 24-hour clock', () => {
    expect(clockTime(new Date(2026, 9, 27, 14, 2, 59))).toBe('14:02');
    expect(clockTime(new Date(2026, 9, 27, 9, 5))).toBe('09:05');
  });
});

describe('SaveStatus', () => {
  it('renders its live region empty, then shows Saving… and Saved with the time', () => {
    const { update } = setup();
    expect(screen.getByRole('status')).toHaveTextContent(/^$/);

    update({ status: 'saving' });
    expect(screen.getByText('Saving…')).toBeInTheDocument();

    update({ status: 'saved', savedAt: at(2, 10) });
    expect(screen.queryByText('Saving…')).toBeNull();
    expect(screen.getByRole('status')).toHaveTextContent('Saved 14:02');
  });

  it('says Draft saved for a draft', () => {
    setup({ status: 'saved', savedAt: at(2), draft: true });
    expect(screen.getByRole('status')).toHaveTextContent('Draft saved 14:02');
  });

  it('announces the first save of a burst only, while the visible line keeps up', () => {
    const { update } = setup({ status: 'saved', savedAt: at(2, 10) });
    expect(screen.getByRole('status')).toHaveTextContent('Saved 14:02');

    // Another save 50 s on: the same burst.
    update({ status: 'saving' });
    update({ status: 'saved', savedAt: at(3, 0) });
    expect(screen.getByText('Saved 14:03')).toBeInTheDocument();
    expect(screen.getByRole('status')).toHaveTextContent('Saved 14:02');

    // A save more than the gap after the last opens a new burst.
    expect(BURST_GAP_MS).toBe(60_000);
    update({ status: 'saved', savedAt: at(5, 0) });
    expect(screen.getByRole('status')).toHaveTextContent('Saved 14:05');
  });

  it('shows Couldn’t save with Retry as an alert that stays until a save succeeds', () => {
    const { update, onRetry } = setup({ status: 'saved', savedAt: at(2) });

    update({ status: 'failed' });
    expect(screen.getByRole('alert')).toHaveTextContent('Couldn’t save.');
    fireEvent.click(screen.getByRole('button', { name: 'Retry' }));
    expect(onRetry).toHaveBeenCalledTimes(1);

    // The retry is under way: the alert stays, its button busy.
    update({ status: 'saving' });
    expect(screen.getByRole('alert')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Retry' })).toBeDisabled();

    update({ status: 'saved', savedAt: at(2, 30) });
    expect(screen.queryByRole('alert')).toBeNull();
    // A save after a failure is news, even inside the gap.
    expect(screen.getByRole('status')).toHaveTextContent('Saved 14:02');
  });

  it('shows a conflict as a caution notice with Reload Latest and Keep My Version', () => {
    const { onReload, onKeepMine } = setup({ status: 'conflict', savedAt: at(2) });

    expect(screen.getByRole('alert')).toHaveTextContent('This record was changed elsewhere.');
    fireEvent.click(screen.getByRole('button', { name: 'Reload Latest' }));
    fireEvent.click(screen.getByRole('button', { name: 'Keep My Version' }));
    expect(onReload).toHaveBeenCalledTimes(1);
    expect(onKeepMine).toHaveBeenCalledTimes(1);
  });

  it.each(['idle', 'saving', 'saved', 'failed', 'conflict'] as const)(
    'has no axe violations when %s',
    async (status) => {
      const { container } = setup({ status, savedAt: at(2) });
      const { violations } = await axe.run(container);
      expect(violations).toEqual([]);
    },
  );
});
