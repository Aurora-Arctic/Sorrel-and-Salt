import { fireEvent, render, screen, within } from '@testing-library/react';
import { useState } from 'react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import DateRangeField from '@/components/DateRangeField';
import type { DayRange } from '@/components/DateRangeField/types';

// The day-range field: a button showing the range, opening a calendar of two months with quick
// picks beside it, where the first day picked starts the range and the second ends it
// (claude-docs/components/date-range-field.md).

const PICKS = [
  { label: 'First Week', range: () => ({ from: '2026-10-01', to: '2026-10-07' }) },
  { label: 'Whole Month', range: () => ({ from: '2026-10-01', to: '2026-10-31' }) },
];

function Harness({
  initial = { from: '', to: '' },
  min,
  max,
}: {
  initial?: DayRange;
  min?: string;
  max?: string;
}) {
  const [range, setRange] = useState(initial);
  return (
    <>
      {/* A label for the button, as the field shell draws it, which a self-reference would read instead of the range. */}
      <label id="label" htmlFor="r">
        Minted
      </label>
      <DateRangeField
        id="r"
        labelledBy="label"
        label="Minted"
        from={range.from}
        to={range.to}
        min={min}
        max={max}
        quickPicks={PICKS}
        onChange={setRange}
      />
      <output aria-label="Held">{`${range.from}|${range.to}`}</output>
    </>
  );
}

const field = () => screen.getByRole('button', { name: /^Minted/ });
const open = () => {
  fireEvent.click(field());
  return screen.getByRole('dialog', { name: 'Choose Minted Days' });
};
// A space before the day number, so 3 October is not also 13 or 23 October.
const day = (words: string) =>
  within(screen.getByRole('dialog')).getByRole('button', { name: new RegExp(` ${words}`) });
// The calendar keeps a status of its own, so the harness's is found by name.
const answer = () => screen.getByRole('status', { name: 'Held' }).textContent;

describe('DateRangeField', () => {
  afterEach(() => vi.unstubAllGlobals());

  it('shows the range in short words on a button named by its label', () => {
    render(<Harness initial={{ from: '2026-10-01', to: '2026-10-30' }} />);
    expect(field()).toHaveAccessibleName(/Minted.*1 Oct 2026.*30 Oct 2026/);
    expect(field()).toHaveAttribute('aria-haspopup', 'dialog');
    expect(field()).toHaveAttribute('aria-expanded', 'false');
  });

  it('shows the placeholder and no clear while it holds no day', () => {
    render(<Harness />);
    expect(field()).toHaveAccessibleName(/Minted.*Any day/);
    expect(screen.queryByRole('button', { name: 'Clear Minted' })).toBeNull();
  });

  it('says a range open at one end as from or to that day', () => {
    const { unmount } = render(<Harness initial={{ from: '2026-10-01', to: '' }} />);
    expect(field()).toHaveAccessibleName(/From 1 Oct 2026/);
    unmount();
    render(<Harness initial={{ from: '', to: '2026-10-30' }} />);
    expect(field()).toHaveAccessibleName(/To 30 Oct 2026/);
  });

  it('empties both ends from its clear, and returns focus to the field', () => {
    render(<Harness initial={{ from: '2026-10-01', to: '2026-10-30' }} />);
    fireEvent.click(screen.getByRole('button', { name: 'Clear Minted' }));
    expect(answer()).toBe('|');
    expect(field()).toHaveAccessibleName(/Any day/);
    expect(field()).toHaveFocus();
    expect(screen.queryByRole('button', { name: 'Clear Minted' })).toBeNull();
  });

  it('opens two months side by side, starting at the range', () => {
    render(<Harness initial={{ from: '2026-10-01', to: '2026-10-30' }} />);
    const dialog = open();
    expect(field()).toHaveAttribute('aria-expanded', 'true');
    expect(within(dialog).getAllByRole('grid')).toHaveLength(2);
    expect(within(dialog).getByRole('grid', { name: 'October 2026' })).toBeVisible();
  });

  it('opens one month where the window is narrow', () => {
    vi.stubGlobal('matchMedia', (query: string) => ({
      matches: true,
      media: query,
      addEventListener: () => {},
      removeEventListener: () => {},
    }));
    render(<Harness initial={{ from: '2026-10-01', to: '2026-10-30' }} />);
    expect(within(open()).getAllByRole('grid')).toHaveLength(1);
  });

  it('starts the range on the first day picked and ends it on the second', () => {
    render(<Harness initial={{ from: '2026-10-01', to: '2026-10-30' }} />);
    open();
    fireEvent.click(day('3 October 2026'));
    // The first day starts a new range and leaves the calendar open for the last.
    expect(answer()).toBe('2026-10-03|');
    expect(screen.getByRole('dialog')).toBeVisible();
    fireEvent.click(day('12 October 2026'));
    expect(answer()).toBe('2026-10-03|2026-10-12');
    expect(screen.queryByRole('dialog')).toBeNull();
    expect(field()).toHaveAccessibleName(/3 Oct 2026.*12 Oct 2026/);
    expect(field()).toHaveFocus();
  });

  it('makes a single day of one day picked twice', () => {
    render(<Harness initial={{ from: '2026-10-01', to: '2026-10-30' }} />);
    open();
    fireEvent.click(day('5 October 2026'));
    fireEvent.click(day('5 October 2026'));
    expect(answer()).toBe('2026-10-05|2026-10-05');
    expect(field()).toHaveAccessibleName(/^Minted 5 Oct 2026$/);
  });

  it('puts the ends in order when the second day is the earlier', () => {
    render(<Harness initial={{ from: '2026-10-01', to: '2026-10-30' }} />);
    open();
    fireEvent.click(day('20 October 2026'));
    fireEvent.click(day('8 October 2026'));
    expect(answer()).toBe('2026-10-08|2026-10-20');
  });

  it('keeps the start alone when it closes before the end is picked', () => {
    render(<Harness initial={{ from: '2026-10-01', to: '2026-10-30' }} />);
    open();
    fireEvent.click(day('9 October 2026'));
    fireEvent.keyDown(screen.getAllByRole('grid')[0], { key: 'Escape' });
    expect(answer()).toBe('2026-10-09|');
    expect(field()).toHaveAccessibleName(/From 9 Oct 2026/);
  });

  it('sets a quick pick in one press, and marks the pick the range matches', () => {
    render(<Harness initial={{ from: '2026-10-01', to: '2026-10-30' }} />);
    const dialog = open();
    expect(within(dialog).getByRole('button', { name: 'First Week' })).toHaveAttribute(
      'aria-pressed',
      'false',
    );
    fireEvent.click(within(dialog).getByRole('button', { name: 'First Week' }));
    expect(answer()).toBe('2026-10-01|2026-10-07');
    expect(screen.queryByRole('dialog')).toBeNull();
    expect(field()).toHaveFocus();
    expect(within(open()).getByRole('button', { name: 'First Week' })).toHaveAttribute(
      'aria-pressed',
      'true',
    );
  });

  it('tells how to pick in the calendar’s description, and what comes next', () => {
    render(<Harness initial={{ from: '2026-10-01', to: '2026-10-30' }} />);
    const dialog = open();
    expect(dialog).toHaveAccessibleDescription(/first day, then the last/);
    fireEvent.click(day('3 October 2026'));
    expect(dialog).toHaveAccessibleDescription(/last day/);
    expect(dialog).not.toHaveAccessibleDescription(/first day/);
  });

  it('refuses a day before min or after max', () => {
    render(<Harness initial={{ from: '2026-10-10', to: '' }} min="2026-10-05" max="2026-10-20" />);
    open();
    expect(day('5 October 2026')).toBeEnabled();
    expect(day('4 October 2026')).toBeDisabled();
    expect(day('20 October 2026')).toBeEnabled();
    expect(day('21 October 2026')).toBeDisabled();
  });

  // A modal dialog closes on an Escape keydown nobody prevented, so stopping it alone would close a
  // phone Filters sheet holding the field.
  it('closes on Escape alone, claiming the key so a surrounding dialog stays open', () => {
    render(<Harness initial={{ from: '2026-10-01', to: '2026-10-30' }} />);
    open();
    const unclaimed = fireEvent.keyDown(screen.getAllByRole('grid')[0], { key: 'Escape' });
    expect(unclaimed).toBe(false);
    expect(screen.queryByRole('dialog')).toBeNull();
    expect(answer()).toBe('2026-10-01|2026-10-30');
    expect(field()).toHaveFocus();
  });
});
