'use client';

import { arrayMove } from '@dnd-kit/sortable';
import type { ReactElement } from 'react';
import { graphql } from '@/lib/graphql-document';
import { graphqlRequest } from '../../lib/graphql-client';
import { usePendingNavigation } from '../../lib/navigation';
import { stackCell, tableRole } from '../../lib/table-roles';
import { useAnnounce } from '../ClickFeedback/status-region';
import EmptyState from '../EmptyState';
import Spinner from '../Spinner';
import { MoveFailedNotice, useOptimisticOrder } from './use-optimistic-order';
import { SortableColumn } from '@/lib/sortable/column';
import { useHelpSortableRow } from './sortable';
import type { HelpOrderColumn, HelpOrderList, HelpOrderRow } from './types';
import { cx } from '@/lib/class-names';

// A guide's sub pages, or the FAQ, as a stacking table with a grip on every row: a drop saves at once, in the whole
// order, the rows the filter leaves out among it. The markup is StackTable's, which takes server cell functions and
// so cannot hold the grips (claude-docs/components/help-outline.md, "Ordering").

const OrderHelpSubPagesDocument = graphql(`
  mutation OrderHelpSubPages($id: ID!, $input: HelpArticlePatch!) {
    updateHelpArticle(id: $id, input: $input) {
      id
    }
  }
`);

const OrderHelpFaqDocument = graphql(`
  mutation OrderHelpFaq($ids: [ID!]!) {
    orderHelpFaq(ids: $ids) {
      id
    }
  }
`);

const write = (list: HelpOrderList, ids: string[]) =>
  list.kind === 'faq'
    ? graphqlRequest(OrderHelpFaqDocument, { ids })
    : graphqlRequest(OrderHelpSubPagesDocument, { id: list.guideId, input: { childIds: ids } });

const cellClass = ({ className, corner }: HelpOrderColumn) =>
  cx(className, corner && 'data-table__card-action') || undefined;

const OrderRow = ({
  row,
  place,
  columns,
  busy,
  disabled,
}: {
  row: HelpOrderRow;
  place: number;
  columns: readonly HelpOrderColumn[];
  busy: boolean;
  disabled: boolean;
}): ReactElement => {
  const { setNodeRef, style, dragging, grip } = useHelpSortableRow(row.id, row.title, disabled);
  return (
    <tr
      ref={setNodeRef}
      style={style}
      className={dragging ? 'help-outline__order-row is-dragging' : 'help-outline__order-row'}
      {...tableRole('row')}
    >
      <td className="help-outline__grip-cell" {...stackCell('')}>
        {grip}
      </td>
      <td className="help-outline__number" aria-busy={busy || undefined} {...stackCell('Position')}>
        {busy ? <Spinner /> : place}
      </td>
      {columns.map((column, at) => {
        const cell = stackCell(column.corner ? '' : column.heading);
        return column.rowHeader ? (
          <th
            key={column.heading}
            scope="row"
            className={cellClass(column)}
            {...cell}
            {...tableRole('rowheader')}
          >
            {row.cells[at]}
          </th>
        ) : (
          <td key={column.heading} className={cellClass(column)} {...cell}>
            {row.cells[at]}
          </td>
        );
      })}
    </tr>
  );
};

const HelpOrderTable = ({
  'aria-label': label,
  list,
  order,
  columns,
  rows,
  empty,
}: {
  'aria-label': string;
  list: HelpOrderList;
  /** Every live row's id in order, whatever the filter: what a drop writes back whole. */
  order: readonly string[];
  columns: readonly HelpOrderColumn[];
  rows: readonly HelpOrderRow[];
  empty: string;
}): ReactElement => {
  const { refresh } = usePendingNavigation();
  const announce = useAnnounce();
  const {
    ids: shown,
    saving,
    failed,
    save,
  } = useOptimisticOrder(order, async (move) => {
    await write(list, move.to);
    announce(`Moved ${move.title} to position ${move.place}.`);
    refresh();
  });

  if (!rows.length) {
    return (
      <EmptyState size="compact" quiet>
        {empty}
      </EmptyState>
    );
  }

  const placeOf = new Map(shown.map((id, at) => [id, at]));
  const listed = [...rows].sort((a, b) => (placeOf.get(a.id) ?? 0) - (placeOf.get(b.id) ?? 0));

  const onMove = (from: number, to: number) => {
    const moving = listed[from];
    const over = listed[to];
    if (!moving || !over) return;
    const before = [...shown];
    const after = arrayMove(before, before.indexOf(moving.id), before.indexOf(over.id));
    void save({
      id: moving.id,
      title: moving.title,
      place: after.indexOf(moving.id) + 1,
      from: before,
      to: after,
    });
  };

  return (
    <>
      {failed && <MoveFailedNotice move={failed} onRetry={() => void save(failed)} />}
      {/* Round the table, not its body: dnd-kit draws its instructions in a div, which a table may not hold. */}
      <SortableColumn
        ids={listed.map((row) => row.id)}
        names={listed.map((row) => row.title)}
        onMove={onMove}
      >
        <div className="data-table-frame">
          <table
            className="data-table data-table--stack help-outline__order-table"
            aria-label={label}
            {...tableRole('table')}
          >
            <thead {...tableRole('rowgroup')}>
              <tr {...tableRole('row')}>
                <th scope="col" className="help-outline__grip-cell" {...tableRole('columnheader')}>
                  <span className="visually-hidden">Order</span>
                </th>
                <th scope="col" {...tableRole('columnheader')}>
                  Position
                </th>
                {columns.map((column) => (
                  <th
                    key={column.heading}
                    scope="col"
                    className={column.className}
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
              {listed.map((row) => (
                <OrderRow
                  key={row.id}
                  row={row}
                  place={(placeOf.get(row.id) ?? row.index) + 1}
                  columns={columns}
                  busy={saving === row.id}
                  disabled={saving !== undefined}
                />
              ))}
            </tbody>
          </table>
        </div>
      </SortableColumn>
    </>
  );
};

export default HelpOrderTable;
