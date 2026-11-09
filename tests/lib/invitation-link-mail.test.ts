import { describe, expect, it } from 'vitest';
import { invitationLinkMessage } from '@/lib/invitation-link-mail';

// claude-docs/components/invitation-acceptance.md

const ORIGIN = 'http://localhost:8000';
const BASE = { to: 'someone@invitation-link.test', inviterName: 'Fixture Owner' };

describe('invitationLinkMessage', () => {
  // The marker is read signed out, before anything of the invitation is, so the page can lead with Create Account.
  it.each(['user', 'curator', 'admin'] as const)(
    'marks a site invitation link as one, for the %s role',
    async (siteRole) => {
      const { text } = await invitationLinkMessage(ORIGIN, 'tok', { ...BASE, siteRole });

      expect(text).toContain(`${ORIGIN}/invite/tok?for=site`);
    },
  );

  it('leaves a coven invitation link bare', async () => {
    const { text } = await invitationLinkMessage(ORIGIN, 'tok', {
      ...BASE,
      covenName: 'Testwort Coven',
      role: 'member',
    });

    expect(text).toContain(`${ORIGIN}/invite/tok`);
    expect(text).not.toContain(`${ORIGIN}/invite/tok?`);
  });
});
