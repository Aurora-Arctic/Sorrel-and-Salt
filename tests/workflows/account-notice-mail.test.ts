import { afterAll, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';
import postgres from 'postgres';
import { start } from 'workflow/api';
import { BOOTSTRAP_USER_ID } from '@/db/bootstrap';
import { SYSTEM_ACTOR_ID } from '@/lib/system-actor';
import { accountNoticeMail } from '@/modules/identity/jobs/account-notice-mail';
import type { AccountNotice } from '@/modules/identity';

// The notice to the address a completed change left, end to end in the SDK's local world, against a stand-in Mailpit that can
// be told to fail. The run holds the account id and the origin; the step reads `former_email` when it sends and clears it once
// the transport took the mail, or once every attempt has failed, since nothing would send it again.

const DOMAIN = '@account-notice-run.test';
const LEFT = `left${DOMAIN}`;
const NOW_AT = `now${DOMAIN}`;
const ORIGIN = 'http://localhost:8000';
const MAILPIT_URL = 'http://mailpit.test';

let sql: ReturnType<typeof postgres>;
let failNext = 0;
// What `former_email` held as each attempt reached the transport.
const heldAtAttempt: (string | null)[] = [];
const received: { to: string; text: string }[] = [];
let userId: string;

const formerOf = async () =>
  (await sql`select former_email, updated_by from users where id = ${userId}`)[0]!;

// Answers fetch itself rather than listening on a port: the local world finds its queue by this process's port.
const realFetch = globalThis.fetch;
async function mailpit(input: RequestInfo | URL, init?: RequestInit): Promise<Response> {
  const url = input instanceof Request ? input.url : String(input);
  if (!url.startsWith(MAILPIT_URL)) return realFetch(input, init);
  heldAtAttempt.push((await formerOf()).former_email as string | null);
  const mail = JSON.parse(String(init?.body)) as { To: { Email: string }[]; Text: string };
  if (failNext > 0) {
    failNext -= 1;
    return new Response('down', { status: 503 });
  }
  received.push({ to: mail.To[0]!.Email, text: mail.Text });
  return Response.json({ ID: 'stand-in' });
}

beforeAll(async () => {
  sql = postgres(process.env.DATABASE_URL as string, { onnotice: () => {} });
  vi.stubGlobal('fetch', mailpit);
  vi.stubEnv('MAIL_TRANSPORT', 'mailpit');
  vi.stubEnv('MAILPIT_URL', MAILPIT_URL);
  vi.stubEnv('VERCEL_ENV', '');
  await sql`delete from users where email like ${`%${DOMAIN}`}`;
  const [row] = await sql`
    insert into users (name, email, email_verified, created_by, updated_by)
    values ('Testwort Mover', ${NOW_AT}, true, ${BOOTSTRAP_USER_ID}, ${BOOTSTRAP_USER_ID})
    returning id`;
  userId = row!.id as string;
});

afterAll(async () => {
  vi.unstubAllGlobals();
  vi.unstubAllEnvs();
  await sql.end();
});

beforeEach(async () => {
  failNext = 0;
  heldAtAttempt.length = 0;
  received.length = 0;
  await sql`update users set former_email = ${LEFT}, updated_by = ${userId} where id = ${userId}`;
});

const notice: () => AccountNotice = () => ({ kind: 'change-completed', userId, origin: ORIGIN });

describe('the change-completed notice run', () => {
  it('keeps the address through refused attempts, mails it on a retry, and clears it once the transport took the mail', async () => {
    failNext = 2;

    const run = await start(accountNoticeMail, [notice()]);

    await expect(run.returnValue).resolves.toBe(true);
    // Precondition: two attempts were refused, so the mail that arrived is a retry's.
    expect(heldAtAttempt).toEqual([LEFT, LEFT, LEFT]);
    expect(received).toHaveLength(1);
    expect(received[0]!.to).toBe(LEFT);
    expect(received[0]!.text).toContain(DOMAIN.slice(1));
    expect(await formerOf()).toEqual({ former_email: null, updated_by: SYSTEM_ACTOR_ID });
  });

  it('logs the notice by kind and account id when every attempt fails, sends nothing, and lets the address go', async () => {
    const errors = vi.spyOn(console, 'error').mockImplementation(() => undefined);
    failNext = 99;

    const run = await start(accountNoticeMail, [notice()]);

    await expect(run.returnValue).resolves.toBe(false);
    expect(received).toEqual([]);
    // Precondition: the transport was tried and held the address each time, so the clear came after the last attempt.
    expect(heldAtAttempt.length).toBeGreaterThan(1);
    expect(heldAtAttempt.every((held) => held === LEFT)).toBe(true);
    const logged = errors.mock.calls.map((call) => call.map(String).join(' ')).join('\n');
    expect(logged).toContain(`the change-completed mail to user ${userId} was not sent`);
    expect(logged).not.toContain(DOMAIN);
    expect(await formerOf()).toEqual({ former_email: null, updated_by: SYSTEM_ACTOR_ID });
    errors.mockRestore();
  });

  it('sends nothing when no former address is held', async () => {
    await sql`update users set former_email = null where id = ${userId}`;

    const run = await start(accountNoticeMail, [notice()]);

    await expect(run.returnValue).resolves.toBe(false);
    expect(heldAtAttempt).toEqual([]);
  });
});
