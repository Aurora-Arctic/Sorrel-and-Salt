import { createHash } from 'node:crypto';
import { beforeEach, describe, expect, it } from 'vitest';
import { rotateInvitationToken } from '@/db/repository';
import { WORKSPACE_W_ID } from '@/db/seed/standard';
import { SYSTEM_ACTOR_ID } from '@/lib/system-actor';
import { A, E } from '../../support/as-user';
import { sql, useRawClient } from '../../support/db/probe-tables';
import { makeWorkspace, workspaceColumns } from '../../support/fixtures';

useRawClient();

// The one write that reaches an invitation with no proof: the invitation mail's step, which holds the invitation's id
// alone, swaps in a fresh token's hash and is handed the token to mail. It stamps the row as the System account, and
// touches only a pending address invitation in a live coven or on the site tier.

const STALE = 'fixture-token-aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa';
const sha256 = (value: string) => createHash('sha256').update(value).digest('hex');

beforeEach(async () => {
  await sql`truncate card_invitation_attempts, invitations`;
});

type Stamps = {
  accepted_at?: Date | null;
  accepted_by?: string | null;
  revoked_at?: Date | null;
  declined_at?: Date | null;
  expires_at?: Date;
  deleted_at?: Date | null;
};

/** A coven invitation into W from A, through the raw client. */
async function covenInvitation(stamps: Stamps = {}): Promise<string> {
  const [row] = await sql`
    insert into invitations ${sql({
      workspace_id: WORKSPACE_W_ID,
      email: 'invited@rotation.test',
      role: 'member',
      token_hash: sha256(STALE),
      created_by: A.id,
      updated_by: A.id,
      expires_at: new Date(Date.now() + 86_400_000),
      ...stamps,
    })}
    returning id`;
  return row!.id as string;
}

/** A site-tier invitation from E, through the raw client. */
async function siteInvitation(): Promise<string> {
  const [row] = await sql`
    insert into invitations ${sql({
      email: 'curator@rotation.test',
      site_role: 'curator',
      token_hash: sha256(STALE),
      created_by: E.id,
      updated_by: E.id,
      expires_at: new Date(Date.now() + 86_400_000),
    })}
    returning id`;
  return row!.id as string;
}

/** A printed card, bound to no address. */
async function card(): Promise<string> {
  const [row] = await sql`
    insert into invitations ${sql({
      kind: 'card',
      batch_id: crypto.randomUUID(),
      position: 1,
      token_hash: sha256(STALE),
      created_by: E.id,
      updated_by: E.id,
      expires_at: new Date(Date.now() + 86_400_000),
    })}
    returning id`;
  return row!.id as string;
}

const stored = async (id: string) =>
  (
    await sql<
      { token_hash: string; updated_by: string; updated_at: Date }[]
    >`select token_hash, updated_by, updated_at from invitations where id = ${id}`
  )[0]!;

describe('rotateInvitationToken', () => {
  it('writes the hash of a fresh token on a pending coven invitation, stamped as the System account, and returns the token', async () => {
    const id = await covenInvitation();
    // Precondition: the row holds the stale token's hash, stamped by the inviter.
    expect(await stored(id)).toMatchObject({ token_hash: sha256(STALE), updated_by: A.id });

    const rotated = await rotateInvitationToken(id);

    expect(rotated?.invitation).toMatchObject({ id, createdBy: A.id, workspaceId: WORKSPACE_W_ID });
    const token = rotated!.token;
    expect(token).toMatch(/^[A-Za-z0-9_-]{43}$/);
    expect(await stored(id)).toMatchObject({
      token_hash: sha256(token),
      updated_by: SYSTEM_ACTOR_ID,
    });
    expect(rotated!.invitation.tokenHash).toBe(sha256(token));
  });

  it('rotates a pending site-tier invitation too', async () => {
    const id = await siteInvitation();

    const rotated = await rotateInvitationToken(id);

    expect(rotated?.invitation.siteRole).toBe('curator');
    expect((await stored(id)).token_hash).toBe(sha256(rotated!.token));
  });

  it('gives a fresh token each time, so only the newest names the row', async () => {
    const id = await covenInvitation();

    const first = await rotateInvitationToken(id);
    const second = await rotateInvitationToken(id);

    expect(second!.token).not.toBe(first!.token);
    expect((await stored(id)).token_hash).toBe(sha256(second!.token));
  });

  const closed: [string, () => Promise<string>][] = [
    [
      'an accepted invitation',
      () => covenInvitation({ accepted_at: new Date(), accepted_by: A.id }),
    ],
    ['a revoked invitation', () => covenInvitation({ revoked_at: new Date() })],
    ['a declined invitation', () => covenInvitation({ declined_at: new Date() })],
    ['an expired invitation', () => covenInvitation({ expires_at: new Date(Date.now() - 1000) })],
    ['a deleted invitation', () => covenInvitation({ deleted_at: new Date() })],
    ['a printed card', card],
  ];

  for (const [what, make] of closed) {
    it(`writes nothing and returns null for ${what}`, async () => {
      const id = await make();
      const before = await stored(id);

      expect(await rotateInvitationToken(id)).toBeNull();

      expect(await stored(id)).toEqual(before);
    });
  }

  it('writes nothing for an invitation into a deleted coven', async () => {
    const [coven] = await sql`
      insert into workspaces ${sql({ ...workspaceColumns(makeWorkspace({ name: 'Testwort Hollow' })), created_by: A.id, updated_by: A.id, deleted_at: new Date() })}
      returning id`;
    const [row] = await sql`
      insert into invitations ${sql({
        workspace_id: coven!.id as string,
        email: 'invited@rotation.test',
        role: 'member',
        token_hash: sha256(STALE),
        created_by: A.id,
        updated_by: A.id,
        expires_at: new Date(Date.now() + 86_400_000),
      })}
      returning id`;
    const id = row!.id as string;
    const before = await stored(id);

    expect(await rotateInvitationToken(id)).toBeNull();

    expect(await stored(id)).toEqual(before);
  });

  it('returns null for an id no invitation has', async () => {
    expect(await rotateInvitationToken(crypto.randomUUID())).toBeNull();
  });
});
