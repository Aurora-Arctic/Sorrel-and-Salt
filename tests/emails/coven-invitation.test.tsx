import { describe, expect, it } from 'vitest';
import { covenInvitationMessage } from '@/emails/coven-invitation';

// What the mail carries — its recipient, its coven and role, and its link. Its
// wording and its design are the story's (src/emails/coven-invitation.stories.tsx).

const URL = 'http://localhost:8000/invite/fixture-token';
const INPUT = {
  to: 'someone@coven-invitation.test',
  url: URL,
  covenName: 'Fixture Coven',
  role: 'viewer',
} as const;

describe('covenInvitationMessage', () => {
  it('addresses the mail and carries the link in both the html and the text', async () => {
    const message = await covenInvitationMessage(INPUT);

    expect(message.to).toBe(INPUT.to);
    expect(message.html).toContain(`href="${URL}"`);
    expect(message.text).toContain(URL);
    expect(message.text).not.toMatch(/<[a-z]/i);
  });

  // Story 4's acceptance test reads the token from the text part with this pattern.
  it('puts a token the acceptance pattern reads in the text part, once', async () => {
    const { text } = await covenInvitationMessage(INPUT);

    expect(text.match(/\/invite\/([A-Za-z0-9_-]+)/)?.[1]).toBe('fixture-token');
    expect(text.split(URL)).toHaveLength(2);
  });

  it('names the coven and the role it was invited into', async () => {
    const { text } = await covenInvitationMessage(INPUT);

    expect(text).toContain('Fixture Coven');
    expect(text).toContain('viewer');
  });
});
