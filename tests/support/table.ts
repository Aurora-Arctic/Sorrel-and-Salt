import { createElement } from 'react';
import { render, within } from '@testing-library/react';
import StackTable from '@/components/DataTable';
import { isBefore } from './interact';

// A body row's cells in column order: its row header, the first column, then its data cells.
export function rowCells(row: HTMLElement): HTMLElement[] {
  const cells = [...within(row).queryAllByRole('rowheader'), ...within(row).queryAllByRole('cell')];
  return cells.sort((a, b) => (isBefore(a, b) ? -1 : 1));
}

/** The text StackTable draws in a cell its column gave nothing, read from a one-cell table drawn and taken down again. */
export function emptyCellMark(): string {
  type Row = { name: string };
  const { container, unmount } = render(
    createElement(StackTable<Row>, {
      columns: [
        { heading: 'Name', cell: (row) => row.name },
        { heading: 'Note', cell: () => null },
      ],
      rows: [{ name: 'Testwort' }],
      rowKey: (row) => row.name,
      empty: 'None',
    }),
  );
  const mark = within(container).getByRole('cell').textContent ?? '';
  unmount();
  return mark;
}
