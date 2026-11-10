import { afterAll, afterEach, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';
import postgres from 'postgres';
import { setupServer } from 'msw/node';
import { PROVIDER_CREDENTIALS, cookieHeader } from '../support/oauth';
import { asTouch } from '../support/db/touch-row';
import { importAuth } from '../support/auth-module';
import { post, pwnedRange } from '../support/password';
import type { Message } from '@/lib/types';
import { placeholderEmail } from '@/modules/identity';
import type { AuthInstance } from '../support/types';
import { useTestDatabase } from '../support/db/database';
import { send } from '../support/mail';
import { ORIGIN } from '../support/constants';

// The run is started with ids and an origin, never the address, the token or the link.
vi.mock('@/lib/mail', () => import('../support/mail'));
const delivered = vi.hoisted(() => [] as Message[]);
vi.mock('@/lib/mail-transport', () => ({
  deliver: async (message: Message) => {
    delivered.push(message);
    return true;
  },
}));
const startJob = vi.hoisted(() => vi.fn(async (..._args: unknown[]) => 'run-id'));
vi.mock('@/lib/jobs', () => ({ startJob, jobTokenActive: async () => false }));
vi.stubEnv('MAIL_TRANSPORT', 'mailpit');

const DOMAIN = '@secret-link-start.test';
const OWNER = `owner${DOMAIN}`;
const RIGHT = 'Testwort crowns the eastern hedge';
const WRONG = 'Testwort climbs the western wall';

let sql: ReturnType<typeof postgres>;

useTestDatabase((client) => {
  sql = client;
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

async function secretLinkRuns(): Promise<Record<string, unknown>[]> {
  const { secretLinkMail } = await import('@/modules/identity/jobs/secret-link-mail');
  return startJob.mock.calls
    .filter(([job]) => job === secretLinkMail)
    .map(([, args]) => (args as [Record<string, unknown>])[0]);
}

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

async function accountNoticeRuns(): Promise<Record<string, unknown>[]> {
  const { accountNoticeMail } = await import('@/modules/identity/jobs/account-notice-mail');
  return startJob.mock.calls
    .filter(([job]) => job === accountNoticeMail)
    .map(([, args]) => (args as [Record<string, unknown>])[0]);
}

async function noticeFor(run: Record<string, unknown>): Promise<Message | null> {
  const { accountNoticeStep } = await import('@/modules/identity/jobs/account-notice-mail-steps');
  delivered.length = 0;
  await accountNoticeStep(run as Parameters<typeof accountNoticeStep>[0]);
  return delivered[0] ?? null;
}

describe('an account notice starts its job with ids alone', () => {
  it('starts the account-exists mail for a sign-up at a held address with the holder id, and its step names the ways in', async () => {
    await signUp();
    startJob.mockClear();

    await signUp();

    const runs = await accountNoticeRuns();
    expect(runs).toEqual([
      { kind: 'account-exists', userId: await userId(), origin: expect.any(String) },
    ]);
    expect(JSON.stringify(runs)).not.toContain(DOMAIN);
    const message = await noticeFor(runs[0]!);
    expect(message!.to).toBe(OWNER);
    expect(message!.text).toContain('/sign-in');
    expect(send).not.toHaveBeenCalled();
  });

  it('starts the password-changed mail for a change with the account id and how, and its step mails the account', async () => {
    await signUp();
    await asTouch(sql, (tx) => tx`update users set email_verified = true where email = ${OWNER}`);
    const signedIn = await post(auth, '/sign-in/email', { email: OWNER, password: RIGHT });
    expect(signedIn.status).toBe(200);
    startJob.mockClear();

    const changed = await post(
      auth,
      '/change-password',
      { currentPassword: RIGHT, newPassword: WRONG },
      cookieHeader(signedIn),
    );
    expect(changed.status, await changed.clone().text()).toBe(200);

    const runs = await accountNoticeRuns();
    expect(runs).toEqual([
      {
        kind: 'password-changed',
        userId: await userId(),
        origin: expect.any(String),
        how: 'change',
      },
    ]);
    expect(JSON.stringify(runs)).not.toContain(DOMAIN);
    const message = await noticeFor(runs[0]!);
    expect(message!.to).toBe(OWNER);
    expect(message!.text).toContain('/forgot-password');
  });

  it('reads the address when it sends, so a notice for a placeholder address sends nothing', async () => {
    await signUp();
    const id = await userId();
    // Precondition: with the row's real address, the step has a mail to send.
    expect(
      await noticeFor({
        kind: 'password-changed',
        userId: id,
        origin: 'http://x.test',
        how: 'set',
      }),
    ).not.toBeNull();
    await asTouch(
      sql,
      (tx) => tx`update users set email = ${placeholderEmail('github', id)} where id = ${id}`,
    );

    const notice = await noticeFor({
      kind: 'password-changed',
      userId: id,
      origin: 'http://x.test',
      how: 'set',
    });
    await asTouch(sql, (tx) => tx`update users set email = ${OWNER} where id = ${id}`);
    expect(notice).toBeNull();
  });
});

describe('the notice to the address a completed change left', () => {
  const NEW = `new${DOMAIN}`;
  const NEWER = `newer${DOMAIN}`;
  const OTHER = `other${DOMAIN}`;

  const formerOf = async (id: string) =>
    (await sql`select email, former_email, updated_by from users where id = ${id}`)[0]!;

  async function signedIn(email: string): Promise<{ id: string; cookie: string }> {
    const up = await post(auth, '/sign-up/email', {
      name: 'Fixture Person',
      email,
      password: RIGHT,
    });
    expect(up.status, await up.clone().text()).toBe(200);
    await asTouch(sql, (tx) => tx`update users set email_verified = true where email = ${email}`);
    const response = await post(auth, '/sign-in/email', { email, password: RIGHT });
    expect(response.status).toBe(200);
    const id = (await sql`select id from users where email = ${email}`)[0]!.id as string;
    return { id, cookie: cookieHeader(response) };
  }

  async function completeChange(id: string, cookie: string, address: string): Promise<Response> {
    await asTouch(
      sql,
      (tx) =>
        tx`update users set pending_email = ${address}, verification_sent_at = now() where id = ${id}`,
    );
    startJob.mockClear();
    const { emailVerificationSender } = await import('@/lib/email-verification');
    const request = new Request(`${ORIGIN}/api/graphql`, { headers: { cookie } });
    await emailVerificationSender(request).requestChange(id);
    const [run] = await secretLinkRuns();
    const { changeLinkStep } = await import('@/modules/identity/jobs/secret-link-mail-steps');
    delivered.length = 0;
    await changeLinkStep(run as Parameters<typeof changeLinkStep>[0]);
    const link = delivered[0]!.text.match(/https?:\/\/\S+\/verify-email\?[^\s\]]+/)![0];
    startJob.mockClear();
    return auth.handler(new Request(link, { headers: { cookie } }));
  }

  it('holds the address being left in the swap, starts the notice with ids alone, and its step mails that address and clears it', async () => {
    const { id, cookie } = await signedIn(OWNER);

    const response = await completeChange(id, cookie, NEW);

    expect(response.status).toBe(302);
    expect(await formerOf(id)).toMatchObject({ email: NEW, former_email: OWNER });
    const runs = await accountNoticeRuns();
    expect(runs).toEqual([{ kind: 'change-completed', userId: id, origin: expect.any(String) }]);
    expect(JSON.stringify(runs)).not.toContain(DOMAIN);
    expect(send).not.toHaveBeenCalled();

    const message = await noticeFor(runs[0]!);

    expect(message!.to).toBe(OWNER);
    expect(message!.text).toContain(DOMAIN.slice(1));
    expect(await formerOf(id)).toMatchObject({ email: NEW, former_email: null });
    // A second run of the step finds nothing left to say.
    expect(await noticeFor(runs[0]!)).toBeNull();
  });

  it('keeps the first address left when a second change completes before its notice is sent, and tells it where the account is now', async () => {
    const { id, cookie } = await signedIn(OWNER);
    await completeChange(id, cookie, NEW);
    const [first] = await accountNoticeRuns();

    await completeChange(id, cookie, NEWER);

    // The first notice was never sent, so the address it is owed to is kept over the one the second change left.
    expect(await formerOf(id)).toMatchObject({ email: NEWER, former_email: OWNER });
    const [second] = await accountNoticeRuns();
    expect(second).toEqual({ kind: 'change-completed', userId: id, origin: expect.any(String) });

    const message = await noticeFor(first!);
    expect(message!.to).toBe(OWNER);
    expect(await formerOf(id)).toMatchObject({ former_email: null });
    expect(await noticeFor(second!)).toBeNull();
  });

  it('clears nothing when the account moved again while the notice was going out, so the later move is told too', async () => {
    const { id } = await signedIn(OWNER);
    await asTouch(
      sql,
      (tx) => tx`update users set email = ${NEWER}, former_email = ${OWNER} where id = ${id}`,
    );
    const { clearFormerEmail } = await import('@/modules/identity');

    // The step mailed OWNER that the account moved to NEW; the row has since moved to NEWER.
    expect(await clearFormerEmail(id, OWNER, NEW)).toBe(false);
    expect(await formerOf(id)).toMatchObject({ former_email: OWNER });

    expect(await clearFormerEmail(id, OWNER, NEWER)).toBe(true);
    const row = await formerOf(id);
    expect(row).toMatchObject({ former_email: null });
    const { SYSTEM_ACTOR_ID } = await import('@/lib/system-actor');
    expect(row.updated_by).toBe(SYSTEM_ACTOR_ID);
  });

  it('lets another account sign up with the address being left, and mails no account-exists notice for it', async () => {
    const { id, cookie } = await signedIn(OWNER);
    await completeChange(id, cookie, NEW);
    // Precondition: the address is still held, waiting for its notice.
    expect(await formerOf(id)).toMatchObject({ former_email: OWNER });

    const response = await post(auth, '/sign-up/email', {
      name: 'Fixture Newcomer',
      email: OWNER,
      password: RIGHT,
    });

    expect(response.status).toBe(200);
    const holders = await sql`select id from users where email = ${OWNER}`;
    expect(holders).toHaveLength(1);
    expect(holders[0]!.id).not.toBe(id);
    expect((await accountNoticeRuns()).filter((run) => run.kind === 'account-exists')).toEqual([]);
  });

  it('lets another account change to the address being left', async () => {
    const { id, cookie } = await signedIn(OWNER);
    await completeChange(id, cookie, NEW);
    expect(await formerOf(id)).toMatchObject({ former_email: OWNER });
    const other = await signedIn(OTHER);

    const response = await completeChange(other.id, other.cookie, OWNER);

    expect(response.status).toBe(302);
    expect(response.headers.get('location')).not.toContain('EMAIL_TAKEN');
    expect(await formerOf(other.id)).toMatchObject({ email: OWNER, former_email: OTHER });
    // The first account's notice is still owed to the mailbox it left.
    expect(await formerOf(id)).toMatchObject({ former_email: OWNER });
  });

  it('tries the notice once itself when the run cannot be started, and clears the address after', async () => {
    const errors = vi.spyOn(console, 'error').mockImplementation(() => undefined);
    const { id, cookie } = await signedIn(OWNER);
    const { accountNoticeMail } = await import('@/modules/identity/jobs/account-notice-mail');
    startJob.mockImplementation(async (job) => {
      if (job === accountNoticeMail) throw new Error('queue down');
      return 'run-id';
    });

    await completeChange(id, cookie, NEW);

    startJob.mockImplementation(async () => 'run-id');
    errors.mockRestore();
    expect(send).toHaveBeenCalledTimes(1);
    expect(send.mock.calls[0]![0].to).toBe(OWNER);
    // Nothing would try it again, so the address is not kept.
    expect(await formerOf(id)).toMatchObject({ email: NEW, former_email: null });
  });
});
