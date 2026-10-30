import type { ReactElement } from 'react';
import { stackCell, tableRole } from '../../lib/table-roles';
import type { StackColumn, StackTableProps } from './types';

// The admin lists' table: the `.data-table` primitive in its scrolling frame, stacking into cards at
// phone width. It carries the explicit roles WebKit needs once `display` changes, and each cell's
// `data-label` (claude-docs/components/data-table.md). Render-only, so a server component's list stays one.

/** The cell's class: the column's own, then the card-corner placement for a corner action. */
function cellClass<Row>({ className, action }: StackColumn<Row>): string | undefined {
  return (
    [className, action === 'corner' && 'data-table__card-action'].filter(Boolean).join(' ') ||
    undefined
  );
}

function StackTable<Row>({
  columns,
  rows,
  rowKey,
  empty,
  'aria-label': label,
  className,
}: StackTableProps<Row>): ReactElement {
  if (!rows.length) return <p>{empty}</p>;
  const shown = columns.filter((column): column is StackColumn<Row> => Boolean(column));
  return (
    <div className="data-table-frame">
      <table
        className={['data-table data-table--stack', className].filter(Boolean).join(' ')}
        aria-label={label}
        {...tableRole('table')}
      >
        <thead {...tableRole('rowgroup')}>
          <tr {...tableRole('row')}>
            {shown.map((column) => (
              <th
                key={column.heading}
                scope="col"
                className={column.headingClassName}
                {...tableRole('columnheader')}
              >
                {column.hiddenHeading ? (
                  <span className="visually-hidden">{column.heading}</span>
                ) : (
                  column.heading
                )}
              </th>
            ))}
          </tr>
        </thead>
        <tbody {...tableRole('rowgroup')}>
          {rows.map((row) => (
            <tr key={rowKey(row)} {...tableRole('row')}>
              {shown.map((column) => (
                // An action's cell has no label: it spans the card, or stands at
                // its top right beside the first line.
                <td
                  key={column.heading}
                  className={cellClass(column)}
                  {...stackCell(column.action ? '' : column.heading)}
                >
                  {column.cell(row)}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

export default StackTable;
export { default as GroupChip } from './group-chip';
export { updatedColumn } from './updated-column';
