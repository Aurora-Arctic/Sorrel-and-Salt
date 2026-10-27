import { beforeEach, describe, expect, it } from 'vitest';
import type postgres from 'postgres';
import { findOneSpell, findPageInReadableSpells } from '@/db/repository';
import { WORKSPACE_W_ID, WORKSPACE_X_ID } from '@/db/seed/standard';
import { type Membership, assertMembership } from '@/modules/coven';
import type { SpellVisibility } from '@/modules/grimoire';
import { spellSteps } from '@/modules/grimoire/schema/spell-steps';
import { spells } from '@/modules/grimoire/schema/spells';
import { A, B, D, asUser } from '../../support/as-user';
import { useTestDatabase } from '../../support/db/database';
import { insertSpell } from '../../support/db/insert-spell';
import { makeSpell } from '../../support/fixtures';
import type { PageRequest } from '@/lib/types';

// M10.9: the cursor-page reader for spells and the tables hung off a spell,
// `findPageInReadableSpells`. It ANDs `readableSpells` (M10.6) itself, so a
// page can only ever hold what the direct-id read would return: the coven's
// shared spells and this reader's own private ones (DESIGN.md §5, CLAUDE.md
// rule 7). Every refusal first proves the row is there and its author pages it.

let sql: postgres.Sql;
useTestDatabase((client) => {
  sql = client;
});

beforeEach(async () => {
  await sql`truncate spells cascade`;
});

type User = typeof A;

const FIRST_PAGE: PageRequest = { limit: 100, inverted: false };

const proofFor = (user: User, workspaceId: string = WORKSPACE_W_ID): Promise<Membership> =>
  assertMembership(asUser(user), workspaceId, { spell: ['read'] });

const spellBy = (
  author: User,
  title: string,
  visibility: SpellVisibility,
  workspaceId: string = WORKSPACE_W_ID,
): Promise<string> =>
  insertSpell(
    sql,
    makeSpell({ title, visibility, workspaceId, steps: [{ body: `${title}, stirred.` }] }),
    author.id,
  );

const spellPage = async (membership: Membership) =>
  (await findPageInReadableSpells(membership, spells, [spells.title], FIRST_PAGE)).map(
    (entry) => entry.node.title,
  );

const stepPage = async (membership: Membership) =>
  // Every fixture step sits at place 1 of its own spell, so the order is the
  // id's and the bodies are compared as a set.
  (await findPageInReadableSpells(membership, spellSteps, [spellSteps.layerOrder], FIRST_PAGE))
    .map((entry) => entry.node.body)
    .sort();

describe('findPageInReadableSpells', () => {
  let bPrivate: string;

  beforeEach(async () => {
    await spellBy(A, 'Ash Ward', 'workspace');
    await spellBy(A, 'Birch Charm', 'private');
    bPrivate = await spellBy(B, 'Cedar Knot', 'private');
    await spellBy(D, 'Damson Seal', 'workspace', WORKSPACE_X_ID);
  });

  it('pages the coven’s shared spells and the reader’s own private ones, and nothing else', async () => {
    // The precondition: B's private spell and X's shared spell are there, and
    // each is paged by someone the rule admits.
    expect(await spellPage(await proofFor(B))).toEqual(['Ash Ward', 'Cedar Knot']);
    expect(await spellPage(await proofFor(D, WORKSPACE_X_ID))).toEqual(['Damson Seal']);

    expect(await spellPage(await proofFor(A))).toEqual(['Ash Ward', 'Birch Charm']);
  });

  it('refuses B’s private spell to A by direct id as well as from the page', async () => {
    const owner = await proofFor(A);
    expect(await findOneSpell(await proofFor(B), bPrivate)).toMatchObject({ id: bPrivate });

    await expect(findOneSpell(owner, bPrivate)).resolves.toBeUndefined();
    const page = await findPageInReadableSpells(owner, spells, [spells.title], FIRST_PAGE);
    expect(page.map((entry) => entry.node.id)).not.toContain(bPrivate);
  });

  it('pages a spell-scoped table only under the spells the reader may read', async () => {
    expect(await stepPage(await proofFor(B))).toEqual([
      'Ash Ward, stirred.',
      'Cedar Knot, stirred.',
    ]);
    expect(await stepPage(await proofFor(D, WORKSPACE_X_ID))).toEqual(['Damson Seal, stirred.']);

    expect(await stepPage(await proofFor(A))).toEqual([
      'Ash Ward, stirred.',
      'Birch Charm, stirred.',
    ]);
  });

  it('leaves out a soft-deleted spell and a soft-deleted step', async () => {
    const owner = await proofFor(A);
    expect(await spellPage(owner)).toEqual(['Ash Ward', 'Birch Charm']);

    await sql`update spells set deleted_at = now(), deleted_by = ${A.id} where title = 'Ash Ward'`;
    await sql`
      update spell_steps set deleted_at = now(), deleted_by = ${A.id}
      where body = 'Birch Charm, stirred.'`;

    expect(await spellPage(owner)).toEqual(['Birch Charm']);
    expect(await stepPage(owner)).toEqual([]);
  });

  it('continues from a cursor under the same rule', async () => {
    const owner = await proofFor(A);
    const [first, ...rest] = await findPageInReadableSpells(owner, spells, [spells.title], {
      limit: 1,
      inverted: false,
    });
    expect(first.node.title).toBe('Ash Ward');
    expect(rest).toEqual([]);

    const next = await findPageInReadableSpells(owner, spells, [spells.title], {
      limit: 10,
      inverted: false,
      after: first.cursor,
    });
    expect(next.map((entry) => entry.node.title)).toEqual(['Birch Charm']);
  });
});
