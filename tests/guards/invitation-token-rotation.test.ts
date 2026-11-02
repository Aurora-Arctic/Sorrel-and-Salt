import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, inject, it } from 'vitest';
import { REPO_ROOT } from '../support/paths';

// `rotateInvitationToken` writes an invitation with no Membership or SiteAdmin proof and returns a live token, so it is
// reachable only from the invitation mail: the repository file that defines it, the index that re-exports it, the
// service that builds the invitation mail inside the secret-link job's step, and its own test. Any other file naming it
// fails here, so a second caller is argued for in the diff (CLAUDE.md rule 5, the named exception).

const DEFINITION = 'src/db/repository/write.ts';
const ALLOWED = [
  DEFINITION,
  'src/db/repository/index.ts',
  'src/modules/identity/services/secret-link-mail.ts',
  'tests/db/repository/invitation-token-rotation.test.ts',
  'tests/guards/invitation-token-rotation.test.ts',
];

describe('the invitation token rotation', () => {
  it('is named only by its definition, the repository index, the invitation mail service and its own test', () => {
    const files = inject('repoFiles').filter(
      (file) => /\.[cm]?tsx?$/.test(file) && !file.includes('__lint-probe'),
    );
    // Precondition: the definition is in the listing, so an empty result means no other file.
    expect(files).toContain(DEFINITION);

    const naming = files.filter((file) =>
      /\brotateInvitationToken\b/.test(readFileSync(join(REPO_ROOT, file), 'utf8')),
    );

    expect(naming.sort()).toEqual([...ALLOWED].sort());
  });

  it('is called by the invitation mail service only for the two invitation kinds', () => {
    const service = readFileSync(join(REPO_ROOT, ALLOWED[2]!), 'utf8');
    // One call, so the service cannot rotate for a link of another kind.
    expect(service.match(/\brotateInvitationToken\(/g)).toHaveLength(1);
  });
});
