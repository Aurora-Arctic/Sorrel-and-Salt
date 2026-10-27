import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { updatedColumn } from '@/components/DataTable/updated-column';

// The Updated column every audited list shares (MB.260). Each list proves it
// shows the column; who and when, and withholding both together, are proved
// here once.
const cell = (row: { updatedBy: string | null; updatedAt: Date | null }) =>
  render(<div>{updatedColumn<typeof row>().cell(row)}</div>).container;

describe('updatedColumn', () => {
  it('names who last changed the row, and the day as a machine-readable date', () => {
    cell({ updatedBy: 'Fixture A', updatedAt: new Date('2026-10-12T09:30:00Z') });

    expect(screen.getByText('Fixture A')).toBeInTheDocument();
    const time = screen.getByText('2026-10-12');
    expect(time.tagName).toBe('TIME');
    expect(time).toHaveAttribute('dateTime', '2026-10-12T09:30:00.000Z');
  });

  it.each([
    ['no one', { updatedBy: null, updatedAt: new Date('2026-10-12T09:30:00Z') }],
    ['no date', { updatedBy: 'Fixture A', updatedAt: null }],
  ])('withholds both halves when it has %s', (_why, row) => {
    expect(cell(row).textContent).toBe('');
  });
});
