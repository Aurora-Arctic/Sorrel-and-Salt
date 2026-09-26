import { randomUUID } from 'node:crypto';
import { test, expect } from './fixtures';
import { latestMessageTo } from './mailpit';
import { send } from '@/lib/mail';

// The transport end to end against a real Mailpit, from the runner rather than
// the app: nothing in the app sends yet, and the stories that will (58, 59, 4,
// 62) follow their mailed links through the same helper.
test('a message sent through the mailpit transport is read back by address', async () => {
  expect(process.env.MAIL_TRANSPORT).toBe('mailpit');
  // Unique per run, so a retry or a parallel worker cannot read another's mail.
  const to = `mail-transport-${randomUUID()}@example.test`;

  await send({
    to,
    subject: 'Transport check',
    text: 'Follow https://example.test/verify?token=abc',
    html: '<p>Follow <a href="https://example.test/verify?token=abc">this link</a></p>',
  });

  const message = await latestMessageTo(to);
  expect(message.to).toEqual([to]);
  expect(message.subject).toBe('Transport check');
  expect(message.text).toContain('https://example.test/verify?token=abc');
  expect(message.html).toContain('href="https://example.test/verify?token=abc"');
});
