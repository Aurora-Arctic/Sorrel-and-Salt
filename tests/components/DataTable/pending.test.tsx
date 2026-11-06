import { render, screen, within } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import StackTable from '@/components/DataTable';

const columns = [
  { heading: 'Name', cell: (row: { name: string }) => row.name },
  {
    heading: 'Edit',
    hiddenHeading: true,
    action: 'corner' as const,
    cell: () => <a href="/x">Edit</a>,
  },
];

describe('StackTable pending rows', () => {
  it('draws the real headings over placeholder rows, hidden from assistive technology, with no row data or controls', () => {
    render(
      <StackTable
        columns={columns}
        rows={[]}
        rowKey={(r) => r.name}
        empty="None"
        pendingRows={3}
      />,
    );
    // Preconditions: the empty message would show if the table fell back to its rows.
    expect(screen.queryByText('None')).toBeNull();
    const table = document.querySelector('table');
    expect(table).toHaveAttribute('aria-hidden', 'true');
    expect(table!.querySelectorAll('tbody tr')).toHaveLength(3);
    expect(within(table!).getByText('Name')).toBeInTheDocument();
    expect(screen.queryByRole('link')).toBeNull();
  });

  it('draws the rows it is given when nothing is pending', () => {
    render(
      <StackTable
        columns={columns}
        rows={[{ name: 'Testwort' }]}
        rowKey={(r) => r.name}
        empty="None"
      />,
    );
    expect(screen.getByRole('cell', { name: 'Testwort' })).toBeInTheDocument();
    expect(document.querySelector('table')).not.toHaveAttribute('aria-hidden');
  });
});
