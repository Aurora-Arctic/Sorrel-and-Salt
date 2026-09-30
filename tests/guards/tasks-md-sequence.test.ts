import { existsSync, readFileSync, readdirSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

import { TASKS_FILES, WAVE_ROW, loadTasksMd } from '../../scripts/tasks-md.mjs';
import { fromRoot } from '../support/paths';

// The breakdown is one document read across several files: TASKS.md's table,
// then the milestone sections under claude-docs/tasks/ in the order
// `TASKS_FILES` declares, since a range like `M3.3 → M3.10` means the headings
// between its ends in that order (claude-docs/task-tracking.md, "Order"). A
// file added to the directory but not to the sequence is read by nothing, so
// its tasks are unpriced and outside every range without a single failure.

const TASKS_DIR = 'claude-docs/tasks';
const WAVES_DIR = 'claude-docs/waves';

function markdownIn(dir: string): string[] {
  return readdirSync(fromRoot(dir))
    .filter((file) => file.endsWith('.md'))
    .map((file) => `${dir}/${file}`)
    .sort();
}

describe('MB.143: the breakdown is read through one declared file sequence', () => {
  it('opens with TASKS.md, whose execution-order table the ranges come from', () => {
    expect(TASKS_FILES[0]).toBe('claude-docs/TASKS.md');
  });

  it('names every file in claude-docs/tasks/, and no file that is not there', () => {
    const onDisk = markdownIn(TASKS_DIR);
    // Precondition: an empty directory would match an empty sequence.
    expect(onDisk.length).toBeGreaterThan(10);

    const sequenced = TASKS_FILES.filter((path) => path.startsWith(`${TASKS_DIR}/`)).sort();

    expect(sequenced).toEqual(onDisk);
    expect(TASKS_FILES.filter((path) => !existsSync(fromRoot(path)))).toEqual([]);
  });

  it('resolves every range in the execution-order table against a heading', () => {
    const tasks = loadTasksMd();
    // Precondition: a sequence that read nothing would resolve nothing and
    // report nothing.
    expect(tasks.order.length).toBeGreaterThan(300);
    expect(tasks.waves.length).toBeGreaterThan(10);

    const headings = new Set(tasks.order);
    const unknown = tasks.waves.flatMap((wave) =>
      wave.ids.filter((id) => !headings.has(id)).map((id) => `Wave ${wave.number}: ${id}`),
    );

    expect(tasks.unresolved).toEqual([]);
    expect(unknown).toEqual([]);
  });

  it('links each wave row to a file in claude-docs/waves/, and every file there to a row', () => {
    const rows = readFileSync(fromRoot('claude-docs/TASKS.md'), 'utf8')
      .split('\n')
      .filter((line) => WAVE_ROW.test(line));
    expect(rows.length).toBeGreaterThan(10);

    const linked = rows.map((row) => {
      const link = /\]\((waves\/wave-\d{2}\.md)\)/.exec(row);
      return link ? `claude-docs/${link[1]}` : `no wave link: ${row.slice(0, 40)}`;
    });

    expect(linked.sort()).toEqual(markdownIn(WAVES_DIR));
  });
});
