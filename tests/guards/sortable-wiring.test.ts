import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, inject, it } from 'vitest';
import { REPO_ROOT } from '../support/paths';

// The dnd-kit sensors, keyboard target and announcements are wired once for a column of rows (SortableColumn) and once
// for the Combobox's wrapping chips, which lays its items out itself.

const ALLOWED = ['src/components/Combobox/sortable.tsx', 'src/lib/sortable/column.tsx'];

const sources = () =>
  inject('repoFiles').filter(
    (file) => /^src\/.*\.tsx?$/.test(file) && file !== 'src/lib/sortable/index.ts',
  );

describe('sortable wiring', () => {
  it.each(['useSortableSensors', 'useSortableAnnouncements', 'useKeyboardTarget'])(
    'uses %s only in SortableColumn and the Combobox list',
    (symbol) => {
      const files = sources();
      // Precondition: the allowed users are in the listing, so an empty result could not pass.
      expect(files).toEqual(expect.arrayContaining(ALLOWED));

      const pattern = new RegExp(`\\b${symbol}\\b`);
      const users = files.filter((file) =>
        pattern.test(readFileSync(join(REPO_ROOT, file), 'utf8')),
      );

      expect(users.sort()).toEqual(ALLOWED);
    },
  );
});
