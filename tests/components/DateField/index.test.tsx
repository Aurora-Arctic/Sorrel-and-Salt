import { fireEvent, render, screen, within } from '@testing-library/react';
import { useState } from 'react';
import { describe, expect, it } from 'vitest';
import DateField from '@/components/DateField';

// The day picker field: a button showing the day, opening a calendar that cannot pick past `max`
// (claude-docs/components/date-field.md).

function Harness({
  initial = '2026-03-10',
  max = '2026-03-15',
}: {
  initial?: string;
  max?: string;
}) {
  const [value, setValue] = useState(initial);
  return (
    <>
      <span id="label">Date</span>
      <DateField id="d" labelledBy="label" value={value} max={max} onChange={setValue} />
    </>
  );
}

describe('DateField', () => {
  it('shows the day in words, on a button named by its label', () => {
    render(<Harness />);
    expect(screen.getByRole('button', { name: /Date.*10 March 2026/ })).toHaveAttribute(
      'aria-expanded',
      'false',
    );
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

  it('closes on Escape without changing the day', () => {
    render(<Harness />);
    fireEvent.click(screen.getByRole('button', { name: /Date/ }));
    fireEvent.keyDown(screen.getByRole('grid'), { key: 'Escape' });
    expect(screen.queryByRole('grid')).toBeNull();
    expect(screen.getByRole('button', { name: /10 March 2026/ })).toBeInTheDocument();
  });
});
