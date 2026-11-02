import { describe, expect, it } from 'vitest';

import {
  closedIssueNumbers,
  idOfIssueTitle,
  idsNamedByMerge,
  missingIds,
} from '../../scripts/task-ids.mjs';

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

describe('the PR title check', () => {
  const body = 'Closes #10\nCloses #11\n\nfixes #12 and Refs #13';

  it('reads the issue numbers a body closes, not the ones it refers to', () => {
    expect(closedIssueNumbers(body)).toEqual([10, 11, 12]);
    expect(closedIssueNumbers(null)).toEqual([]);
  });

  it('reads the id an issue title opens with', () => {
    expect(idOfIssueTitle('M15.60 — A PR Names Every Task')).toBe('M15.60');
    expect(idOfIssueTitle('Not a task')).toBeNull();
  });

  it('fails a title that omits ids, naming each', () => {
    expect(
      missingIds({
        title: 'M15.32 — Support revision',
        headRef: 'feature/support-m15',
        ids: ['M15.32', 'M15.33', 'M15.49'],
      }),
    ).toEqual(['M15.33', 'M15.49']);
  });

  it('passes a title that opens with every id', () => {
    expect(
      missingIds({
        title: 'M15.32/M15.33 — Support revision',
        headRef: 'feature/support-m15',
        ids: ['M15.32', 'M15.33'],
      }),
    ).toEqual([]);
  });

  it('does not count an id that is only mentioned later in the title', () => {
    expect(
      missingIds({ title: 'Support revision (M15.33)', headRef: 'feature/x', ids: ['M15.33'] }),
    ).toEqual(['M15.33']);
  });

  it('passes a PR closing one task whose branch names it, with any title', () => {
    const pr = { title: 'Add the thing', headRef: 'feature/m15.60-pr-title', ids: ['M15.60'] };
    expect(missingIds(pr)).toEqual([]);
    expect(missingIds({ ...pr, headRef: 'feature/other-name' })).toEqual(['M15.60']);
    expect(missingIds({ ...pr, headRef: 'feature/m15.61-x' })).toEqual(['M15.60']);
  });

  it('still asks for every id when the branch names only one of several tasks', () => {
    expect(
      missingIds({ title: 'Add', headRef: 'feature/m15.60-x', ids: ['M15.60', 'M15.61'] }),
    ).toEqual(['M15.60', 'M15.61']);
  });
});
