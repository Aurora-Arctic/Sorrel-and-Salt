import { fireEvent, render, screen, within } from '@testing-library/react';
import { useState } from 'react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import DateField from '@/components/DateField';

// The day picker field: a button showing the day, opening a calendar that cannot pick past `max`
// (claude-docs/components/date-field.md).

function Harness({
  initial = '2026-03-10',
  max = '2026-03-15',
}: {
  initial?: string;
  max?: string | null;
}) {
  const [value, setValue] = useState(initial);
  return (
    <>
      <span id="label">Date</span>
      <DateField
        id="d"
        labelledBy="label"
        value={value}
        max={max ?? undefined}
        onChange={setValue}
      />
    </>
  );
}

describe('DateField', () => {
  afterEach(() => vi.useRealTimers());

  it('shows the day in words, on a button named by its label', () => {
    render(<Harness />);
    expect(screen.getByRole('button', { name: /Date.*10 March 2026/ })).toHaveAttribute(
      'aria-expanded',
      'false',
    );
  });

  it('says the button opens a dialog, and names the calendar it opens', () => {
    render(<Harness />);
    const button = screen.getByRole('button', { name: /Date/ });
    expect(button).toHaveAttribute('aria-haspopup', 'dialog');
    fireEvent.click(button);
    expect(
      within(screen.getByRole('dialog', { name: 'Choose a Day' })).getByRole('grid'),
    ).toBeVisible();
  });

  it('picks a day, closes the calendar and answers with the day as YYYY-MM-DD', () => {
    render(<Harness />);
    fireEvent.click(screen.getByRole('button', { name: /Date/ }));
    const grid = screen.getByRole('grid');
    fireEvent.click(within(grid).getByRole('button', { name: /12 March 2026/ }));
    expect(screen.queryByRole('grid')).toBeNull();
    expect(screen.getByRole('button', { name: /Date.*12 March 2026/ })).toBeInTheDocument();
  });

  it('refuses a day after max, and stops at max the month', () => {
    render(<Harness />);
    fireEvent.click(screen.getByRole('button', { name: /Date/ }));
    const grid = screen.getByRole('grid');
    expect(within(grid).getByRole('button', { name: /15 March 2026/ })).toBeEnabled();
    expect(within(grid).getByRole('button', { name: /16 March 2026/ })).toBeDisabled();
    expect(screen.getByRole('button', { name: /Next Month/ })).toHaveAttribute(
      'aria-disabled',
      'true',
    );
  });

  it('moves the calendar to a month and a year chosen from its caption, then picks a day there', () => {
    render(<Harness initial="2026-03-10" max="2026-06-15" />);
    fireEvent.click(screen.getByRole('button', { name: /Date/ }));
    fireEvent.click(screen.getByRole('combobox', { name: /Year/ }));
    fireEvent.click(screen.getByRole('option', { name: '2024' }));
    fireEvent.click(screen.getByRole('combobox', { name: /Month/ }));
    fireEvent.click(screen.getByRole('option', { name: 'February' }));
    const grid = screen.getByRole('grid');
    expect(grid).toHaveAccessibleName(/February 2024/);
    fireEvent.click(within(grid).getByRole('button', { name: /, 9 February 2024/ }));
    expect(screen.getByRole('button', { name: /Date.*9 February 2024/ })).toBeInTheDocument();
  });

  it('offers no year after max', () => {
    render(<Harness max="2026-06-15" />);
    fireEvent.click(screen.getByRole('button', { name: /Date/ }));
    fireEvent.click(screen.getByRole('combobox', { name: /Year/ }));
    const years = screen.getAllByRole('option');
    expect(years[years.length - 1]).toHaveTextContent('2026');
  });

  it('keeps the calendar open when a press lands on a year in the open list', () => {
    render(<Harness max="2026-06-15" />);
    fireEvent.click(screen.getByRole('button', { name: /Date/ }));
    fireEvent.click(screen.getByRole('combobox', { name: /Year/ }));
    fireEvent.pointerDown(screen.getByRole('option', { name: '2020' }));
    expect(screen.getByRole('grid')).toBeInTheDocument();
  });

  it('closes an open year list on Escape and leaves the calendar open', () => {
    render(<Harness max="2026-06-15" />);
    fireEvent.click(screen.getByRole('button', { name: /Date/ }));
    const year = screen.getByRole('combobox', { name: /Year/ });
    fireEvent.click(year);
    fireEvent.keyDown(year, { key: 'Escape' });
    expect(screen.queryByRole('option', { name: '2020' })).toBeNull();
    expect(screen.getByRole('grid')).toBeInTheDocument();
  });

  it('picks today from a calendar open on another month and closes', () => {
    vi.useFakeTimers({ toFake: ['Date'] });
    vi.setSystemTime(new Date(2026, 2, 12, 9));
    render(<Harness initial="2026-01-05" max="2026-03-15" />);
    fireEvent.click(screen.getByRole('button', { name: /Date/ }));
    expect(screen.getByRole('grid')).toHaveAccessibleName(/January 2026/);
    fireEvent.click(screen.getByRole('button', { name: 'Today' }));
    expect(screen.queryByRole('grid')).toBeNull();
    expect(screen.getByRole('button', { name: /Date.*12 March 2026/ })).toBeInTheDocument();
  });

  it('offers no Today when max is before today', () => {
    vi.useFakeTimers({ toFake: ['Date'] });
    vi.setSystemTime(new Date(2026, 2, 12, 9));
    render(<Harness initial="2026-01-05" max="2026-03-01" />);
    fireEvent.click(screen.getByRole('button', { name: /Date/ }));
    expect(screen.queryByRole('button', { name: 'Today' })).toBeNull();
  });

  it('runs the years to the end of next year with no max, and picks a day next month', () => {
    vi.useFakeTimers({ toFake: ['Date'] });
    vi.setSystemTime(new Date(2026, 2, 12, 9));
    render(<Harness initial="2026-03-10" max={null} />);
    fireEvent.click(screen.getByRole('button', { name: /Date/ }));
    fireEvent.click(screen.getByRole('combobox', { name: /Year/ }));
    const years = screen.getAllByRole('option');
    expect(years[years.length - 1]).toHaveTextContent('2027');
    fireEvent.click(screen.getByRole('combobox', { name: /Year/ }));
    fireEvent.click(screen.getByRole('button', { name: /Next Month/ }));
    fireEvent.click(screen.getByRole('button', { name: /, 20 April 2026/ }));
    expect(screen.getByRole('button', { name: /Date.*20 April 2026/ })).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: /Date/ }));
    expect(screen.getByRole('button', { name: 'Today' })).toBeInTheDocument();
  });

  it('closes on Escape without changing the day', () => {
    render(<Harness />);
    fireEvent.click(screen.getByRole('button', { name: /Date/ }));
    fireEvent.keyDown(screen.getByRole('grid'), { key: 'Escape' });
    expect(screen.queryByRole('grid')).toBeNull();
    expect(screen.getByRole('button', { name: /10 March 2026/ })).toBeInTheDocument();
  });
});
