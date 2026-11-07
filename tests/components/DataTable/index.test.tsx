import { render, screen, within } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import StackTable from '@/components/DataTable';

// The admin lists' table. Its first column names each row, so a screen reader moving down a column
// hears which row it is in; and a table with no rows says so in the shared empty state.

type Row = { name: string; role: string };
const columns = [
  { heading: 'Name', cell: (row: Row) => row.name },
  { heading: 'Role', cell: (row: Row) => row.role },
  {
    heading: 'Edit',
    hiddenHeading: true,
    action: 'corner' as const,
    cell: (row: Row) => <a href={`/x/${row.name}`}>Edit {row.name}</a>,
  },
];
const ROWS: Row[] = [
  { name: 'Testwort', role: 'Steward' },
  { name: 'Fixturebane', role: 'Observer' },
];

describe('StackTable', () => {
  it("heads each body row with its first column's cell, and leaves the rest as cells", () => {
    render(<StackTable columns={columns} rows={ROWS} rowKey={(row) => row.name} empty="None" />);

    const headers = screen.getAllByRole('rowheader');
    expect(headers.map((header) => header.textContent)).toEqual(['Testwort', 'Fixturebane']);
    for (const header of headers) expect(header).toHaveAttribute('scope', 'row');

    const row = screen.getByRole('row', { name: /Testwort/ });
    expect(within(row).getByRole('rowheader')).toHaveTextContent('Testwort');
    expect(within(row).getAllByRole('cell')).toHaveLength(columns.length - 1);
    // The heading row names columns, not a row.
    const [head] = screen.getAllByRole('row');
    expect(within(head!).queryByRole('rowheader')).toBeNull();
  });

  it('says there are no rows in a status region, and draws no table', () => {
    render(<StackTable columns={columns} rows={[]} rowKey={(row) => row.name} empty="None" />);

    expect(screen.queryByRole('table')).toBeNull();
    expect(screen.getByRole('status')).toHaveTextContent('None');
  });
});
