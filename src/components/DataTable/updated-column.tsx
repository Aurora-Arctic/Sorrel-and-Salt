import type { StackColumn, UpdatedStamp } from './types';

// The Updated column every audited list shares (MB.260): who last changed a
// row, and when. Written once so the coven's members and the admin's curated
// lists read alike (claude-docs/components/data-table.md).

/**
 * The Updated column for rows that carry a stamp. "by Fixture A on
 * 2026-10-12". Both halves are withheld together when either is missing: a
 * date with no one to ask about it says little. `className` styles the cell
 * where a list already styles its facts.
 */
export function updatedColumn<Row extends UpdatedStamp>(className?: string): StackColumn<Row> {
  return {
    heading: 'Updated',
    className,
    cell: ({ updatedBy, updatedAt }) =>
      updatedBy &&
      updatedAt && (
        <span>
          by <strong>{updatedBy}</strong> on{' '}
          <time dateTime={updatedAt.toISOString()}>{updatedAt.toISOString().slice(0, 10)}</time>
        </span>
      ),
  };
}
