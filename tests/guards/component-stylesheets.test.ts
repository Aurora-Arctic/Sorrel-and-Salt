import { existsSync, readFileSync } from 'node:fs';
import { dirname, join, normalize } from 'node:path';
import { describe, expect, inject, it } from 'vitest';

// A page loads one stylesheet file for each distinct set of routes that use a sheet, so a component importing its own
// sheet splits a page into dozens of files. Every component sheet is `@use`d from src/scss/components.scss instead,
// which the root layout and Storybook import once.

const AGGREGATE = 'src/scss/components.scss';
const COMPONENT_SHEET = /^src\/(?:components|lib)\/.+\.scss$/;
const SCSS_IMPORT = /^import '([^']+\.scss)';$/gm;
const USE = /@(?:use|forward) '([^']+)'/g;

// Sass finds `x` as x.scss, _x.scss, x/index.scss or x/_index.scss; `@/` is the TypeScript alias for src.
function resolveSheet(from: string, spec: string): string | undefined {
  const base = (
    spec.startsWith('@/') ? join('src', spec.slice(2)) : normalize(join(dirname(from), spec))
  ).replace(/\.scss$/, '');
  const name = base.split('/').pop()!;
  const folder = dirname(base);
  return [
    `${base}.scss`,
    `${folder}/_${name}.scss`,
    `${base}/index.scss`,
    `${base}/_index.scss`,
  ].find((path) => existsSync(path));
}

function reachableFrom(entry: string): Set<string> {
  const seen = new Set<string>();
  const queue = [entry];
  while (queue.length > 0) {
    const file = queue.pop()!;
    if (seen.has(file)) continue;
    seen.add(file);
    for (const [, spec] of readFileSync(file, 'utf8').matchAll(USE)) {
      if (!spec!.startsWith('.')) continue;
      const target = resolveSheet(file, spec!);
      if (target) queue.push(target);
    }
  }
  return seen;
}

describe('component stylesheets', () => {
  const files = inject('repoFiles');
  const loaded = reachableFrom(AGGREGATE);

  it('loads every component stylesheet through the one aggregate', () => {
    const sheets = files.filter(
      (file) =>
        COMPONENT_SHEET.test(file) && !/(^|\/)_/.test(file) && !file.endsWith('.stories.scss'),
    );

    // Preconditions: the scan found the component sheets, and the aggregate reached most of them.
    expect(sheets.length).toBeGreaterThan(100);
    expect(loaded.size).toBeGreaterThan(100);
    expect(sheets.filter((sheet) => !loaded.has(sheet))).toEqual([]);
  });

  it('has no file importing a stylesheet the aggregate already loads', () => {
    const sources = files.filter((file) => /^(src|\.storybook)\/.+\.tsx?$/.test(file));
    const imports = sources.flatMap((file) =>
      [...readFileSync(file, 'utf8').matchAll(SCSS_IMPORT)].map(([, spec]) => ({
        file,
        sheet: resolveSheet(file, spec!),
      })),
    );

    // Preconditions: the scan resolves imports at all, and the layout still imports the aggregate.
    expect(imports.some(({ file }) => file === 'src/app/layout.tsx')).toBe(true);
    expect(imports.filter(({ sheet }) => sheet === undefined)).toEqual([]);
    expect(imports.filter(({ sheet }) => sheet !== AGGREGATE && loaded.has(sheet!))).toEqual([]);
  });
});
