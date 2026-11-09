import { afterAll, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';
import postgres from 'postgres';
import { start } from 'workflow/api';
import { BOOTSTRAP_USER_ID } from '@/db/bootstrap';
import { memberPauseMail } from '@/modules/coven/jobs/member-pause-mail';
import { accessPauseMail } from '@/modules/identity/jobs/access-pause-mail';
import { supportTimeoutMail } from '@/modules/support/jobs/support-timeout-mail';
import { makeWorkspace, workspaceColumns } from '../support/fixtures';
import { useTestDatabase } from '../support/db/database';
import { MAILPIT_URL, ORIGIN } from '../support/constants';

const DOMAIN = '@pause-mail-run.test';
const NOTE = 'Staff only: never mailed.';
const MESSAGE = 'A message written to the user.';

let sql: ReturnType<typeof postgres>;

useTestDatabase((client) => {
  sql = client;
});

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

let made = 0;
async function account(): Promise<{ id: string; email: string }> {
  made += 1;
  const email = `user${made}${DOMAIN}`;
  const [{ id }] = await sql`
    insert into users (name, email, email_verified, created_by, updated_by)
    values (${`Testwort User ${made}`}, ${email}, true, ${BOOTSTRAP_USER_ID}, ${BOOTSTRAP_USER_ID})
    returning id
  `;
  return { id: id as string, email };
}

async function timeout(userId: string, lifted = false): Promise<string> {
  const [{ id }] = await sql`
    insert into support_timeouts (user_id, until, note, message, lifted_at, created_by, updated_by)
    values (${userId}, null, ${NOTE}, ${MESSAGE}, ${lifted ? sql`now()` : null}, ${BOOTSTRAP_USER_ID}, ${BOOTSTRAP_USER_ID})
    returning id
  `;
  return id as string;
}

async function accessPause(userId: string, lifted = false): Promise<string> {
  const [{ id }] = await sql`
    insert into user_access_pauses (user_id, until, note, message, lifted_at, lifted_by, created_by, updated_by)
    values (${userId}, null, ${NOTE}, ${MESSAGE}, ${lifted ? sql`now()` : null}, ${lifted ? BOOTSTRAP_USER_ID : null},
            ${BOOTSTRAP_USER_ID}, ${BOOTSTRAP_USER_ID})
    returning id
  `;
  return id as string;
}

let covensMade = 0;
async function memberPause(userId: string, name: string, lifted = false): Promise<string> {
  covensMade += 1;
  const [coven] = await sql`
    insert into workspaces ${sql({ ...workspaceColumns(makeWorkspace({ name: `${name} ${covensMade}` })), created_by: userId, updated_by: userId })}
    returning id`;
  const covenId = coven!.id as string;
  await sql`
    insert into workspace_members (workspace_id, user_id, role, created_by, updated_by)
    values (${covenId}, ${userId}, 'member', ${userId}, ${userId})`;
  const [{ id }] = await sql`
    insert into workspace_member_pauses (workspace_id, user_id, until, note, message, lifted_at, lifted_by, created_by, updated_by)
    values (${covenId}, ${userId}, null, ${NOTE}, ${MESSAGE}, ${lifted ? sql`now()` : null}, ${lifted ? userId : null},
            ${userId}, ${userId})
    returning id
  `;
  return id as string;
}

beforeAll(async () => {
  vi.stubGlobal('fetch', mailpit);
  vi.stubEnv('MAIL_TRANSPORT', 'mailpit');
  vi.stubEnv('MAILPIT_URL', MAILPIT_URL);
  vi.stubEnv('VERCEL_ENV', '');
  // A coven is found by its creator; the time-outs and pauses go with their user.
  const mine = sql`select id from users where email like ${`%${DOMAIN}`}`;
  await sql`delete from workspace_member_pauses where user_id in (${mine})`;
  await sql`delete from workspace_members where user_id in (${mine})`;
  await sql`delete from workspaces where created_by in (${mine})`;
  await sql`delete from users where email like ${`%${DOMAIN}`}`;
});

afterAll(async () => {
  vi.unstubAllGlobals();
  vi.unstubAllEnvs();
});

beforeEach(() => {
  failNext = 0;
  attempts.length = 0;
  received.length = 0;
});

describe('the support time-out mail run', () => {
  it('retries a mail the transport refused twice, and sends it to the address read from the row, with the message and not the note', async () => {
    const errors = vi.spyOn(console, 'error').mockImplementation(() => undefined);
    const user = await account();
    const timeoutId = await timeout(user.id);
    failNext = 2;

    const run = await start(supportTimeoutMail, [
      { kind: 'support-time-out', timeoutId, origin: ORIGIN },
    ]);

    await expect(run.returnValue).resolves.toBe(true);
    // Precondition: the first two attempts really failed, so the mail is a retry's.
    expect(attempts).toHaveLength(3);
    expect(received).toHaveLength(1);
    expect(received[0]!.to).toBe(user.email);
    expect(received[0]!.text).toContain(MESSAGE);
    expect(received[0]!.text).not.toContain(NOTE);
    errors.mockRestore();
  });

  it('sends nothing for a time-out since lifted', async () => {
    const user = await account();
    const timeoutId = await timeout(user.id, true);

    const run = await start(supportTimeoutMail, [
      { kind: 'support-time-out', timeoutId, origin: ORIGIN },
    ]);

    await expect(run.returnValue).resolves.toBe(false);
    expect(attempts).toEqual([]);
  });
});

describe('the access pause mail run', () => {
  it('returns false and logs it when every attempt fails', async () => {
    const errors = vi.spyOn(console, 'error').mockImplementation(() => undefined);
    const user = await account();
    const pauseId = await accessPause(user.id);
    failNext = Number.POSITIVE_INFINITY;

    const run = await start(accessPauseMail, [{ kind: 'access-pause', pauseId, origin: ORIGIN }]);

    await expect(run.returnValue).resolves.toBe(false);
    expect(attempts).toEqual([user.email, user.email, user.email, user.email]);
    expect(received).toEqual([]);
    expect(errors).toHaveBeenCalled();
    errors.mockRestore();
  });

  it('sends nothing for a pause since lifted', async () => {
    const user = await account();
    const pauseId = await accessPause(user.id, true);

    const run = await start(accessPauseMail, [{ kind: 'access-pause', pauseId, origin: ORIGIN }]);

    await expect(run.returnValue).resolves.toBe(false);
    expect(attempts).toEqual([]);
  });
});

describe('the coven pause mail run', () => {
  it('sends the member a mail naming the coven, read from the row, with the message and not the note', async () => {
    const user = await account();
    const pauseId = await memberPause(user.id, 'Testwort Pause Hollow');
    const [{ name }] = await sql`
      select w.name from workspaces w join workspace_member_pauses p on p.workspace_id = w.id where p.id = ${pauseId}`;

    const run = await start(memberPauseMail, [{ kind: 'member-pause', pauseId, origin: ORIGIN }]);

    await expect(run.returnValue).resolves.toBe(true);
    expect(received).toHaveLength(1);
    expect(received[0]!.to).toBe(user.email);
    expect(received[0]!.subject).toContain(name as string);
    expect(received[0]!.text).toContain(MESSAGE);
    expect(received[0]!.text).not.toContain(NOTE);
  });

  it('sends nothing for a pause since lifted', async () => {
    const user = await account();
    const pauseId = await memberPause(user.id, 'Testwort Lifted Hollow', true);

    const run = await start(memberPauseMail, [{ kind: 'member-pause', pauseId, origin: ORIGIN }]);

    await expect(run.returnValue).resolves.toBe(false);
    expect(attempts).toEqual([]);
  });
});
