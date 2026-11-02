import type { ReactElement, ReactNode } from 'react';
import { PendingLink } from '../../lib/navigation';
import { stackCell, tableRole } from '../../lib/table-roles';
import { SortSelect } from './sort-select';
import type { ColumnSort, SortChoice, StackColumn, StackTableProps } from './types';

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

/**
 * A sortable heading: a link to the column's other direction when the list is sorted by it, and to its first direction when
 * not. Its name says the order in force, "Name, Sorted A to Z"; the arrow is for the eye alone.
 */
function SortHeading({ heading, sort }: { heading: string; sort: ColumnSort }): ReactNode {
  const { current, href, labels } = sort;
  return (
    <PendingLink
      className="data-table__sort-link"
      href={current === 'ascending' ? href.descending : href.ascending}
    >
      <span>{heading}</span>
      {current && (
        <>
          <span className="visually-hidden">, Sorted {labels[current]}</span>
          <span className="data-table__sort-arrow" aria-hidden="true">
            {current === 'ascending' ? '↑' : '↓'}
          </span>
        </>
      )}
    </PendingLink>
  );
}

/** The sort select's choices: the other orders first, then each sortable column both ways. */
function sortChoices<Row>(
  columns: readonly StackColumn<Row>[],
  others: StackTableProps<Row>['otherOrders'] = [],
): { choices: SortChoice[]; current: SortChoice['href'] | undefined } {
  const choices: SortChoice[] = others.map(({ label, href }) => ({ label, href }));
  let current = others.find((order) => order.current)?.href;
  for (const { heading, sort } of columns) {
    if (!sort) continue;
    for (const direction of ['ascending', 'descending'] as const) {
      choices.push({ label: `${heading}, ${sort.labels[direction]}`, href: sort.href[direction] });
      if (sort.current === direction) current = sort.href[direction];
    }
  }
  return { choices, current };
}

function StackTable<Row>({
  columns,
  rows,
  rowKey,
  empty,
  'aria-label': label,
  className,
  otherOrders,
}: StackTableProps<Row>): ReactElement {
  if (!rows.length) return <p>{empty}</p>;
  const shown = columns.filter((column): column is StackColumn<Row> => Boolean(column));
  const sorting = shown.some((column) => column.sort) && sortChoices(shown, otherOrders);
  return (
    <div className="data-table-frame">
      {/* Inside the frame, as the container query that shows it at phone width asks of the frame. */}
      {sorting && <SortSelect choices={sorting.choices} current={sorting.current} />}
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
                aria-sort={column.sort?.current}
                {...tableRole('columnheader')}
              >
                {column.hiddenHeading ? (
                  <span className="visually-hidden">{column.heading}</span>
                ) : column.sort ? (
                  <SortHeading heading={column.heading} sort={column.sort} />
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
