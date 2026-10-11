import { describe, expect, it } from 'vitest';
import { adminInvitationMessage } from '@/emails/admin-invitation';

// What the mail carries — its recipient and its link. Its wording and its
// design are the story's (src/emails/admin-invitation.stories.tsx).

const URL = 'http://localhost:8000/invite/fixture-token';

describe('adminInvitationMessage', () => {
  it('addresses the mail and carries the link in both the html and the text', async () => {
    const message = await adminInvitationMessage({ to: 'someone@admin-invitation.test', url: URL });

    expect(message.to).toBe('someone@admin-invitation.test');
    expect(message.html).toContain(`href="${URL}"`);
    expect(message.text).toContain(URL);
    expect(message.text).not.toMatch(/<[a-z]/i);
  });

  // A button, and the link written out beneath it for a client that hides buttons.
  it('gives the text part the link once, and the HTML two anchors carrying it', async () => {
    const { html, text } = await adminInvitationMessage({
      to: 'someone@admin-invitation.test',
      url: URL,
    });

    expect(text.split(URL)).toHaveLength(2);
    expect(html.split(`href="${URL}"`)).toHaveLength(3);
  });
});
