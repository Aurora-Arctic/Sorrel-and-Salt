import { describe, expect, it } from 'vitest';
import { fixCell } from '../../.github/scripts/lib/audit-fix.cjs';

// The "Fix available" cell of audit-comment.cjs's package table. npm's
// `fixAvailable` names whatever `npm audit fix --force` would install, which
// can be an older version than the one installed; the cell must not call that
// a fix.

const CODEGEN_DOWNGRADE = { name: '@graphql-codegen/cli', version: '3.2.0', isSemVerMajor: true };

describe('fixCell', () => {
  it('reports a suggested version older than the installed one as a downgrade, not a fix', () => {
    // The same object reads as a major fix without the installed version, so
    // the comparison, not the object's shape, is what turns it into a No.
    expect(fixCell(CODEGEN_DOWNGRADE)).toBe('Yes (@graphql-codegen/cli@3.2.0, major)');

    expect(fixCell(CODEGEN_DOWNGRADE, '7.4.4')).toBe(
      'No — downgrade only (@graphql-codegen/cli@3.2.0)',
    );
  });

  it('reports a newer suggested version as a fix, marking a major one', () => {
    expect(fixCell({ name: 'drizzle-kit', version: '1.2.0', isSemVerMajor: true }, '0.31.4')).toBe(
      'Yes (drizzle-kit@1.2.0, major)',
    );
    expect(fixCell({ name: 'next', version: '16.2.1', isSemVerMajor: false }, '16.2.0')).toBe(
      'Yes (next@16.2.1)',
    );
  });

  it('compares versions as semver, not as strings', () => {
    // '10.0.0' sorts before '9.0.0' as a string.
    expect(fixCell({ name: 'pkg', version: '10.0.0', isSemVerMajor: true }, '9.0.0')).toBe(
      'Yes (pkg@10.0.0, major)',
    );
  });

  it('answers the boolean forms directly', () => {
    expect(fixCell(true)).toBe('Yes');
    expect(fixCell(false)).toBe('No');
    expect(fixCell(undefined)).toBe('No');
  });
});
