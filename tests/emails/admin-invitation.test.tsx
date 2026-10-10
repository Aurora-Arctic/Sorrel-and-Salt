import { describe, expect, it } from 'vitest';
import { adminInvitationMessage } from '@/emails/admin-invitation';

const URL = 'http://localhost:8000/invite/fixture-token';

describe('adminInvitationMessage', () => {
  it('addresses the mail and carries the link in both the html and the text', async () => {
    const message = await adminInvitationMessage({ to: 'someone@admin-invitation.test', url: URL });

    expect(message.to).toBe('someone@admin-invitation.test');
    expect(message.subject).toBe('You Are Invited to Be a Sorrel & Salt Admin.');
    expect(message.html).toMatch(/<h1[^>]*>You Are Invited<\/h1>/);
    expect(message.html).toContain(`href="${URL}"`);
    expect(message.text).toContain(URL);
    expect(message.text).not.toMatch(/<[a-z]/i);
  });

  it('says what an admin does, how long the link lasts, and that an unexpected mail can be ignored', async () => {
    const { text } = await adminInvitationMessage({
      to: 'someone@admin-invitation.test',
      url: URL,
    });

    expect(text).toContain('invited this email address to become an admin');
    expect(text).toContain('open the link below within seven days');
    expect(text).toMatch(/sign in with an account that uses this email address/);
    expect(text).toMatch(/weren.t expecting this.*ignore this email/is);
  });

  it('gives the text part the link once, and the HTML a button with the link as a fallback', async () => {
    const { html, text } = await adminInvitationMessage({
      to: 'someone@admin-invitation.test',
      url: URL,
    });

    expect(text.split(URL)).toHaveLength(2);
    expect(html).toContain('click the button below within seven days');
    expect(html.split(`href="${URL}"`)).toHaveLength(3);
  });
});
