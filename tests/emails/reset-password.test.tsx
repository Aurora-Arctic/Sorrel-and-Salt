import { describe, expect, it } from 'vitest';
import { resetPasswordMessage } from '@/emails/reset-password';

// What the mail carries: its recipient and its reset link. Its wording and design are the story's
// (src/emails/reset-password.stories.tsx).

const LINK = 'http://localhost:8000/api/auth/reset-password/token123?callbackURL=%2Freset-password';

describe('resetPasswordMessage', () => {
  it('addresses the account and carries the reset link, once in the text and twice in the HTML', async () => {
    const message = await resetPasswordMessage({ to: 'someone@reset.test', url: LINK });

    expect(message.to).toBe('someone@reset.test');
    expect(message.text.split(LINK)).toHaveLength(2);
    expect(message.html.split(`href="${LINK}"`)).toHaveLength(3);
    expect(message.text).not.toMatch(/<[a-z]/i);
  });
});
