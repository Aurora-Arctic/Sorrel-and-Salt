import { describe, expect, it } from 'vitest';

import { idsNamedByMerge } from '../../scripts/task-ids.mjs';

describe('the ids a merge commit names', () => {
  it('counts every id in an id-first PR title written as the first body line', () => {
    const subject = 'Merge pull request #1453 from Aurora-Arctic/feature/support-m15';
    const body = 'M15.32/M15.33/M15.49 — Support revision\n\nCloses #1';
    expect(idsNamedByMerge(subject, body)).toEqual(['M15.32', 'M15.33', 'M15.49']);
  });

  it('ignores an id mid-sentence in the subject or the body', () => {
    expect(idsNamedByMerge('Fix the check M1.5 added', 'Rework what M2.6 did\n')).toEqual([]);
  });

  it('still reads the branch and an id-first subject', () => {
    expect(idsNamedByMerge('M2.4/M2.5 — OAuth', '')).toEqual(['M2.4', 'M2.5']);
    expect(idsNamedByMerge('Merge pull request #9 from o/feature/m2.6-build-x', '')).toEqual([
      'm2.6',
    ]);
  });
});
