import { describe, expect, it } from 'vitest';
import { BUDGET_MS, buildSlowestFilesSection } from '../../.github/scripts/lib/slowest-files.mjs';

// The slowest-files block summarize-vitest.mjs adds to the PR comment (MB.180):
// a warning that names the file to split, never a failure. Fed fixture results
// in Vitest's JSON reporter shape; nothing here reads a real run.

const ROOT = '/app';

function result(file: string, ms: number, tests: number) {
  return {
    name: `${ROOT}/${file}`,
    startTime: 1_000,
    endTime: 1_000 + ms,
    assertionResults: Array.from({ length: tests }, (_, i) => ({
      status: 'passed',
      title: `t${i}`,
    })),
  };
}

const RESULTS = [
  result('tests/guards/pagination.test.ts', 19, 5),
  result('tests/components/IngredientForm/index.test.tsx', 82_686, 257),
  result('tests/db/seed/standard.test.ts', 7_072, 26),
  result('tests/components/IngredientForm/references.test.tsx', 16_435, 39),
];

describe('buildSlowestFilesSection', () => {
  it('finds the over-budget files in the fixture before claiming anything about them', () => {
    // Precondition: the fixture really holds two files over the budget and two under it,
    // so an empty `over` would be the function's failure, not the fixture's.
    expect(RESULTS.filter((r) => r.endTime - r.startTime > BUDGET_MS)).toHaveLength(2);
    expect(RESULTS.filter((r) => r.endTime - r.startTime <= BUDGET_MS)).toHaveLength(2);

    const section = buildSlowestFilesSection(RESULTS, ROOT);

    expect(section?.over.map((row) => row.file)).toEqual([
      'tests/components/IngredientForm/index.test.tsx',
      'tests/components/IngredientForm/references.test.tsx',
    ]);
  });

  it('lists the files slowest first, relative to the repo, with their test counts and times', () => {
    const { block } = buildSlowestFilesSection(RESULTS, ROOT)!;

    expect(block).toContain('<details><summary>Slowest files — 2 over the 10.0 s budget</summary>');
    const rows = block.split('\n').filter((line) => line.startsWith('| ') && line.includes('`'));
    expect(rows).toEqual([
      '| ⚠ `tests/components/IngredientForm/index.test.tsx` | 257 | 82.7 s |',
      '| ⚠ `tests/components/IngredientForm/references.test.tsx` | 39 | 16.4 s |',
      '| `tests/db/seed/standard.test.ts` | 26 | 7.1 s |',
      '| `tests/guards/pagination.test.ts` | 5 | 19 ms |',
    ]);
  });

  it('points at the ownership doc, which says what to split a slow file along', () => {
    const { block } = buildSlowestFilesSection(RESULTS, ROOT)!;

    expect(block).toContain('claude-docs/testing/layer-ownership.md, "The file budget"');
  });

  it('says so when nothing is over budget, and still shows the slowest', () => {
    const under = RESULTS.filter((r) => r.endTime - r.startTime <= BUDGET_MS);

    const section = buildSlowestFilesSection(under, ROOT)!;

    expect(section.over).toEqual([]);
    expect(section.block).toContain('Slowest files — none over the 10.0 s budget');
    expect(section.block).toContain('| `tests/db/seed/standard.test.ts` | 26 | 7.1 s |');
    expect(section.block).not.toContain('⚠');
  });

  it('takes a budget of its own, so the threshold is not baked into the block', () => {
    const section = buildSlowestFilesSection(RESULTS, ROOT, { budgetMs: 100_000 })!;

    expect(section.over).toEqual([]);
    expect(section.block).toContain('none over the 100.0 s budget');
  });

  it('shows at most ten files', () => {
    const many = Array.from({ length: 14 }, (_, i) =>
      result(`tests/lib/f${i}.test.ts`, 100 + i, 1),
    );

    const { block } = buildSlowestFilesSection(many, ROOT)!;

    expect(block.split('\n').filter((line) => line.includes('.test.ts`'))).toHaveLength(10);
  });

  it('answers null for a run that wrote no file results, as the coverage section does', () => {
    expect(buildSlowestFilesSection([], ROOT)).toBeNull();
    expect(buildSlowestFilesSection(undefined, ROOT)).toBeNull();
  });
});
