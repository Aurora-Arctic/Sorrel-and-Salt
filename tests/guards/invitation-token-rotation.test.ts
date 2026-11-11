import { describe, expect, it } from 'vitest';
import { expectNamedOnlyIn, readSource, sourceFiles } from '../support/repo-scan';

// `rotateInvitationToken` writes with no Membership or SiteAdmin proof and returns a live token, so only the invitation mail's callers may name it; a second one is argued for in the diff (CLAUDE.md rule 5).

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
    expectNamedOnlyIn(sourceFiles(), /\brotateInvitationToken\b/, ALLOWED, {
      definition: DEFINITION,
    });
  });

  it('is called by the invitation mail service only for the two invitation kinds', () => {
    const service = readSource(ALLOWED[2]!);
    // One call, so the service cannot rotate for a link of another kind.
    expect(service.match(/\brotateInvitationToken\(/g)).toHaveLength(1);
  });
});
