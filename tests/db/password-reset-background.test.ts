import { afterAll, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';
import postgres from 'postgres';
import { setupServer } from 'msw/node';
import { PROVIDER_CREDENTIALS } from '../support/oauth';
import { asTouch } from '../support/db/touch-row';
import { importAuth } from '../support/auth-module';
import { post, pwnedRange } from '../support/password';
import type { Message } from '@/lib/types';
import type { AuthInstance } from '../support/types';

// The reset mail runs after the answer, so the answer does not wait on the mail transport: a verified address,
// which is mailed, and any other, which is not, answer without the difference a send would make (DESIGN.md §8,
// "Passwords"). The background handler is replaced by one that only holds the task, and the send never settles
// until the test lets it: a request that awaited the send would never answer.

const send = vi.hoisted(() => vi.fn<(message: Message) => Promise<void>>());
vi.mock('@/lib/mail', () => ({ send }));

const held = vi.hoisted(() => [] as Promise<unknown>[]);
vi.mock('@/lib/background-tasks', () => ({
  runInBackground: (task: Promise<unknown>) => held.push(task),
  settleHeldTasks: async () => {},
}));

const DOMAIN = '@password-reset-background.test';
const OWNER = `owner${DOMAIN}`;

let sql: ReturnType<typeof postgres>;
beforeAll(() => {
  sql = postgres(process.env.DATABASE_URL as string, { onnotice: () => {} });
});
afterAll(async () => {
  await sql.end();
});

const server = setupServer(pwnedRange([], []));
beforeAll(() => server.listen({ onUnhandledFrame: 'error' }));
afterAll(() => server.close());

let auth: AuthInstance;
beforeAll(async () => {
  auth = await importAuth(PROVIDER_CREDENTIALS);
});

beforeEach(async () => {
  const mine = sql`select id from users where email like ${`%${DOMAIN}`}`;
  await sql`delete from workspace_members where user_id in (${mine})`;
  await sql`delete from sessions where user_id in (${mine})`;
  await sql`delete from accounts where user_id in (${mine})`;
  await sql`delete from users where email like ${`%${DOMAIN}`}`;
  await sql`delete from verifications where identifier like 'reset-password:%'`;
  send.mockReset();
  held.length = 0;
});

describe('Story 71: the reset mail runs after the answer', () => {
  it('answers a verified address before its mail is sent, then sends it in the background', async () => {
    const signUp = await post(auth, '/sign-up/email', {
      name: 'Fixture Person',
      email: OWNER,
      password: 'Testwort crowns the eastern hedge',
    });
    expect(signUp.status).toBe(200);
    await asTouch(sql, (tx) => tx`update users set email_verified = true where email = ${OWNER}`);
    // The sign-up's own verification mail is a background task too: let it finish before the reset is asked for.
    await Promise.allSettled(held);
    held.length = 0;
    send.mockReset();

    let release!: () => void;
    send.mockImplementation(() => new Promise<void>((resolve) => (release = resolve)));

    const response = await post(auth, '/request-password-reset', { email: OWNER });
    expect(response.status).toBe(200);

    // The mail is the one task handed off, and it is still running: the answer did not wait for it.
    expect(held).toHaveLength(1);
    let settled = false;
    void held[0].then(() => (settled = true));
    await vi.waitFor(() => expect(send).toHaveBeenCalledTimes(1));
    expect(send.mock.calls[0][0].to).toBe(OWNER);
    expect(settled).toBe(false);

    release();
    await held[0];
    expect(settled).toBe(true);
  });
});
