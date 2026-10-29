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
  inviterName: 'Fixture Owner',
} as const;

describe('covenInvitationMessage', () => {
  // The invitation's acceptance test reads the token from the text part with this pattern.
  it('puts a token the acceptance pattern reads in the text part, once, and addresses the mail', async () => {
    const message = await covenInvitationMessage(INPUT);

    expect(message.to).toBe(INPUT.to);
    expect(message.html).toContain(`href="${URL}"`);
    expect(message.text).not.toMatch(/<[a-z]/i);
    expect(message.text.match(/\/invite\/([A-Za-z0-9_-]+)/)?.[1]).toBe('fixture-token');
    expect(message.text.split(URL)).toHaveLength(2);
  });

  it('names the coven and the role it was invited into', async () => {
    const { text } = await covenInvitationMessage(INPUT);

    expect(text).toContain('Fixture Coven');
    expect(text).toContain('viewer');
  });

  it('names the owner who sent it', async () => {
    const { text } = await covenInvitationMessage(INPUT);

    expect(text).toContain(INPUT.inviterName);
  });

  // The inbox list shows only the subject, so it says which coven.
  it('carries the coven name in the subject', async () => {
    const { subject } = await covenInvitationMessage(INPUT);

    expect(subject).toContain('Fixture Coven');
  });
});
