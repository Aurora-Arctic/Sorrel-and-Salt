import type { ReactElement, ReactNode } from 'react';
import { PendingLink } from '../../lib/navigation';
import { stackCell, tableRole } from '../../lib/table-roles';
import EmptyState from '../EmptyState';
import Skeleton from '../Skeleton';
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
 * A sortable heading's arrow for the eye alone: up for ascending, down for descending, and an up-and-down pair for a column
 * not sorted by. One set of parts is drawn in every state, so a sort moves them rather than swapping a path: the pair's
 * upper chevron grows into the arrow's head and gains its stem, the lower chevron fades, and a flip turns the arrow over.
 */
function SortArrow({ current }: { current: ColumnSort['current'] }): ReactNode {
  return (
    <svg
      className={
        current === 'descending' ? 'data-table__sort-arrow is-descending' : 'data-table__sort-arrow'
      }
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      focusable="false"
    >
      <g className="data-table__sort-turn">
        <path className="data-table__sort-stem" d="M12 5v14" />
        <path className="data-table__sort-head" d="M5 12l7-7 7 7" />
      </g>
      <path className="data-table__sort-mate" d="M5 12l7 7 7-7" />
    </svg>
  );
}

function SortHeading({ heading, sort }: { heading: string; sort: ColumnSort }): ReactNode {
  const { current, href, labels } = sort;
  return (
    <PendingLink
      className={current ? 'data-table__sort-link is-sorted' : 'data-table__sort-link'}
      href={current === 'ascending' ? href.descending : href.ascending}
    >
      <span>{heading}</span>
      {current && <span className="visually-hidden">, Sorted {labels[current]}</span>}
      <SortArrow current={current} />
    </PendingLink>
  );
}

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
  emptyLabel,
  emptyAction,
  emptyQuiet,
  'aria-label': label,
  className,
  otherOrders,
  pendingRows,
  pendingKind,
}: StackTableProps<Row>): ReactElement {
  const pending = pendingRows !== undefined;
  if (!pending && !rows.length)
    return (
      <EmptyState size="compact" label={emptyLabel} action={emptyAction} quiet={emptyQuiet}>
        {empty}
      </EmptyState>
    );
  const shown = columns.filter((column): column is StackColumn<Row> => Boolean(column));
  const sorting = shown.some((column) => column.sort) && sortChoices(shown, otherOrders);
  return (
    <div className="data-table-frame">
      {/* Inside the frame, as the container query that shows it at phone width asks of the frame. */}
      {sorting && (
        <SortSelect choices={sorting.choices} current={sorting.current} disabled={pending} />
      )}
      <table
        aria-hidden={pending || undefined}
        className={[
          'data-table data-table--stack',
          pending &&
            `data-table--pending data-table--pending-${pendingKind ?? 'default'} skeleton-text`,
          className,
        ]
          .filter(Boolean)
          .join(' ')}
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
                ) : column.sort && !pending ? (
                  <SortHeading heading={column.heading} sort={column.sort} />
                ) : column.sort ? (
                  <span className="data-table__sort-link">
                    <span>{column.heading}</span>
                    <SortArrow current={undefined} />
                  </span>
                ) : (
                  column.heading
                )}
              </th>
            ))}
          </tr>
        </thead>
        <tbody {...tableRole('rowgroup')}>
          {pending
            ? Array.from({ length: pendingRows }, (_, at) => (
                <tr key={at} {...tableRole('row')}>
                  {/* At phone width the row is one block in the card's frame; the cells wait for the table. */}
                  <td className="card-skeleton__fill" aria-hidden="true" />
                  {shown.map((column) => (
                    <td
                      key={column.heading}
                      className={cellClass(column)}
                      {...stackCell(column.action ? '' : column.heading)}
                    >
                      {column.action ? (
                        <span
                          className="btn btn--small data-table__pending-action"
                          aria-hidden="true"
                        >
                          &nbsp;
                        </span>
                      ) : (
                        <Skeleton shape="line" quiet />
                      )}
                    </td>
                  ))}
                </tr>
              ))
            : rows.map((row) => (
                <tr key={rowKey(row)} {...tableRole('row')}>
                  {shown.map((column, at) => {
                    // An action's cell has no label: it spans the card, or stands at
                    // its top right beside the first line.
                    const cell = stackCell(column.action ? '' : column.heading);
                    // The first column names the row, so a screen reader moving down a column
                    // hears which row it is in.
                    return at === 0 ? (
                      <th
                        key={column.heading}
                        scope="row"
                        className={cellClass(column)}
                        {...cell}
                        {...tableRole('rowheader')}
                      >
                        {column.cell(row)}
                      </th>
                    ) : (
                      <td key={column.heading} className={cellClass(column)} {...cell}>
                        {column.cell(row)}
                      </td>
                    );
                  })}
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
