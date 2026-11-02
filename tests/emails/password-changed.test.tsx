import { describe, expect, it } from 'vitest';
import { passwordChangedMessage } from '@/emails/password-changed';

// What the mail carries: its recipient and its link to reset the password. Its wording and design are the
// story's (src/emails/password-changed.stories.tsx).

const FORGOT = 'http://localhost:8000/forgot-password';

describe('passwordChangedMessage', () => {
  it.each(['reset', 'change', 'set'] as const)(
    'after a %s, addresses the account and carries the reset link, once in the text and twice in the HTML',
    async (how) => {
      const message = await passwordChangedMessage({
        to: 'someone@changed.test',
        url: FORGOT,
        how,
      });

      expect(message.to).toBe('someone@changed.test');
      expect(message.text.split(FORGOT)).toHaveLength(2);
      expect(message.html.split(`href="${FORGOT}"`)).toHaveLength(3);
      expect(message.text).not.toMatch(/<[a-z]/i);
    },
  );
});
