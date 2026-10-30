import { beforeEach, describe, expect, it } from 'vitest';
import type postgres from 'postgres';
import { WORKSPACE_W_ID } from '@/db/seed/standard';
import type { Session } from '@/lib/session';
import { A, B, C, E, asUser } from '../../../support/as-user';
import { useTestDatabase } from '../../../support/db/database';
import { insertCupboardEntry } from '../../../support/db/insert-cupboard-entry';
import { insertIngredient } from '../../../support/db/insert-ingredient';
import { makeIngredient } from '../../../support/fixtures';
import { run } from '../../../support/graphql/run';
import type { CupboardEntryNode } from './types';

// The three cupboard-entry mutations over the wire: the answer as a
// fresh read gives it, and the viewer refused at the field. Every rule of who
// may write what is services/cupboard-entry-writes.test.ts's.

let sql: postgres.Sql;
useTestDatabase((client) => {
  sql = client;
});

let entry: string;

beforeEach(async () => {
  await sql`truncate ingredients cascade`;
  entry = await insertIngredient(sql, makeIngredient(), E.id);
});

const FIELDS = `id label description elements colors annotated compendiumName`;

const ADD = `mutation ($workspaceId: ID!, $ingredientId: ID!, $input: CupboardEntryInput) {
  addCupboardEntry(workspaceId: $workspaceId, ingredientId: $ingredientId, input: $input) { ${FIELDS} }
}`;
const ANNOTATE = `mutation ($workspaceId: ID!, $ingredientId: ID!, $input: CupboardEntryInput!) {
  annotateCupboardEntry(workspaceId: $workspaceId, ingredientId: $ingredientId, input: $input) { ${FIELDS} }
}`;
const REMOVE = `mutation ($workspaceId: ID!, $ingredientId: ID!) {
  removeCupboardEntry(workspaceId: $workspaceId, ingredientId: $ingredientId)
}`;

const add = (session: Session, input?: Record<string, unknown>) =>
  run<{ addCupboardEntry: CupboardEntryNode }>(session, ADD, {
    workspaceId: WORKSPACE_W_ID,
    ingredientId: entry,
    input,
  });
const annotate = (session: Session, input: Record<string, unknown>) =>
  run<{ annotateCupboardEntry: CupboardEntryNode }>(session, ANNOTATE, {
    workspaceId: WORKSPACE_W_ID,
    ingredientId: entry,
    input,
  });
const remove = (session: Session) =>
  run<{ removeCupboardEntry: string }>(session, REMOVE, {
    workspaceId: WORKSPACE_W_ID,
    ingredientId: entry,
  });

async function liveRows(): Promise<number> {
  const [row] = await sql`
    select count(*)::int as count from workspace_compendium_entries
    where workspace_id = ${WORKSPACE_W_ID} and deleted_at is null`;
  return row.count as number;
}

describe('addCupboardEntry', () => {
  it('answers the row as a fresh read would, with the compendium name beside it', async () => {
    const result = await add(asUser(B), { label: 'Hedgewort', colors: [] });

    expect(result.errors).toBeUndefined();
    expect(result.data?.addCupboardEntry).toMatchObject({
      label: 'Hedgewort',
      colors: [],
      annotated: true,
      compendiumName: 'Testwort',
    });
    expect(await liveRows()).toBe(1);
  });

  it('is FORBIDDEN for a viewer, who is a member, writing nothing', async () => {
    const result = await add(asUser(C));

    expect(result.errors?.[0]?.extensions?.code).toBe('FORBIDDEN');
    expect(await liveRows()).toBe(0);
  });
});

describe('annotateCupboardEntry', () => {
  beforeEach(async () => {
    await insertCupboardEntry(
      sql,
      { workspaceId: WORKSPACE_W_ID, ingredientId: entry, description: 'Our note' },
      A.id,
    );
  });

  it('answers the row after the change, a null handing the column back', async () => {
    const result = await annotate(asUser(B), { description: null, elements: ['fire'] });

    expect(result.errors).toBeUndefined();
    expect(result.data?.annotateCupboardEntry).toMatchObject({
      description: null,
      elements: ['fire'],
    });
  });

  it('is FORBIDDEN for a viewer, leaving the row as it was', async () => {
    const result = await annotate(asUser(C), { description: 'Viewer note' });

    expect(result.errors?.[0]?.extensions?.code).toBe('FORBIDDEN');
    const [stored] = await sql`select description from workspace_compendium_entries`;
    expect(stored.description).toBe('Our note');
  });
});

describe('removeCupboardEntry', () => {
  beforeEach(async () => {
    await insertCupboardEntry(sql, { workspaceId: WORKSPACE_W_ID, ingredientId: entry }, A.id);
  });

  it('answers the compendium entry id and takes the row out', async () => {
    const result = await remove(asUser(B));

    expect(result.errors).toBeUndefined();
    expect(result.data?.removeCupboardEntry).toBe(entry);
    expect(await liveRows()).toBe(0);
  });

  it('is FORBIDDEN for a viewer, leaving the row', async () => {
    const result = await remove(asUser(C));

    expect(result.errors?.[0]?.extensions?.code).toBe('FORBIDDEN');
    expect(await liveRows()).toBe(1);
  });
});
