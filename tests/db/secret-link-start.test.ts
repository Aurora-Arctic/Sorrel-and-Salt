import { afterAll, afterEach, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';
import postgres from 'postgres';
import { setupServer } from 'msw/node';
import { PROVIDER_CREDENTIALS } from '../support/oauth';
import { asTouch } from '../support/db/touch-row';
import { importAuth } from '../support/auth-module';
import { post, pwnedRange } from '../support/password';
import type { Message } from '@/lib/types';
import type { AuthInstance } from '../support/types';

// Where Better Auth's endpoints hand a secret-link mail to its job: the run is started with ids and the auth base, and never
// the address, the token or the link. The run itself is tests/workflows/secret-link-mail.test.ts.

const send = vi.hoisted(() => vi.fn<(message: Message) => Promise<void>>());
vi.mock('@/lib/mail', () => ({ send }));
const startJob = vi.hoisted(() => vi.fn(async (..._args: unknown[]) => 'run-id'));
vi.mock('@/lib/jobs', () => ({ startJob, jobTokenActive: async () => false }));
vi.stubEnv('MAIL_TRANSPORT', 'mailpit');

const DOMAIN = '@secret-link-start.test';
const OWNER = `owner${DOMAIN}`;
const RIGHT = 'Testwort crowns the eastern hedge';
const WRONG = 'Testwort climbs the western wall';

let sql: ReturnType<typeof postgres>;
beforeAll(() => {
  sql = postgres(process.env.DATABASE_URL as string, { onnotice: () => {} });
});
afterAll(async () => {
  await sql.end();
});

const server = setupServer(pwnedRange([], []));
beforeAll(() => server.listen({ onUnhandledFrame: 'error' }));
afterEach(() => server.resetHandlers());
afterAll(() => server.close());

let auth: AuthInstance;
beforeAll(async () => {
  auth = await importAuth(PROVIDER_CREDENTIALS);
});

beforeEach(async () => {
  const mine = sql`select id from users where email like ${`%${DOMAIN}`}`;
  await sql`delete from sign_in_failures where user_id in (${mine})`;
  await sql`delete from workspace_members where user_id in (${mine})`;
  await sql`delete from sessions where user_id in (${mine})`;
  await sql`delete from accounts where user_id in (${mine})`;
  await sql`delete from users where email like ${`%${DOMAIN}`}`;
  await sql`delete from verifications where identifier like 'reset-password:%'`;
  send.mockReset();
  startJob.mockClear();
});

const userId = async () =>
  (await sql`select id from users where email = ${OWNER}`)[0]!.id as string;

/** The secret-link runs started so far: each run's one argument. */
async function secretLinkRuns(): Promise<Record<string, unknown>[]> {
  const { secretLinkMail } = await import('@/modules/identity/jobs/secret-link-mail');
  return startJob.mock.calls
    .filter(([job]) => job === secretLinkMail)
    .map(([, args]) => (args as [Record<string, unknown>])[0]);
}

/** The reset tokens Better Auth holds for the account. */
const resetTokens = async (id: string) =>
  (
    await sql`select identifier from verifications where value = ${id} and identifier like 'reset-password:%'`
  ).map((row) => String(row.identifier).slice('reset-password:'.length));

async function signUp() {
  const response = await post(auth, '/sign-up/email', {
    name: 'Fixture Person',
    email: OWNER,
    password: RIGHT,
  });
  expect(response.status, await response.clone().text()).toBe(200);
}

describe('a secret-link mail starts its job with ids alone', () => {
  it('starts the sign-up verification mail with the account id and no address', async () => {
    await signUp();

    const runs = await secretLinkRuns();
    expect(runs).toEqual([
      { kind: 'verification', userId: await userId(), authBase: expect.any(String), next: '/' },
    ]);
    expect(JSON.stringify(runs)).not.toContain(DOMAIN);
    // Nothing was tried directly, so the run is the only way the mail goes.
    expect(send).not.toHaveBeenCalled();
  });

  it('starts the reset mail with the account id, and the token Better Auth stored is not in it', async () => {
    await signUp();
    await asTouch(sql, (tx) => tx`update users set email_verified = true where email = ${OWNER}`);
    startJob.mockClear();

    expect((await post(auth, '/request-password-reset', { email: OWNER })).status).toBe(200);

    const id = await userId();
    const runs = await secretLinkRuns();
    expect(runs).toEqual([{ kind: 'reset', userId: id, authBase: expect.any(String) }]);
    const [token] = await resetTokens(id);
    // Precondition: a token exists, so its absence from the run is meaningful.
    expect(token).toBeTruthy();
    expect(JSON.stringify(runs)).not.toContain(token);
    expect(JSON.stringify(runs)).not.toContain(DOMAIN);
  });

  it('starts the lockout mail with the account id and the lock length, and no token', async () => {
    await signUp();
    await asTouch(sql, (tx) => tx`update users set email_verified = true where email = ${OWNER}`);
    const id = await userId();
    await sql`insert into sign_in_failures (user_id, count) values (${id}, 4)`;
    startJob.mockClear();

    expect((await post(auth, '/sign-in/email', { email: OWNER, password: WRONG })).status).toBe(
      401,
    );

    const runs = await secretLinkRuns();
    expect(runs).toEqual([
      { kind: 'lockout', userId: id, authBase: expect.any(String), minutes: 1 },
    ]);
    const [token] = await resetTokens(id);
    expect(token).toBeTruthy();
    expect(JSON.stringify(runs)).not.toContain(token);
  });

  it('tries the mail once itself when the run cannot be started', async () => {
    const errors = vi.spyOn(console, 'error').mockImplementation(() => undefined);
    const { secretLinkMail } = await import('@/modules/identity/jobs/secret-link-mail');
    // Only this mail's run is refused: sign-up starts other jobs too.
    startJob.mockImplementation(async (job) => {
      if (job === secretLinkMail) throw new Error('queue down');
      return 'run-id';
    });

    await signUp();

    // The mail is sent after the answer, so the test waits for it.
    await vi.waitFor(() => expect(send).toHaveBeenCalledTimes(1));
    expect(send.mock.calls[0]![0].to).toBe(OWNER);
    startJob.mockImplementation(async () => 'run-id');
    errors.mockRestore();
  });
});
