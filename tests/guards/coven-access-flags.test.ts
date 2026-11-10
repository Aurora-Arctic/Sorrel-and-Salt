import { describe, expect, it } from 'vitest';
import { filesMatching, sourceFiles } from '../support/repo-scan';

// What a coven role may do on a page is read from `covenAccessOf`, so a flag and the statement its service asserts are
// paired once, and two pages cannot offer the same control on different statements. The help widget's permission table
// is the one other caller: it asks every role/action pair the policy declares, generically, not a page flag.

const DEFINITION = 'src/lib/coven-access.ts';
const ALLOWED = [DEFINITION, 'src/components/HelpWidget/role-permission-table.tsx'];

describe('coven role flags', () => {
  it('are computed from rolePermits only by covenAccessOf, outside the coven module', () => {
    const files = sourceFiles({ under: 'src/' }).filter((file) => !file.startsWith('src/modules/'));
    // Precondition: the definition and the pages that compute flags today are in the scan.
    expect(files).toContain(DEFINITION);
    expect(files).toContain('src/app/(shell)/coven/[slug]/layout.tsx');
    expect(files).toContain('src/lib/viewer.ts');

    expect(
      filesMatching(files, /\brolePermits\b/).filter((file) => !ALLOWED.includes(file)),
    ).toEqual([]);
  });
});
