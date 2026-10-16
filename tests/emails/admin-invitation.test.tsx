import { describe, expect, it } from 'vitest';
import { adminInvitationMessage } from '@/emails/admin-invitation';

// What the mail carries — its recipient and its link. Its wording and its
// design are the story's (src/emails/admin-invitation.stories.tsx).

const URL = 'http://localhost:8000/invite/fixture-token';

const INVITER = 'Fixture Owner';

const message = (siteRole: 'curator' | 'admin' = 'admin') =>
  adminInvitationMessage({
    to: 'someone@admin-invitation.test',
    url: URL,
    siteRole,
    inviterName: INVITER,
  });

describe('adminInvitationMessage', () => {
  it('addresses the mail and carries the link in both the html and the text', async () => {
    const mail = await message();

    expect(mail.to).toBe('someone@admin-invitation.test');
    expect(mail.html).toContain(`href="${URL}"`);
    expect(mail.text).toContain(URL);
    expect(mail.text).not.toMatch(/<[a-z]/i);
  });

  // A button, and the link written out beneath it for a client that hides buttons.
  it('gives the text part the link once, and the HTML two anchors carrying it', async () => {
    const { html, text } = await message();

    expect(text.split(URL)).toHaveLength(2);
    expect(html.split(`href="${URL}"`)).toHaveLength(3);
  });

  it('names the admin who sent it', async () => {
    const { text } = await message();

    expect(text).toContain(INVITER);
  });

  // M11.20: the role is the invitation's data, and the inbox shows it before
  // the mail is opened, so the two subjects differ.
  it('names the site role it grants, in the subject and the text', async () => {
    const curator = await message('curator');
    const admin = await message('admin');

    expect(curator.subject).not.toBe(admin.subject);
    expect(curator.text).toMatch(/become a curator/i);
    expect(admin.text).toMatch(/become an admin/i);
  });
});
