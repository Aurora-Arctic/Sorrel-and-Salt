import { describe, expect, it } from 'vitest';
import { invitationLinkPath, invitationTokenFromPath } from '@/lib/invitation-link';

describe('invitationTokenFromPath', () => {
  it('gives the token of an invitation path', () => {
    expect(invitationTokenFromPath('/invite/testwort-token')).toBe('testwort-token');
  });

  it('reads back the token of the path a coven invitation mails', () => {
    expect(invitationTokenFromPath(invitationLinkPath('testwort-token', false))).toBe(
      'testwort-token',
    );
  });

  it.each([
    '/invite/',
    '/invite',
    '/invite/testwort-token/more',
    '/invite/testwort-token?for=site',
    '/invite/testwort-token#top',
    '/invites/testwort-token',
    '/coven/invite/testwort-token',
    'https://example.com/invite/testwort-token',
    '',
  ])('gives null for %j, which is not one segment after /invite/', (path) => {
    expect(invitationTokenFromPath(path)).toBeNull();
  });
});
