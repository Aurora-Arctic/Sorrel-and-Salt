import { readFileSync } from 'node:fs';
import { join, posix } from 'node:path';
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

// A sortable item is moved through the one shared handle, GripHandle, which offers the drag, the keyboard and the
// single-press Move Up and Move Down; a hand-made handle would offer the drag alone. No file is excepted.
const GRIP_HANDLE = 'src/components/GripHandle/index.tsx';
const EXCEPTIONS: string[] = [];
const read = (file: string) => readFileSync(join(REPO_ROOT, file), 'utf8');

/** The listed sources `file` imports by a relative path. */
function importedFiles(file: string, files: string[]): string[] {
  const paths = [...read(file).matchAll(/from '(\.{1,2}\/[^']+)'/g)].map((match) =>
    posix.join(posix.dirname(file), match[1]),
  );
  return files.filter((listed) =>
    paths.some((path) => [`${path}.tsx`, `${path}.ts`, `${path}/index.tsx`].includes(listed)),
  );
}

describe('sortable handles', () => {
  it('lets only GripHandle spread dnd-kit’s listeners onto a handle', () => {
    const spreads = /setActivatorNodeRef|\{\s*\.\.\.(?:\w+\.)?listeners\s*\}/;
    // Precondition: the scan finds the shared handle's own spread, so an empty result could not pass.
    expect(spreads.test(read(GRIP_HANDLE))).toBe(true);

    const handMade = sources().filter(
      (file) => file !== GRIP_HANDLE && !EXCEPTIONS.includes(file) && spreads.test(read(file)),
    );

    expect(handMade).toEqual([]);
  });

  it('hands every useSortable item to a GripHandle, in its own file or the one it renders the item with', () => {
    const files = sources();
    const sortables = files.filter((file) => /\buseSortable\(/.test(read(file)));
    // Precondition: the three sortable lists are found.
    expect(sortables).toEqual(
      expect.arrayContaining([
        'src/components/Combobox/sortable.tsx',
        'src/components/HelpOutline/sortable.tsx',
        'src/components/SpellBuilder/steps/step-row.tsx',
      ]),
    );

    const rendersGrip = (file: string) => /<GripHandle\b[^>]*?\bsortable=/s.test(read(file));
    const withoutGrip = sortables.filter(
      (file) =>
        !EXCEPTIONS.includes(file) &&
        !rendersGrip(file) &&
        !(/\bsortable=\{/.test(read(file)) && importedFiles(file, files).some(rendersGrip)),
    );

    expect(withoutGrip).toEqual([]);
  });
});

// Move Up and Move Down show only while a list's Reorder toggle is on. The mode is one shared piece, ReorderMode: a
// list's state, its toggle, and `useReorderMode`, which reads off outside a ReorderMode, so no list shows the buttons
// unconditionally. No file is excepted.
const REORDER_MODE = 'src/components/ReorderMode/index.tsx';
const COMBOBOX = 'src/components/Combobox/index.tsx';

/** The listed sources that import `file`, by a relative path or the `@/` alias. */
function importersOf(file: string, files: string[]): string[] {
  const resolves = (path: string) =>
    [`${path}.tsx`, `${path}.ts`, `${path}/index.tsx`].includes(file);
  return files.filter(
    (other) =>
      other !== file &&
      (importedFiles(other, files).includes(file) ||
        [...read(other).matchAll(/from '@\/([^']+)'/g)].some((match) =>
          resolves(`src/${match[1]}`),
        )),
  );
}

describe('reorder mode', () => {
  const rendersMode = (file: string) => /<ReorderMode\b/.test(read(file));

  it('draws Move Up and Move Down only in GripHandle', () => {
    const named = /['"`]Move (?:Up|Down)['"`]|grip-handle__move/;
    // Precondition: the scan finds the shared handle's own buttons, so an empty result could not pass.
    expect(named.test(read(GRIP_HANDLE))).toBe(true);

    const elsewhere = sources().filter(
      (file) => file !== GRIP_HANDLE && !EXCEPTIONS.includes(file) && named.test(read(file)),
    );

    expect(elsewhere).toEqual([]);
  });

  it('has GripHandle draw them only while its list’s reorder mode is on', () => {
    const handle = read(GRIP_HANDLE);

    expect(sources()).toContain(REORDER_MODE);
    expect(handle).toMatch(/\buseReorderMode\(/);
    expect(handle).toMatch(/\breordering\s*&&/);
  });

  it('puts every sortable list inside a ReorderMode, in its own file or one that imports it', () => {
    const files = sources();
    const lists = files.filter(
      (file) =>
        !file.endsWith('.stories.tsx') &&
        /<(?:SortableColumn|ComboboxSortableEntries|LazySortableEntries)\b/.test(read(file)),
    );
    // Precondition: the three lists' wirings are found.
    expect(lists).toEqual(
      expect.arrayContaining([
        'src/components/HelpOutline/guides-bar.tsx',
        'src/components/HelpOutline/order-table.tsx',
        'src/components/SpellBuilder/steps/sortable.tsx',
        'src/components/IngredientForm/fields.tsx',
      ]),
    );

    // An ordered combobox's chips are handed to the Combobox, which draws the label and so holds the mode.
    const handedToCombobox = (file: string) =>
      /<(?:ComboboxSortableEntries|LazySortableEntries)\b/.test(read(file)) &&
      /<Combobox\b/.test(read(file)) &&
      rendersMode(COMBOBOX);
    const outside = lists.filter(
      (file) =>
        !EXCEPTIONS.includes(file) &&
        !rendersMode(file) &&
        !handedToCombobox(file) &&
        !importersOf(file, files).some(rendersMode),
    );

    expect(outside).toEqual([]);
  });

  it('gives every ReorderMode its ReorderToggle in the same file', () => {
    const modes = sources().filter((file) => file !== REORDER_MODE && rendersMode(file));
    // Precondition: the three lists' modes are found.
    expect(modes).toEqual(
      expect.arrayContaining([
        'src/components/HelpOutline/guides-bar.tsx',
        'src/components/SpellBuilder/steps/index.tsx',
        COMBOBOX,
      ]),
    );

    const withoutToggle = modes.filter(
      (file) => !EXCEPTIONS.includes(file) && !/<ReorderToggle\b/.test(read(file)),
    );

    expect(withoutToggle).toEqual([]);
  });
});
