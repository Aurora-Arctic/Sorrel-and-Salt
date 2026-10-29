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
  // A button, and the link written out beneath it for a client that hides buttons.
  it('addresses the mail, with the link once in the text and in two HTML anchors', async () => {
    const mail = await message();

    expect(mail.to).toBe('someone@admin-invitation.test');
    expect(mail.text).not.toMatch(/<[a-z]/i);
    expect(mail.text.split(URL)).toHaveLength(2);
    expect(mail.html.split(`href="${URL}"`)).toHaveLength(3);
  });

  it('names the admin who sent it', async () => {
    const { text } = await message();

    expect(text).toContain(INVITER);
  });

  // The role is the invitation's data, and the inbox shows it before the mail is opened, so the two subjects differ.
  it('gives each site role its own subject', async () => {
    const curator = await message('curator');
    const admin = await message('admin');

    expect(curator.subject).not.toBe(admin.subject);
  });
});
