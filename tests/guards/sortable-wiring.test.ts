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

// Every list shows its Move Up and Move Down with no mode to turn on; only the Guides list keeps a Reorder Mode, one
// shared piece, ReorderMode, with its toggle in the same file. No file is excepted.
const REORDER_MODE = 'src/components/ReorderMode/index.tsx';

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

  it('keeps a ReorderMode only around the Guides list, every other list showing its Move buttons with no mode', () => {
    const modes = sources().filter((file) => file !== REORDER_MODE && rendersMode(file));
    // Precondition: the Guides list's mode is found, so an empty scan could not pass.
    expect(modes).toContain('src/components/HelpOutline/guides-bar.tsx');

    expect(modes).toEqual(['src/components/HelpOutline/guides-bar.tsx']);
  });

  it('gives every ReorderMode its ReorderToggle in the same file', () => {
    const modes = sources().filter((file) => file !== REORDER_MODE && rendersMode(file));
    // Precondition: the Guides list's mode is found.
    expect(modes).toContain('src/components/HelpOutline/guides-bar.tsx');

    const withoutToggle = modes.filter(
      (file) => !EXCEPTIONS.includes(file) && !/<ReorderToggle\b/.test(read(file)),
    );

    expect(withoutToggle).toEqual([]);
  });
});
