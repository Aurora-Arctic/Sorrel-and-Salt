import { within } from '@testing-library/react';

// A body row's cells in column order: its row header, the first column, then its data cells.
export function rowCells(row: HTMLElement): HTMLElement[] {
  const cells = [...within(row).queryAllByRole('rowheader'), ...within(row).queryAllByRole('cell')];
  return cells.sort((a, b) =>
    a.compareDocumentPosition(b) & Node.DOCUMENT_POSITION_FOLLOWING ? -1 : 1,
  );
}
