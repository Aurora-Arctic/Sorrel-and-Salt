import { afterAll, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';
import postgres from 'postgres';
import { jwtVerify } from 'jose';
import { start } from 'workflow/api';
import { BOOTSTRAP_USER_ID } from '@/db/bootstrap';
import { verificationSigningSecret } from '@/lib/auth-secrets';
import { secretLinkMail } from '@/modules/identity/jobs/secret-link-mail';
import type { SecretLink } from '@/modules/identity';

// The run that sends a secret-link mail, end to end in the SDK's local world, against a stand-in Mailpit that can be told to
// fail. The run carries ids and the auth base alone; its step reads the address, and the reset token or a fresh signature,
// when it sends.

const DOMAIN = '@secret-link-run.test';
const AUTH_BASE = 'http://localhost:3000/api/auth';
const MAILPIT_URL = 'http://mailpit.test';

let sql: ReturnType<typeof postgres>;
let failNext = 0;
const attempts: string[] = [];
const received: { to: string; subject: string; text: string }[] = [];

// The stand-in answers fetch itself rather than listening on a port: the local world finds its own queue by the port this process
// listens on, so a second listener would take its deliveries.
const realFetch = globalThis.fetch;
async function mailpit(input: RequestInfo | URL, init?: RequestInit): Promise<Response> {
  const url = input instanceof Request ? input.url : String(input);
  if (!url.startsWith(MAILPIT_URL)) return realFetch(input, init);
  const mail = JSON.parse(String(init?.body)) as {
    To: { Email: string }[];
    Subject: string;
    Text: string;
  };
  attempts.push(mail.To[0]!.Email);
  if (failNext > 0) {
    failNext -= 1;
    return new Response('down', { status: 503 });
  }
  received.push({ to: mail.To[0]!.Email, subject: mail.Subject, text: mail.Text });
  return Response.json({ ID: 'stand-in' });
}

beforeAll(() => {
  sql = postgres(process.env.DATABASE_URL as string, { onnotice: () => {} });
  vi.stubGlobal('fetch', mailpit);
  vi.stubEnv('MAIL_TRANSPORT', 'mailpit');
  vi.stubEnv('MAILPIT_URL', MAILPIT_URL);
  vi.stubEnv('VERCEL_ENV', '');
});

afterAll(async () => {
  vi.unstubAllGlobals();
  vi.unstubAllEnvs();
  await sql.end();
});

beforeEach(async () => {
  failNext = 0;
  attempts.length = 0;
  received.length = 0;
  await sql`delete from verifications where identifier like 'reset-password:%'`;
});

let made = 0;
/** An account, verified or not, with an invented address. */
async function account(verified: boolean): Promise<{ id: string; email: string }> {
  made += 1;
  const email = `holder${made}${DOMAIN}`;
  const [{ id }] = await sql`
    insert into users (name, email, email_verified, created_by, updated_by)
    values (${`Testwort Holder ${made}`}, ${email}, ${verified}, ${BOOTSTRAP_USER_ID}, ${BOOTSTRAP_USER_ID})
    returning id
  `;
  return { id: id as string, email };
}

/** A reset link's row, as Better Auth writes one, expiring `minutes` from now. */
async function resetRow(userId: string, token: string, minutes = 15): Promise<void> {
  await sql`
    insert into verifications (identifier, value, expires_at)
    values (${`reset-password:${token}`}, ${userId}, ${new Date(Date.now() + minutes * 60_000)})
  `;
}

const linkIn = (text: string, path: string) =>
  text.match(new RegExp(`https?://\\S+${path}[^\\s\\]]+`))?.[0];

describe('the secret-link mail run', () => {
  it('retries a verification mail the transport refused twice, signing a link Better Auth accepts for the address the row holds then', async () => {
    const errors = vi.spyOn(console, 'error').mockImplementation(() => undefined);
    const holder = await account(false);
    const link: SecretLink = {
      kind: 'verification',
      userId: holder.id,
      authBase: AUTH_BASE,
      next: '/compendium',
    };
    // The address changes before the run sends, so the mail can only go where the row says when the step runs.
    const later = `renamed${made}${DOMAIN}`;
    await sql`update users set email = ${later} where id = ${holder.id}`;
    failNext = 2;

    const run = await start(secretLinkMail, [link]);

    await expect(run.returnValue).resolves.toBe(true);
    // Precondition: the first two attempts really failed, so the mail is a retry's.
    expect(attempts).toHaveLength(3);
    expect(received).toHaveLength(1);
    expect(received[0]!.to).toBe(later);
    const url = linkIn(received[0]!.text, '/verify-email\\?token=');
    if (!url) throw new Error(`no verification link in: ${received[0]!.text}`);
    expect(url.startsWith(`${AUTH_BASE}/verify-email?token=`)).toBe(true);
    const token = new URL(url).searchParams.get('token')!;
    const { payload } = await jwtVerify(
      token,
      new TextEncoder().encode(verificationSigningSecret()),
    );
    expect(payload.email).toBe(later);
    expect(new URL(url).searchParams.get('callbackURL')).toContain(
      encodeURIComponent('/compendium'),
    );
    // The run's argument holds neither address nor token.
    expect(JSON.stringify(link)).not.toContain(DOMAIN);
    expect(JSON.stringify(link)).not.toContain(token);
    errors.mockRestore();
  });

  it('sends the newest live reset token Better Auth holds, read when the step runs', async () => {
    const holder = await account(true);
    await resetRow(holder.id, 'testwort-older-token');
    await new Promise((resolve) => setTimeout(resolve, 5));
    await resetRow(holder.id, 'testwort-newest-token');
    await resetRow(holder.id, 'testwort-expired-token', -1);
    const link: SecretLink = { kind: 'reset', userId: holder.id, authBase: AUTH_BASE };

    const run = await start(secretLinkMail, [link]);

    await expect(run.returnValue).resolves.toBe(true);
    expect(received).toHaveLength(1);
    expect(received[0]!.to).toBe(holder.email);
    expect(linkIn(received[0]!.text, '/reset-password/')).toBe(
      `${AUTH_BASE}/reset-password/testwort-newest-token?callbackURL=%2Freset-password`,
    );
    expect(JSON.stringify(link)).not.toContain('testwort-newest-token');
  });

  it('carries the reset link in the lockout notice', async () => {
    const holder = await account(true);
    await resetRow(holder.id, 'testwort-lock-token');

    const run = await start(secretLinkMail, [
      { kind: 'lockout', userId: holder.id, authBase: AUTH_BASE, minutes: 15 },
    ]);

    await expect(run.returnValue).resolves.toBe(true);
    expect(received).toHaveLength(1);
    expect(received[0]!.to).toBe(holder.email);
    expect(received[0]!.text).toContain(`${AUTH_BASE}/reset-password/testwort-lock-token`);
  });

  it('logs and returns false when every attempt fails', async () => {
    const errors = vi.spyOn(console, 'error').mockImplementation(() => undefined);
    const holder = await account(true);
    await resetRow(holder.id, 'testwort-lost-token');
    failNext = 99;

    const run = await start(secretLinkMail, [
      { kind: 'reset', userId: holder.id, authBase: AUTH_BASE },
    ]);

    await expect(run.returnValue).resolves.toBe(false);
    // Precondition: the step was retried, so false follows the last retry and not the first refusal.
    expect(attempts.length).toBeGreaterThan(1);
    expect(received).toHaveLength(0);
    const logged = errors.mock.calls.map((call) => String(call[0])).join('\n');
    expect(logged).toContain(`the reset mail to user ${holder.id} was not sent`);
    expect(logged).not.toContain('testwort-lost-token');
    errors.mockRestore();
  });

  it('sends nothing when there is nothing left to verify or reset', async () => {
    const verified = await account(true);
    const unverified = await account(false);
    await resetRow(unverified.id, 'testwort-unproved-token');

    const runs = await Promise.all([
      start(secretLinkMail, [
        { kind: 'verification', userId: verified.id, authBase: AUTH_BASE, next: null },
      ]),
      // A reset reaches only a proved inbox, even with a live token.
      start(secretLinkMail, [{ kind: 'reset', userId: unverified.id, authBase: AUTH_BASE }]),
      // A verified account whose token has expired has no link to send.
      start(secretLinkMail, [{ kind: 'reset', userId: verified.id, authBase: AUTH_BASE }]),
    ]);

    for (const run of runs) await expect(run.returnValue).resolves.toBe(false);
    expect(attempts).toHaveLength(0);
  });
});
