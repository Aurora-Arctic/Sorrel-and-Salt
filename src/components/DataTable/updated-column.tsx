import type { StackColumn, UpdatedStamp } from './types';

// The Updated column every audited list shares: who last changed a row, and when
// (claude-docs/components/data-table.md).

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
