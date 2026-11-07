import { afterAll, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';
import postgres from 'postgres';
import { start } from 'workflow/api';
import { BOOTSTRAP_USER_ID } from '@/db/bootstrap';
import { supportStatusMail } from '@/modules/support/jobs/support-status-mail';

const DOMAIN = '@support-status-mail-run.test';
const ORIGIN = 'http://localhost:3000';
const MAILPIT_URL = 'http://mailpit.test';

let sql: ReturnType<typeof postgres>;
let failNext = 0;
const attempts: string[] = [];
const received: { to: string; subject: string; text: string }[] = [];

// The stand-in answers fetch itself, not on a port: the local world finds its queue by this process's port, so a second listener would take its deliveries.
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
  await sql`truncate support_replies, support_requests cascade`;
});

let made = 0;
async function sender(): Promise<{ id: string; email: string }> {
  made += 1;
  const email = `sender${made}${DOMAIN}`;
  const [{ id }] = await sql`
    insert into users (name, email, email_verified, created_by, updated_by)
    values (${`Testwort Sender ${made}`}, ${email}, true, ${BOOTSTRAP_USER_ID}, ${BOOTSTRAP_USER_ID})
    returning id
  `;
  return { id: id as string, email };
}

async function request(by: string, status = 'open'): Promise<string> {
  const [{ id }] = await sql`
    insert into support_requests (about, subject, message, path, status, created_by, updated_by)
    values ('bug', 'The Testwort jar sticks', 'It will not open.', '/compendium', ${status}, ${by}, ${by})
    returning id
  `;
  return id as string;
}

describe('the status mail run', () => {
  it('retries a received mail the transport refused twice, and sends it to the address read from the row', async () => {
    const errors = vi.spyOn(console, 'error').mockImplementation(() => undefined);
    const account = await sender();
    const requestId = await request(account.id);
    failNext = 2;

    const run = await start(supportStatusMail, [{ kind: 'received', requestId, origin: ORIGIN }]);

    await expect(run.returnValue).resolves.toBe(true);
    // Precondition: the first two attempts really failed, so the mail is a retry's.
    expect(attempts).toHaveLength(3);
    expect(received).toHaveLength(1);
    expect(received[0]!.to).toBe(account.email);
    expect(received[0]!.subject).toContain('The Testwort jar sticks');
    expect(received[0]!.text).toContain(`${ORIGIN}/account/support?request=${requestId}`);
    errors.mockRestore();
  });

  it('returns false and logs it when every attempt fails', async () => {
    const errors = vi.spyOn(console, 'error').mockImplementation(() => undefined);
    const account = await sender();
    const requestId = await request(account.id, 'resolved');
    failNext = Number.POSITIVE_INFINITY;

    const run = await start(supportStatusMail, [{ kind: 'resolved', requestId, origin: ORIGIN }]);

    await expect(run.returnValue).resolves.toBe(false);
    expect(attempts).toHaveLength(4);
    expect(received).toEqual([]);
    errors.mockRestore();
  });

  it('sends no resolved mail for a request that is no longer resolved', async () => {
    const account = await sender();
    const requestId = await request(account.id, 'open');

    const run = await start(supportStatusMail, [{ kind: 'resolved', requestId, origin: ORIGIN }]);

    await expect(run.returnValue).resolves.toBe(false);
    expect(attempts).toEqual([]);
  });
});
