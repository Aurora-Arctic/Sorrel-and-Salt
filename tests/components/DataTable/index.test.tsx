import type { ReactNode } from 'react';
import { render, screen, within } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import StackTable, { updatedColumn } from '@/components/DataTable';
import type { UpdatedStamp } from '@/components/DataTable/types';
import { emptyCellMark, rowCells } from '../../support/table';

// The admin lists' table. Its first column names each row, so a screen reader moving down a column
// hears which row it is in; a cell with no value shows one shared mark, so a card's label never stands alone;
// and a table with no rows says so in the shared empty state.

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

  describe('a cell its column gives nothing', () => {
    // Each way a column's cell says "nothing here": a null field, a missing one, a guard that fell short, an empty string.
    type Sparse = { name: string; note: ReactNode };
    const sparse = [
      { heading: 'Name', cell: (row: Sparse) => row.name },
      { heading: 'Note', cell: (row: Sparse) => row.note },
    ];
    const valueOf = (name: string): HTMLElement =>
      rowCells(screen.getByRole('row', { name: new RegExp(name) }))[1] as HTMLElement;

    it('draws one mark, the same whichever way the column said so, where a card would show its label alone', () => {
      const mark = emptyCellMark();
      expect(mark.trim()).not.toBe('');

      const ROWS: Sparse[] = [
        { name: 'Nullwort', note: null },
        { name: 'Unsetwort', note: undefined },
        { name: 'Falsewort', note: false },
        { name: 'Blankwort', note: '' },
      ];
      render(<StackTable columns={sparse} rows={ROWS} rowKey={(row) => row.name} empty="None" />);

      for (const { name } of ROWS) {
        const cell = valueOf(name);
        expect(cell.textContent, name).toBe(mark);
        // The card at phone width still names the column above the mark.
        expect(cell).toHaveAttribute('data-label', 'Note');
      }
    });

    it('draws a value as given, a zero included, and no mark beside it', () => {
      const mark = emptyCellMark();
      expect(mark.trim()).not.toBe('');

      render(
        <StackTable
          columns={sparse}
          rows={[
            { name: 'Keptwort', note: 'Kept dry' },
            { name: 'Zerowort', note: 0 },
          ]}
          rowKey={(row) => row.name}
          empty="None"
        />,
      );

      expect(valueOf('Keptwort').textContent).toBe('Kept dry');
      expect(valueOf('Zerowort').textContent).toBe('0');
    });

    it('draws the same mark under Updated where the editor and day are withheld', () => {
      const mark = emptyCellMark();
      expect(mark.trim()).not.toBe('');

      type Stamped = { name: string } & UpdatedStamp;
      render(
        <StackTable
          columns={[
            { heading: 'Name', cell: (row: Stamped) => row.name },
            updatedColumn<Stamped>(),
          ]}
          rows={[{ name: 'Withheldwort', updatedBy: null, updatedAt: null }]}
          rowKey={(row) => row.name}
          empty="None"
        />,
      );

      expect(valueOf('Withheldwort').textContent).toBe(mark);
    });
  });

  it('says there are no rows in a status region, and draws no table', () => {
    render(<StackTable columns={columns} rows={[]} rowKey={(row) => row.name} empty="None" />);

    expect(screen.queryByRole('table')).toBeNull();
    expect(screen.getByRole('status')).toHaveTextContent('None');
  });
});
