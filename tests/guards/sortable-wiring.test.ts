import { execSync } from 'node:child_process';
import { describe, expect, it } from 'vitest';

// The dnd-kit sensors, keyboard target and announcements are wired once for a column of rows (SortableColumn) and once
// for the Combobox's wrapping chips, which lays its items out itself.
const importers = (symbol: string): string[] =>
  execSync(`grep -rlE "\\b${symbol}\\b" src --include=*.ts --include=*.tsx || true`, {
    encoding: 'utf8',
  })
    .split('\n')
    .filter((file) => file && !file.startsWith('src/lib/sortable/index.ts'))
    .sort();

describe('sortable wiring', () => {
  it.each(['useSortableSensors', 'useSortableAnnouncements', 'useKeyboardTarget'])(
    'uses %s only in SortableColumn and the Combobox list',
    (symbol) => {
      expect(importers(symbol)).toEqual([
        'src/components/Combobox/sortable.tsx',
        'src/lib/sortable/column.tsx',
      ]);
    },
  );
});
