import { afterAll, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';
import postgres from 'postgres';
import { start } from 'workflow/api';
import { BOOTSTRAP_USER_ID } from '@/db/bootstrap';
import { SIGNED_OUT_SENDER_ID } from '@/lib/support-sender';
import { supportReplyNotice } from '@/modules/support/jobs/support-reply-notice';

// The run that tells a sender of a staff reply, end to end in the SDK's local world, against a stand-in Mailpit that can be told
// to fail. The run carries the reply's id and the origin alone, and its step reads the rest from the rows when it sends.

const DOMAIN = '@support-reply-notice-run.test';
const ORIGIN = 'http://localhost:3000';
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
  await sql`truncate support_replies, support_requests cascade`;
});

let made = 0;
/** A verified account to send requests from. */
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

/** An open request, from the account `by` or, with `senderEmail`, a signed-out visitor, with one public staff reply. */
async function replied(
  by: string,
  senderEmail: string | null = null,
): Promise<{ requestId: string; replyId: string }> {
  const [{ id: requestId }] = await sql`
    insert into support_requests (about, subject, message, path, status, sender_email, created_by, updated_by)
    values ('bug', 'The Testwort jar sticks', 'It will not open.', '/compendium', 'open', ${senderEmail}, ${by}, ${by})
    returning id
  `;
  const [{ id: replyId }] = await sql`
    insert into support_replies (request_id, body, author_role, visibility, created_by, updated_by)
    values (${requestId}, 'Try the Testwort lever.', 'staff', 'public', ${BOOTSTRAP_USER_ID}, ${BOOTSTRAP_USER_ID})
    returning id
  `;
  return { requestId: requestId as string, replyId: replyId as string };
}

const markerOf = async (replyId: string) =>
  (await sql`select notice_sent_at from support_replies where id = ${replyId}`)[0]!
    .notice_sent_at as Date | null;

describe('the reply notice run', () => {
  it('retries a send the transport refused twice, and stamps the reply once it is taken', async () => {
    const errors = vi.spyOn(console, 'error').mockImplementation(() => undefined);
    const account = await sender();
    const { requestId, replyId } = await replied(account.id);
    failNext = 2;

    const run = await start(supportReplyNotice, [replyId, ORIGIN]);

    await expect(run.returnValue).resolves.toBe(true);
    // Precondition: the first two attempts really failed, so the stamp follows a retry's success.
    expect(attempts).toHaveLength(3);
    expect(received).toHaveLength(1);
    expect(received[0]!.to).toBe(account.email);
    expect(received[0]!.subject).toContain('The Testwort jar sticks');
    expect(received[0]!.text).toContain(`${ORIGIN}/account/support?request=${requestId}`);
    expect(received[0]!.text).not.toContain('Testwort lever');
    expect(await markerOf(replyId)).toBeInstanceOf(Date);
    errors.mockRestore();
  });

  it('leaves the reply unstamped when every attempt fails', async () => {
    const errors = vi.spyOn(console, 'error').mockImplementation(() => undefined);
    const account = await sender();
    const { replyId } = await replied(account.id);
    failNext = Number.POSITIVE_INFINITY;

    const run = await start(supportReplyNotice, [replyId, ORIGIN]);

    await expect(run.returnValue).resolves.toBe(false);
    // The first try and the SDK's three retries.
    expect(attempts).toHaveLength(4);
    expect(received).toEqual([]);
    expect(await markerOf(replyId)).toBeNull();
    errors.mockRestore();
  });

  it('mails a signed-out sender the reply in full, linked to the support page', async () => {
    const { replyId } = await replied(SIGNED_OUT_SENDER_ID, `visitor${DOMAIN}`);

    const run = await start(supportReplyNotice, [replyId, ORIGIN]);

    await expect(run.returnValue).resolves.toBe(true);
    expect(received).toHaveLength(1);
    expect(received[0]!.to).toBe(`visitor${DOMAIN}`);
    expect(received[0]!.text).toContain('Try the Testwort lever.');
    expect(received[0]!.text).toContain(`${ORIGIN}/support`);
    expect(received[0]!.text).not.toContain('/account');
    expect(await markerOf(replyId)).toBeInstanceOf(Date);
  });

  it('sends nothing again for a reply already stamped', async () => {
    const account = await sender();
    const { replyId } = await replied(account.id);
    await sql`update support_replies set notice_sent_at = now() - interval '1 hour' where id = ${replyId}`;
    const stamped = await markerOf(replyId);

    const run = await start(supportReplyNotice, [replyId, ORIGIN]);

    await expect(run.returnValue).resolves.toBe(false);
    expect(attempts).toEqual([]);
    expect(await markerOf(replyId)).toEqual(stamped);
  });

  it('sends nothing for an internal note', async () => {
    const account = await sender();
    const { replyId } = await replied(account.id);
    await sql`update support_replies set visibility = 'internal' where id = ${replyId}`;

    const run = await start(supportReplyNotice, [replyId, ORIGIN]);

    await expect(run.returnValue).resolves.toBe(false);
    expect(attempts).toEqual([]);
    expect(await markerOf(replyId)).toBeNull();
  });
});
