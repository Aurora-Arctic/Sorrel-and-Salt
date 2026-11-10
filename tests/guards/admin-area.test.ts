import { describe, expect, it } from 'vitest';
import { filesMatching, sourceFiles } from '../support/repo-scan';

// The keepers and curator areas draw one admin layout and one user-dialog block, so a change to the area's frame, or to the
// impersonation and paused-changes rules the dialog carries, is made once.

const KEEPERS = 'src/app/(shell)/keepers/';
const CURATOR = 'src/app/(shell)/curator/';
const appFiles = () => sourceFiles({ under: 'src/app/' });

describe('the admin area layout', () => {
  it('is written in one file, outside either area’s folder, which both layouts use', () => {
    const files = appFiles();
    // Precondition: both area layouts are in the scan.
    expect(files).toContain(`${KEEPERS}layout.tsx`);
    expect(files).toContain(`${CURATOR}layout.tsx`);

    const frames = filesMatching(files, /\bregion="admin"/);
    expect(frames).toHaveLength(1);
    expect(frames[0].startsWith(KEEPERS) || frames[0].startsWith(CURATOR)).toBe(false);
  });
});

describe('the keepers user dialog', () => {
  it('is rendered by one src/app file, which the users, card sign-ups and support pages share', () => {
    const files = appFiles();
    expect(files).toContain(`${KEEPERS}(people)/users/page.tsx`);
    expect(files).toContain(`${KEEPERS}(invitations)/card-sign-ups/page.tsx`);
    expect(files).toContain(`${KEEPERS}support/page.tsx`);

    expect(filesMatching(files, /<UserDialog\b/)).toHaveLength(1);
  });
});
