import { describe, expect, it } from 'vitest';
import { findWorkspaceRole } from '@/db/repository';
import { Forbidden, ValidationError } from '@/lib/errors';
import { slugify } from '@/lib/slugify';
import {
  assertMembership,
  createWorkspace,
  deleteWorkspace,
  renameWorkspace,
} from '@/modules/coven';
import { A, B, C, D, E, asUser } from '../../../support/as-user';
import { sql, useRawClient } from '../../../support/db/probe-tables';
import { makeWorkspace, workspaceColumns } from '../../../support/fixtures';

useRawClient();

type Role = 'owner' | 'member' | 'viewer';

const token = () => crypto.randomUUID().slice(0, 8);

// A coven written as the seed and creation write one: its row, its seats, and its current address in `workspace_slugs`.
async function insertCoven(
  name: string,
  members: [string, Role][] = [[A.id, 'owner']],
): Promise<{ id: string; slug: string }> {
  const [row] = await sql`
    insert into workspaces ${sql({ ...workspaceColumns(makeWorkspace({ name })), created_by: A.id, updated_by: A.id })}
    returning id, slug`;
  await sql`
    insert into workspace_slugs (workspace_id, slug, created_by, updated_by)
    values (${row.id}, ${row.slug}, ${A.id}, ${A.id})`;
  for (const [userId, role] of members) {
    await sql`
      insert into workspace_members (workspace_id, user_id, role, created_by, updated_by)
      values (${row.id}, ${userId}, ${role}, ${A.id}, ${A.id})`;
  }
  return { id: row.id as string, slug: row.slug as string };
}

const stored = async (id: string) =>
  (await sql`select name, slug, updated_by from workspaces where id = ${id}`)[0];

const addressesOf = async (id: string) =>
  (
    await sql<{ slug: string }[]>`
      select slug from workspace_slugs where workspace_id = ${id} and deleted_at is null order by slug`
  ).map(({ slug }) => slug);

describe('renameWorkspace', () => {
  it('renames the coven for a steward, moving its address and keeping the old one, stamped from the session', async () => {
    const t = token();
    const coven = await insertCoven(`Fixture Before ${t}`, [
      [A.id, 'owner'],
      [B.id, 'member'],
    ]);

    const renamed = await renameWorkspace(asUser(A), coven.id, { name: `Fixture After ${t}` });

    expect(renamed).toMatchObject({
      id: coven.id,
      name: `Fixture After ${t}`,
      slug: `fixture-after-${t}`,
    });
    expect(await stored(coven.id)).toEqual({
      name: `Fixture After ${t}`,
      slug: `fixture-after-${t}`,
      updated_by: A.id,
    });
    expect(await addressesOf(coven.id)).toEqual([coven.slug, `fixture-after-${t}`].sort());
    // Written inside `withAudit`: the new address row carries the session's actor.
    const [recorded] = await sql`
      select created_by from workspace_slugs where workspace_id = ${coven.id} and slug = ${`fixture-after-${t}`}`;
    expect(recorded?.created_by).toBe(A.id);
  });

  it('trims the name, as creation does', async () => {
    const coven = await insertCoven(`Fixture Untrimmed ${token()}`);

    const renamed = await renameWorkspace(asUser(A), coven.id, { name: '  Fixture Trimmed  ' });

    expect(renamed.name).toBe('Fixture Trimmed');
  });

  describe('who is refused, by a direct call naming the coven', () => {
    it.each([
      ['a practitioner', B, 'member'],
      ['an observer', C, 'viewer'],
    ] as const)('refuses %s, who holds a live seat in it', async (_who, user, role) => {
      const coven = await insertCoven(`Fixture Seated Refusal ${token()}`, [
        [A.id, 'owner'],
        [B.id, 'member'],
        [C.id, 'viewer'],
      ]);
      const before = await stored(coven.id);
      // Why the refusal is the permission's: the caller reads the coven, and A, a steward, may rename it.
      await expect(findWorkspaceRole(user.id, coven.id)).resolves.toBe(role);
      await expect(
        assertMembership(asUser(user), coven.id, { workspace: ['read'] }),
      ).resolves.toBeTruthy();
      await expect(
        assertMembership(asUser(A), coven.id, { workspace: ['update'] }),
      ).resolves.toBeTruthy();

      await expect(
        renameWorkspace(asUser(user), coven.id, { name: 'Fixture Taken Over' }),
      ).rejects.toThrow(Forbidden);

      expect(await stored(coven.id)).toEqual(before);
      expect(await addressesOf(coven.id)).toEqual([coven.slug]);
    });

    it('refuses a steward of another coven, who holds no seat in this one', async () => {
      const coven = await insertCoven(`Fixture Stranger Refusal ${token()}`);
      const own = await insertCoven(`Fixture Stranger Own ${token()}`, [[D.id, 'owner']]);
      const before = await stored(coven.id);
      // Why the refusal is the coven's: D renames a coven of D's own, and holds no seat in this one.
      await expect(findWorkspaceRole(D.id, coven.id)).resolves.toBeUndefined();
      await expect(findWorkspaceRole(D.id, own.id)).resolves.toBe('owner');
      await renameWorkspace(asUser(D), own.id, { name: `Fixture Stranger Renamed ${token()}` });

      await expect(
        renameWorkspace(asUser(D), coven.id, { name: 'Fixture Taken Over' }),
      ).rejects.toThrow(Forbidden);

      expect(await stored(coven.id)).toEqual(before);
    });

    it('refuses a site keeper with no seat in the coven', async () => {
      const coven = await insertCoven(`Fixture Keeper Refusal ${token()}`);
      const before = await stored(coven.id);
      // Why the refusal is the seat's: E is a keeper, so a site role alone would let E through.
      expect(asUser(E).role).toBe('admin');
      await expect(findWorkspaceRole(E.id, coven.id)).resolves.toBeUndefined();

      await expect(
        renameWorkspace(asUser(E), coven.id, { name: 'Fixture Taken Over' }),
      ).rejects.toThrow(Forbidden);

      expect(await stored(coven.id)).toEqual(before);
    });

    it('refuses an id that names no coven, and a deleted coven, as it refuses a stranger', async () => {
      const coven = await insertCoven(`Fixture Deleted Rename ${token()}`);
      await deleteWorkspace(asUser(A), coven.id);

      await expect(
        renameWorkspace(asUser(A), crypto.randomUUID(), { name: 'Fixture Nowhere' }),
      ).rejects.toThrow(Forbidden);
      await expect(
        renameWorkspace(asUser(A), coven.id, { name: 'Fixture Revived' }),
      ).rejects.toThrow(Forbidden);
    });
  });

  describe('the name', () => {
    it.each([
      ['blank', ''],
      ['only spaces', '   '],
      ['81 characters', 'F'.repeat(81)],
    ])('refuses a name that is %s, writing nothing', async (_what, name) => {
      const coven = await insertCoven(`Fixture Bad Name ${token()}`);
      const before = await stored(coven.id);

      await expect(renameWorkspace(asUser(A), coven.id, { name })).rejects.toThrow(ValidationError);

      expect(await stored(coven.id)).toEqual(before);
      expect(await addressesOf(coven.id)).toEqual([coven.slug]);
    });

    it('admits a name of exactly 80 characters', async () => {
      const coven = await insertCoven(`Fixture Long Name ${token()}`);
      const name = `Fixture ${'L'.repeat(72)}`;
      expect(name).toHaveLength(80);

      await expect(renameWorkspace(asUser(A), coven.id, { name })).resolves.toMatchObject({ name });
    });
  });

  it('refuses the demo coven to a steward who holds the update permission, and still renames an ordinary one', async () => {
    const demo = await insertCoven(`Fixture Demo Rename ${token()}`);
    await sql`update workspaces set demo = true where id = ${demo.id}`;
    const ordinary = await insertCoven(`Fixture Ordinary Rename ${token()}`);
    const before = await stored(demo.id);
    // Why the refusal is the demo rule's: A holds the update permission in both.
    await expect(
      assertMembership(asUser(A), demo.id, { workspace: ['update'] }),
    ).resolves.toBeTruthy();
    await expect(
      assertMembership(asUser(A), ordinary.id, { workspace: ['update'] }),
    ).resolves.toBeTruthy();

    await expect(
      renameWorkspace(asUser(A), demo.id, { name: 'Fixture Demo Renamed' }),
    ).rejects.toThrow(Forbidden);
    expect(await stored(demo.id)).toEqual(before);

    await expect(
      renameWorkspace(asUser(A), ordinary.id, { name: `Fixture Ordinary Renamed ${token()}` }),
    ).resolves.toBeTruthy();
  });
});

describe("renameWorkspace and the coven's address", () => {
  it('takes the address from slugify', async () => {
    const coven = await insertCoven(`Fixture Slugged ${token()}`);
    const name = `Fixture Ünusual & Odd — Name ${token()}`;

    const renamed = await renameWorkspace(asUser(A), coven.id, { name });

    expect(renamed.slug).toBe(slugify(name));
  });

  it("numbers the address when another live coven's current address is it", async () => {
    const t = token();
    await insertCoven(`Fixture Holder ${t}`);
    const coven = await insertCoven(`Fixture Mover ${t}`);

    const renamed = await renameWorkspace(asUser(A), coven.id, { name: `Fixture Holder ${t}` });

    expect(renamed.slug).toBe(`fixture-holder-${t}-2`);
    expect(renamed.name).toBe(`Fixture Holder ${t}`);
  });

  it('numbers the address when another live coven holds it as an old address', async () => {
    const t = token();
    const holder = await insertCoven(`Fixture Once ${t}`);
    await renameWorkspace(asUser(A), holder.id, { name: `Fixture Since ${t}` });
    // Precondition: the old address is held, and no coven's current address is it.
    expect(await addressesOf(holder.id)).toContain(`fixture-once-${t}`);
    expect(await sql`select id from workspaces where slug = ${`fixture-once-${t}`}`).toHaveLength(
      0,
    );
    const coven = await insertCoven(`Fixture Other ${t}`);

    const renamed = await renameWorkspace(asUser(A), coven.id, { name: `Fixture Once ${t}` });

    expect(renamed.slug).toBe(`fixture-once-${t}-2`);
  });

  it("takes an address a deleted coven held, once that coven's addresses are freed", async () => {
    const t = token();
    const gone = await insertCoven(`Fixture Freed ${t}`);
    await renameWorkspace(asUser(A), gone.id, { name: `Fixture Freed Later ${t}` });
    await deleteWorkspace(asUser(A), gone.id);
    const coven = await insertCoven(`Fixture Taker ${t}`);

    const renamed = await renameWorkspace(asUser(A), coven.id, { name: `Fixture Freed ${t}` });

    expect(renamed.slug).toBe(`fixture-freed-${t}`);
  });

  it.each([
    ['New', 'new-2'],
    ['Spell', 'spell-2'],
    ['Ingredient', 'ingredient-2'],
  ])('never takes a reserved address: %s becomes %s', async (name, slug) => {
    const coven = await insertCoven(`Fixture Reserved ${token()}`);

    const renamed = await renameWorkspace(asUser(A), coven.id, { name });

    expect(renamed.slug).toBe(slug);
    expect(
      await sql`select id from workspace_slugs where slug = ${name.toLowerCase()}`,
    ).toHaveLength(0);
  });

  it('keeps the address when the new name slugs to it, rather than numbering against itself', async () => {
    const t = token();
    const coven = await insertCoven(`Fixture Same ${t}`);

    const renamed = await renameWorkspace(asUser(A), coven.id, { name: `FIXTURE same ${t}` });

    expect(renamed.slug).toBe(coven.slug);
    expect(await addressesOf(coven.id)).toEqual([coven.slug]);
  });

  it('takes its own old address back plain, without a second row for it', async () => {
    const t = token();
    const coven = await insertCoven(`Fixture Round ${t}`);
    await renameWorkspace(asUser(A), coven.id, { name: `Fixture Trip ${t}` });

    const back = await renameWorkspace(asUser(A), coven.id, { name: `Fixture Round ${t}` });

    expect(back.slug).toBe(coven.slug);
    expect(await addressesOf(coven.id)).toEqual([coven.slug, `fixture-trip-${t}`].sort());
  });
});

describe('createWorkspace and the addresses other covens hold', () => {
  it('records the new coven’s address in the table', async () => {
    const created = await createWorkspace(asUser(A), { name: `Fixture Recorded ${token()}` });

    expect(await addressesOf(created.id)).toEqual([created.slug]);
  });

  it("never takes another live coven's old address", async () => {
    const t = token();
    const holder = await insertCoven(`Fixture Former ${t}`);
    await renameWorkspace(asUser(A), holder.id, { name: `Fixture Latter ${t}` });
    // Precondition: no coven's current address is the old one, so only the old address can refuse it.
    expect(await sql`select id from workspaces where slug = ${`fixture-former-${t}`}`).toHaveLength(
      0,
    );

    const created = await createWorkspace(asUser(A), { name: `Fixture Former ${t}` });

    expect(created.slug).toBe(`fixture-former-${t}-2`);
  });
});
