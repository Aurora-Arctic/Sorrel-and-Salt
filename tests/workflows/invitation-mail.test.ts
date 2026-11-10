import { createHash } from 'node:crypto';
import { afterAll, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';
import postgres from 'postgres';
import { start } from 'workflow/api';
import { BOOTSTRAP_USER_ID } from '@/db/bootstrap';
import { SYSTEM_ACTOR_ID } from '@/lib/system-actor';
import { secretLinkMail } from '@/modules/identity/jobs/secret-link-mail';
import type { SecretLink } from '@/modules/identity';
import { makeWorkspace, workspaceColumns } from '../support/fixtures';
import { useTestDatabase } from '../support/db/database';
import { MAILPIT_URL, ORIGIN } from '../support/constants';

// Each attempt of the step gives the invitation a fresh token and mails that, so a link from a refused attempt names nothing. A printed card never goes this way.

const DOMAIN = '@invitation-run.test';
// The token each row is inserted with, made unique per row as the column is.
const staleToken = (n: number) => `fixture-token-${n}-dddddddddddddddddddddddddddddddd`;

let sql: ReturnType<typeof postgres>;

useTestDatabase((client) => {
  sql = client;
});

let failNext = 0;
const attempts: { to: string; text: string }[] = [];
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
  attempts.push({ to: mail.To[0]!.Email, text: mail.Text });
  if (failNext > 0) {
    failNext -= 1;
    return new Response('down', { status: 503 });
  }
  received.push({ to: mail.To[0]!.Email, subject: mail.Subject, text: mail.Text });
  return Response.json({ ID: 'stand-in' });
}

const sha256 = (value: string) => createHash('sha256').update(value).digest('hex');
const tokenIn = (text: string) => text.match(/\/invite\/([A-Za-z0-9_-]+)/)?.[1];

let inviterId: string;
let covenId: string;

beforeAll(async () => {
  vi.stubGlobal('fetch', mailpit);
  vi.stubEnv('MAIL_TRANSPORT', 'mailpit');
  vi.stubEnv('MAILPIT_URL', MAILPIT_URL);
  vi.stubEnv('VERCEL_ENV', '');
  // A card has no address, so the rows are found by their inviter.
  const mine = sql`select id from users where email like ${`%${DOMAIN}`}`;
  await sql`delete from invitations where created_by in (${mine})`;
  await sql`delete from workspaces where created_by in (${mine})`;
  await sql`delete from users where email like ${`%${DOMAIN}`}`;
  const [inviter] = await sql`
    insert into users (name, email, email_verified, created_by, updated_by)
    values ('Testwort Inviter', ${`inviter${DOMAIN}`}, true, ${BOOTSTRAP_USER_ID}, ${BOOTSTRAP_USER_ID})
    returning id`;
  inviterId = inviter!.id as string;
  const [coven] = await sql`
    insert into workspaces ${sql({ ...workspaceColumns(makeWorkspace({ name: 'Testwort Hollow' })), created_by: inviterId, updated_by: inviterId })}
    returning id`;
  covenId = coven!.id as string;
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

let made = 0;
type Stamps = {
  accepted_at?: Date;
  accepted_by?: string;
  revoked_at?: Date;
  expires_at?: Date;
};

/** A coven invitation as A's createInvitation leaves it: a stored hash of a token nobody was told. */
async function covenInvitation(stamps: Stamps = {}): Promise<{ id: string; email: string }> {
  made += 1;
  const email = `invited${made}${DOMAIN}`;
  const [row] = await sql`
    insert into invitations ${sql({
      workspace_id: covenId,
      email,
      role: 'member',
      token_hash: sha256(staleToken(made)),
      created_by: inviterId,
      updated_by: inviterId,
      expires_at: new Date(Date.now() + 86_400_000),
      ...stamps,
    })}
    returning id`;
  return { id: row!.id as string, email };
}

const stored = async (id: string) =>
  (await sql`select token_hash, updated_by, updated_at from invitations where id = ${id}`)[0]!;

const link = (invitationId: string): SecretLink => ({
  kind: 'invitation',
  invitationId,
  origin: ORIGIN,
});

describe('the invitation mail run', () => {
  it('mails a coven invitation on a token minted by the step, and a retry mints again so only the newest link names the row', async () => {
    const invitation = await covenInvitation();
    failNext = 2;

    const run = await start(secretLinkMail, [link(invitation.id)]);

    await expect(run.returnValue).resolves.toBe(true);
    // Precondition: the first two attempts really failed, so the mail that arrived is a retry's.
    expect(attempts).toHaveLength(3);
    const tokens = attempts.map(({ text }) => tokenIn(text));
    expect(tokens.every(Boolean)).toBe(true);
    expect(new Set(tokens).size).toBe(3);
    expect(received).toHaveLength(1);
    expect(received[0]!.to).toBe(invitation.email);
    expect(received[0]!.text).toContain(`${ORIGIN}/invite/${tokens[2]}`);
    expect(received[0]!.text).toContain('Testwort Hollow');
    expect(received[0]!.text).toContain('Testwort Inviter');
    // Only the mailed token's hash is on the row; the refused attempts' links and the token minted at insert name nothing.
    expect(await stored(invitation.id)).toMatchObject({
      token_hash: sha256(tokens[2]!),
      updated_by: SYSTEM_ACTOR_ID,
    });
    for (const dead of [staleToken(made), tokens[0]!, tokens[1]!]) {
      expect(await sql`select 1 from invitations where token_hash = ${sha256(dead)}`).toEqual([]);
    }
  });

  it('mails a site invitation with its site role and the keeper who sent it', async () => {
    made += 1;
    const email = `curator${made}${DOMAIN}`;
    const [row] = await sql`
      insert into invitations ${sql({
        email,
        site_role: 'curator',
        token_hash: sha256(staleToken(made)),
        created_by: inviterId,
        updated_by: inviterId,
        expires_at: new Date(Date.now() + 86_400_000),
      })}
      returning id`;

    const run = await start(secretLinkMail, [link(row!.id as string)]);

    await expect(run.returnValue).resolves.toBe(true);
    expect(received).toHaveLength(1);
    expect(received[0]!.to).toBe(email);
    expect(received[0]!.subject).toContain('Curator');
    expect(received[0]!.text).toContain('Testwort Inviter');
    const token = tokenIn(received[0]!.text)!;
    expect((await stored(row!.id as string)).token_hash).toBe(sha256(token));
  });

  const closed: [string, () => Stamps][] = [
    ['accepted', () => ({ accepted_at: new Date(), accepted_by: inviterId })],
    ['revoked', () => ({ revoked_at: new Date() })],
    ['expired', () => ({ expires_at: new Date(Date.now() - 1000) })],
  ];
  for (const [state, stamps] of closed) {
    it(`sends nothing and writes nothing for an ${state} invitation`, async () => {
      const invitation = await covenInvitation(stamps());
      const before = await stored(invitation.id);

      const run = await start(secretLinkMail, [link(invitation.id)]);

      await expect(run.returnValue).resolves.toBe(false);
      expect(attempts).toEqual([]);
      expect(await stored(invitation.id)).toEqual(before);
    });
  }

  it('sends nothing and writes nothing for a printed card', async () => {
    made += 1;
    const [row] = await sql`
      insert into invitations ${sql({
        kind: 'card',
        batch_id: crypto.randomUUID(),
        position: 1,
        token_hash: sha256(staleToken(made)),
        created_by: inviterId,
        updated_by: inviterId,
        expires_at: new Date(Date.now() + 86_400_000),
      })}
      returning id`;
    const id = row!.id as string;
    const before = await stored(id);

    const run = await start(secretLinkMail, [link(id)]);

    await expect(run.returnValue).resolves.toBe(false);
    expect(attempts).toEqual([]);
    expect(await stored(id)).toEqual(before);
  });
});
