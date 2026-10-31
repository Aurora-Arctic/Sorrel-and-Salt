import { createHash } from 'node:crypto';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type postgres from 'postgres';
import { WORKSPACE_W_ID, WORKSPACE_X_ID } from '@/db/seed/standard';
import { Forbidden, ValidationError } from '@/lib/errors';
import { invitationSender } from '@/lib/invitation-mail';
import type { Message } from '@/lib/types';
import {
  createInvitation,
  INVITATION_MAIL_LIMIT,
  INVITATION_MAIL_WINDOW_MINUTES,
} from '@/modules/coven';
import { acceptInvitation, acceptInvitationById } from '@/modules/identity';
import { A, B, C, D, asUser } from '../../../support/as-user';
import { useTestDatabase } from '../../../support/db/database';
import { asManualFix } from '../../../support/db/privileges';
import { makeWorkspace, workspaceColumns } from '../../../support/fixtures';
import type { CovenInvitationStateRow } from './types';

// An owner invites an address into a coven as a viewer or a member. The token is `crypto.randomBytes` output that only the mail carries, and the row holds its hash.
// The transport is a test double: the real sender builds the link and hands it to a mocked `send`; the failing transport is the real `send` over a failing `fetch`
// (claude-docs/db/invitations.md, "Inviting into a coven").

const send = vi.hoisted(() => vi.fn<(message: Message) => Promise<void>>(async () => {}));
const mail = vi.hoisted(() => ({ real: false }));
vi.mock('@/lib/mail', async (importOriginal) => {
  const real = await importOriginal<typeof import('@/lib/mail')>();
  return { send: (message: Message) => (mail.real ? real.send(message) : send(message)) };
});

let sql: postgres.Sql;
useTestDatabase((client) => {
  sql = client;
});

const DOMAIN = '@coven-invitations.test';
const INVITED = `invited${DOMAIN}`;
const ORIGIN = 'http://localhost:8000';

const sha256 = (value: string) => createHash('sha256').update(value).digest('hex');

/** The sender the page's mutation uses, bound to the browser's own request. */
const sender = () => invitationSender(new Request(`${ORIGIN}/api/graphql`, { method: 'POST' }));

/** The token in the link mailed to `to`, and the mail it came in. */
function mailedTo(to: string): { token: string; message: Message } {
  const message = send.mock.calls.map(([sent]) => sent).find((sent) => sent.to === to);
  const token = message?.text.match(/\/invite\/([A-Za-z0-9_-]+)/)?.[1];
  if (!message || !token) throw new Error(`no invitation link was mailed to ${to}`);
  return { token, message };
}

const invitations = () => sql<CovenInvitationStateRow[]>`
  select id, workspace_id, role::text, email, token_hash, accepted_at, revoked_at, expires_at,
    created_by, updated_by
  from invitations order by created_at
`;

/** A coven with these members, through the raw client. */
async function insertCoven(
  name: string,
  members: [string, 'owner' | 'member' | 'viewer'][],
): Promise<string> {
  const [row] = await sql`
    insert into workspaces ${sql({ ...workspaceColumns(makeWorkspace({ name })), created_by: A.id, updated_by: A.id })}
    returning id`;
  for (const [userId, role] of members) {
    await sql`
      insert into workspace_members (workspace_id, user_id, role, created_by, updated_by)
      values (${row.id}, ${userId}, ${role}, ${A.id}, ${A.id})`;
  }
  return row.id as string;
}

beforeEach(async () => {
  send.mockClear();
  mail.real = false;
  await sql`truncate invitations`;
});

afterEach(() => {
  vi.unstubAllEnvs();
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
});

describe('createInvitation', () => {
  it("writes a pending invitation into the owner's coven with the chosen role, stamped as the owner, storing only the hash of the token it mails", async () => {
    const row = await createInvitation(
      asUser(A),
      WORKSPACE_W_ID,
      { email: INVITED, role: 'member' },
      sender(),
    );

    const { token, message } = mailedTo(INVITED);
    const [stored, ...rest] = await invitations();
    expect(rest).toEqual([]);
    expect(stored).toMatchObject({
      id: row.id,
      workspace_id: WORKSPACE_W_ID,
      role: 'member',
      email: INVITED,
      accepted_at: null,
      revoked_at: null,
      created_by: A.id,
      updated_by: A.id,
    });
    expect(stored.expires_at.getTime()).toBeGreaterThan(Date.now());
    expect(stored.token_hash).toBe(sha256(token));
    expect(stored.token_hash).not.toBe(token);
    expect(JSON.stringify(row)).not.toContain(token);
    expect(message.to).toBe(INVITED);
    expect(message.text).toContain(`${ORIGIN}/invite/${token}`);
    expect(send).toHaveBeenCalledOnce();
  });

  it('normalises the address as the admin tier does, and mails the normalised one', async () => {
    await createInvitation(
      asUser(A),
      WORKSPACE_W_ID,
      { email: `  Invited${DOMAIN.toUpperCase()} `, role: 'viewer' },
      sender(),
    );

    expect((await invitations())[0].email).toBe(INVITED);
    expect(send.mock.calls.map(([message]) => message.to)).toEqual([INVITED]);
  });

  // The precondition: A could invite, so the refusal is the role check's.
  it('refuses owner as the role, in the service, writing and mailing nothing', async () => {
    await expect(
      createInvitation(
        asUser(A),
        WORKSPACE_W_ID,
        // The schema's enum has no owner; the service must refuse it unaided.
        { email: INVITED, role: 'owner' },
        sender(),
      ),
    ).rejects.toMatchObject({ issues: [{ path: ['role'] }] });

    expect(await invitations()).toEqual([]);
    expect(send).not.toHaveBeenCalled();
  });

  it('refuses a malformed address as a ValidationError on the email, writing and mailing nothing', async () => {
    for (const email of ['', 'not-an-address', 'someone@pending.invalid']) {
      await expect(
        createInvitation(asUser(A), WORKSPACE_W_ID, { email, role: 'viewer' }, sender()),
      ).rejects.toThrow(ValidationError);
    }

    expect(await invitations()).toEqual([]);
    expect(send).not.toHaveBeenCalled();
  });

  it('refuses a member and a viewer, who do belong to the coven, writing and mailing nothing', async () => {
    const covenId = await insertCoven('Fixture Invite Refusal Coven', [
      [A.id, 'owner'],
      [B.id, 'member'],
      [C.id, 'viewer'],
    ]);
    // Why the refusal is the permission's: each caller holds a live seat.
    const seats = await sql`
      select user_id, role from workspace_members where workspace_id = ${covenId}`;
    expect(seats.map((seat) => seat.role).sort()).toEqual(['member', 'owner', 'viewer']);

    for (const caller of [B, C]) {
      await expect(
        createInvitation(asUser(caller), covenId, { email: INVITED, role: 'viewer' }, sender()),
      ).rejects.toThrow(Forbidden);
    }

    expect(await invitations()).toEqual([]);
    expect(send).not.toHaveBeenCalled();
  });

  it("refuses an owner of another coven, by this coven's id", async () => {
    // Why the refusal is the coven's: D owns a coven of their own.
    const owned = await insertCoven('Fixture Other Owner Coven', [[D.id, 'owner']]);
    expect(owned).not.toBe(WORKSPACE_X_ID);

    await expect(
      createInvitation(asUser(D), WORKSPACE_W_ID, { email: INVITED, role: 'viewer' }, sender()),
    ).rejects.toThrow(Forbidden);

    expect(await invitations()).toEqual([]);
    expect(send).not.toHaveBeenCalled();
  });

  describe('a repeat invitation', () => {
    const OTHER_COVEN = 'Fixture Second Coven';
    const INVITEE_ID = 'a0000000-0000-0000-0000-00000000269a';

    afterEach(async () => {
      await sql`delete from workspace_members where user_id = ${INVITEE_ID}`;
      await asManualFix(sql, async (tx) => {
        await tx`delete from users where id = ${INVITEE_ID}`;
      });
    });

    /** Invites `email` into `workspaceId`, as owner A, and answers the row. */
    const invite = (email: string, role: 'viewer' | 'member', workspaceId = WORKSPACE_W_ID) =>
      createInvitation(asUser(A), workspaceId, { email, role }, sender());

    /** The rows of an address that are still pending. */
    const pendingFor = async (email: string) =>
      (await invitations()).filter(
        (row) => row.email === email && row.revoked_at === null && row.accepted_at === null,
      );

    it('replaces the pending invitation to the same address and coven, the newest being the one left', async () => {
      const first = await invite(INVITED, 'viewer');
      // Why the first could have stayed: it is pending, and the same coven's.
      expect(await pendingFor(INVITED)).toHaveLength(1);

      const second = await invite(INVITED, 'member');

      const pending = await pendingFor(INVITED);
      expect(pending.map((row) => row.id)).toEqual([second.id]);
      const [replaced] = (await invitations()).filter((row) => row.id === first.id);
      expect(replaced.revoked_at).not.toBeNull();
      expect(replaced.updated_by).toBe(A.id);
    });

    it("applies the new invitation's role, though it differs from the old one's", async () => {
      await invite(INVITED, 'viewer');
      await invite(INVITED, 'member');

      expect((await pendingFor(INVITED)).map((row) => row.role)).toEqual(['member']);
    });

    it('matches the address in any case', async () => {
      await invite(INVITED, 'viewer');
      await invite(INVITED.toUpperCase(), 'member');

      expect(await pendingFor(INVITED)).toHaveLength(1);
    });

    it('replaces nothing when the new invitation is refused', async () => {
      await invite(INVITED, 'viewer');

      await expect(invite(INVITED, 'owner' as 'member')).rejects.toThrow(ValidationError);

      expect(await pendingFor(INVITED)).toHaveLength(1);
    });

    it("leaves another coven's pending invitation to the address alone", async () => {
      const other = await insertCoven(OTHER_COVEN, [[A.id, 'owner']]);
      // Why it could have been replaced: the same address, pending, and A owns both.
      await invite(INVITED, 'viewer', other);

      await invite(INVITED, 'member');

      expect((await pendingFor(INVITED)).map((row) => row.workspace_id).sort()).toEqual(
        [other, WORKSPACE_W_ID].sort(),
      );
    });

    it("leaves a site-tier invitation to the address alone, as it leaves a coven's", async () => {
      await sql`
        insert into invitations (email, token_hash, site_role, created_by, updated_by, expires_at)
        values (${INVITED}, 'site-hash', 'admin', ${A.id}, ${A.id}, now() + interval '7 days')`;

      await invite(INVITED, 'member');

      expect(await pendingFor(INVITED)).toHaveLength(2);
    });

    it.each([
      ['an accepted', 'accepted_at = now(), accepted_by = ' + `'${B.id}'`],
      ['a lapsed', "expires_at = now() - interval '1 second'"],
    ])('leaves %s invitation to the address as it was', async (_what, stamp) => {
      const old = await invite(INVITED, 'viewer');
      await sql.unsafe(`update invitations set ${stamp} where id = '${old.id}'`);
      const before = (await invitations()).find((row) => row.id === old.id);

      await invite(INVITED, 'member');

      const after = (await invitations()).find((row) => row.id === old.id);
      expect(after).toEqual(before);
    });

    it('refuses the replaced link, by its token and by its id on the account page', async () => {
      const as = { id: INVITEE_ID, role: 'user' as const };
      await asManualFix(sql, async (tx) => {
        await tx`
          insert into users (id, name, email, email_verified, role, can_create_workspace, created_by, updated_by)
          values (${as.id}, 'Fixture Invitee', ${INVITED}, true, 'user', false, ${as.id}, ${as.id})`;
      });
      const first = await invite(INVITED, 'viewer');
      const firstToken = mailedTo(INVITED).token;
      send.mockClear();
      await invite(INVITED, 'member');
      // Why the old link could have worked: the address is the account's, verified.
      expect(firstToken).not.toBe(mailedTo(INVITED).token);

      await expect(acceptInvitation(asUser(as), firstToken)).rejects.toThrow(Forbidden);
      await expect(acceptInvitationById(asUser(as), first.id)).rejects.toThrow(Forbidden);
      expect(
        await sql`select 1 from workspace_members where user_id = ${as.id} and deleted_at is null`,
      ).toHaveLength(0);
    });
  });

  it('refuses an address that belongs to a live member of the coven, in any case, writing and mailing nothing', async () => {
    // Why the refusal is the check's: B is a live member holding this address.
    const [member] = await sql`
      select m.role from workspace_members m join users u on u.id = m.user_id
      where m.workspace_id = ${WORKSPACE_W_ID} and u.email = ${B.email} and m.deleted_at is null`;
    expect(member.role).toBe('member');

    for (const email of [B.email, B.email.toUpperCase()]) {
      await expect(
        createInvitation(asUser(A), WORKSPACE_W_ID, { email, role: 'viewer' }, sender()),
      ).rejects.toMatchObject({ issues: [{ path: ['email'] }] });
    }

    expect(await invitations()).toEqual([]);
    expect(send).not.toHaveBeenCalled();
  });

  it("invites an address whose membership was removed, which is no member's", async () => {
    const covenId = await insertCoven('Fixture Removed Member Coven', [
      [A.id, 'owner'],
      [B.id, 'member'],
    ]);
    await sql`
      update workspace_members set deleted_at = now()
      where workspace_id = ${covenId} and user_id = ${B.id}`;

    await createInvitation(asUser(A), covenId, { email: B.email, role: 'viewer' }, sender());

    expect((await invitations())[0]).toMatchObject({ workspace_id: covenId, email: B.email });
  });

  it('leaves the invitation pending, and answers it, when the transport fails', async () => {
    mail.real = true;
    vi.stubEnv('VERCEL_ENV', '');
    vi.stubEnv('MAIL_TRANSPORT', 'mailpit');
    vi.stubEnv('MAILPIT_URL', 'http://mailpit.test:8025');
    const fetched = vi.fn(async () => new Response('down', { status: 500 }));
    vi.stubGlobal('fetch', fetched);
    const logged = vi.spyOn(console, 'error').mockImplementation(() => {});

    const row = await createInvitation(
      asUser(A),
      WORKSPACE_W_ID,
      { email: INVITED, role: 'member' },
      sender(),
    );

    // Why the failure is the transport's: it was asked, and it refused.
    expect(fetched).toHaveBeenCalledOnce();
    expect(logged).toHaveBeenCalled();
    expect(row.id).toBe((await invitations())[0].id);
    expect((await invitations())[0]).toMatchObject({ accepted_at: null, revoked_at: null });
  });
});

describe('createInvitation mail limit', () => {
  const LIMIT = INVITATION_MAIL_LIMIT;

  /** `count` invitations A sent `ageMinutes` ago, through the raw client. */
  async function sentBy(userId: string, count: number, ageMinutes: number) {
    for (let i = 0; i < count; i += 1) {
      await sql`
        insert into invitations (workspace_id, email, role, token_hash, created_by, updated_by, created_at)
        values (${WORKSPACE_W_ID}, ${`old${i}-${userId}${DOMAIN}`}, 'viewer', ${`hash-${userId}-${ageMinutes}-${i}`},
          ${userId}, ${userId}, now() - make_interval(mins => ${ageMinutes}))`;
    }
  }

  const invite = (as: typeof A, email: string) =>
    createInvitation(asUser(as), WORKSPACE_W_ID, { email, role: 'viewer' }, sender());

  it('refuses the next invitation at the limit, says when to try again, and sends and writes nothing', async () => {
    await sentBy(A.id, LIMIT, 10);
    const before = await invitations();

    const refusal = await invite(A, INVITED).catch((error: unknown) => error);

    expect(refusal).toBeInstanceOf(ValidationError);
    expect((refusal as ValidationError).issues[0].message).toMatch(/try again/i);
    expect(await invitations()).toEqual(before);
    expect(send).not.toHaveBeenCalled();
  });

  // A resend is a repeat invitation to an address that already has one pending.
  it('refuses a resend at the limit too', async () => {
    await invite(A, INVITED);
    await sentBy(A.id, LIMIT - 1, 10);
    send.mockClear();

    await expect(invite(A, INVITED)).rejects.toBeInstanceOf(ValidationError);
    expect(send).not.toHaveBeenCalled();
  });

  // The preconditions: the same sender, one invitation under the limit, succeeds; a second sender is unaffected.
  it('lets a sender under the limit invite, and does not count another sender', async () => {
    await sentBy(A.id, LIMIT - 1, 10);
    await expect(invite(A, INVITED)).resolves.toMatchObject({ email: INVITED });

    await expect(
      createInvitation(
        asUser(A),
        WORKSPACE_W_ID,
        { email: `second${DOMAIN}`, role: 'viewer' },
        sender(),
      ),
    ).rejects.toBeInstanceOf(ValidationError);

    const otherCoven = await insertCoven('Mail Limit Other', [[D.id, 'owner']]);
    await expect(
      createInvitation(
        asUser(D),
        otherCoven,
        { email: `third${DOMAIN}`, role: 'viewer' },
        sender(),
      ),
    ).resolves.toMatchObject({ workspaceId: otherCoven });
  });

  it('forgets invitations older than the window', async () => {
    await sentBy(A.id, LIMIT, INVITATION_MAIL_WINDOW_MINUTES + 1);
    await expect(invite(A, INVITED)).resolves.toMatchObject({ email: INVITED });
  });
});
