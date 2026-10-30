import { beforeEach, describe, expect, it, vi } from 'vitest';
import type postgres from 'postgres';
import { WORKSPACE_W_ID } from '@/db/seed/standard';
import type { Unit } from '@/modules/ingredients/schema/units';
import { A, B, C, E, asUser } from '../../../support/as-user';
import { useTestDatabase } from '../../../support/db/database';
import { insertIngredient } from '../../../support/db/insert-ingredient';
import { insertSpell } from '../../../support/db/insert-spell';
import { insertStock } from '../../../support/db/insert-stock';
import { variantIdOf } from '../../../support/db/read-variants';
import { makeIngredient, makeSpell, makeVariant } from '../../../support/fixtures';
import { run } from '../../../support/graphql/run';

// Workings over the wire: a spell's pages of them, the count beside it, the preview, and the four writes. Who may do what is
// services/workings.test.ts's; here are the shape, the reads a page costs, the preview matching completion, and the error codes.
const repository = vi.hoisted(() => ({
  findWorkingsPage: vi.fn(),
  findParticipantsOfWorkings: vi.fn(),
  findDeductionsOfWorkings: vi.fn(),
  findCompleteWorkingCounts: vi.fn(),
}));
vi.mock('@/db/repository', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@/db/repository')>();
  for (const [name, spy] of Object.entries(repository)) {
    spy.mockImplementation(actual[name as keyof typeof repository]);
  }
  return { ...actual, ...repository };
});

let sql: postgres.Sql;
useTestDatabase((client) => {
  sql = client;
});

beforeEach(async () => {
  await sql`truncate spells, ingredients cascade`;
  for (const spy of Object.values(repository)) spy.mockClear();
});

const reads = () => Object.values(repository).reduce((sum, spy) => sum + spy.mock.calls.length, 0);

const WORKING = `id spellId status workedOn note visibility completedAt
  participants { userId name }
  deductions { stepId quantity unit shortfall }
  warnings { stepId reason }`;

const RECORD = `mutation ($workspaceId: ID!, $spellId: ID!, $input: WorkingInput!) {
  recordWorking(workspaceId: $workspaceId, spellId: $spellId, input: $input) { ${WORKING} }
}`;
const UPDATE = `mutation ($workspaceId: ID!, $id: ID!, $input: WorkingInput!) {
  updateWorking(workspaceId: $workspaceId, id: $id, input: $input) { ${WORKING} }
}`;
const COMPLETE = `mutation ($workspaceId: ID!, $id: ID!) {
  completeWorking(workspaceId: $workspaceId, id: $id) { working { ${WORKING} } warnings { stepId reason } }
}`;
const DELETE = `mutation ($workspaceId: ID!, $id: ID!) { deleteWorking(workspaceId: $workspaceId, id: $id) }`;
const PREVIEW = `query ($workspaceId: ID!, $spellId: ID!) {
  workingDeductionPreview(workspaceId: $workspaceId, spellId: $spellId) {
    deductions { stepId inventoryItemId quantity unit shortfall before lowStockThreshold }
    warnings { stepId reason }
  }
}`;
const SPELLS = `query ($workspaceId: ID!) {
  grimoire(workspaceId: $workspaceId) {
    edges { node { id workingCount workings(first: 10) { edges { node { id participants { name } } } } } }
  }
}`;

async function stocked(
  name: string,
  quantity: string | null,
  unit: Unit | null,
  lowStockThreshold: string | null = null,
) {
  const ingredientId = await insertIngredient(
    sql,
    makeIngredient({ workspaceId: null, name, nomenclature: 'none', variants: [makeVariant()] }),
    E.id,
  );
  const variantId = await variantIdOf(sql, ingredientId, 'Testform');
  const jarId = await insertStock(
    sql,
    {
      workspaceId: WORKSPACE_W_ID,
      ingredientId,
      variantId,
      quantityOnHand: quantity,
      unit,
      lowStockThreshold,
    },
    A.id,
  );
  return { ingredientId, jarId };
}

const spellBy = (author: typeof A, extra: Parameters<typeof makeSpell>[0] = {}) =>
  insertSpell(
    sql,
    makeSpell({
      workspaceId: WORKSPACE_W_ID,
      status: 'complete',
      visibility: 'workspace',
      steps: [{ body: 'Stir.' }],
      ...extra,
    }),
    author.id,
  );

const vars = (extra: object) => ({ workspaceId: WORKSPACE_W_ID, ...extra });
const DAY = '2026-10-01';

describe('Spell.workings and Spell.workingCount', () => {
  it('reads the workings, participants and counts of a page of spells in one query each', async () => {
    for (let i = 0; i < 3; i++) {
      const spell = await spellBy(B);
      for (let n = 0; n < 2; n++) {
        const made = await run<{ recordWorking: { id: string } }>(
          asUser(B),
          RECORD,
          vars({
            spellId: spell,
            input: { workedOn: DAY, participants: [{ userId: B.id }, { name: 'Guest Tester' }] },
          }),
        );
        await run(asUser(B), COMPLETE, vars({ id: made.data!.recordWorking.id }));
      }
    }
    for (const spy of Object.values(repository)) spy.mockClear();

    const result = await run<{
      grimoire: {
        edges: {
          node: {
            workingCount: number;
            workings: { edges: { node: { participants: { name: string | null }[] } }[] };
          };
        }[];
      };
    }>(asUser(C), SPELLS, vars({}));

    expect(result.errors).toBeUndefined();
    const nodes = result.data!.grimoire.edges.map((edge) => edge.node);
    // Why the counts mean anything: every spell answered its rows.
    expect(nodes).toHaveLength(3);
    for (const node of nodes) {
      expect(node.workingCount).toBe(2);
      expect(node.workings.edges).toHaveLength(2);
      expect(node.workings.edges[0].node.participants).toHaveLength(2);
    }
    // One count query for the page; one workings page, one participants read and one deductions read per spell.
    expect(repository.findCompleteWorkingCounts).toHaveBeenCalledTimes(1);
    expect(repository.findWorkingsPage).toHaveBeenCalledTimes(3);
    expect(repository.findParticipantsOfWorkings).toHaveBeenCalledTimes(3);
    expect(repository.findDeductionsOfWorkings).toHaveBeenCalledTimes(3);
  });

  it('counts only complete workings, and a spell with none as 0', async () => {
    const spell = await spellBy(B);
    await run(asUser(B), RECORD, vars({ spellId: spell, input: { workedOn: DAY } }));

    const result = await run<{ grimoire: { edges: { node: { workingCount: number } }[] } }>(
      asUser(B),
      SPELLS,
      vars({}),
    );

    expect(result.data!.grimoire.edges[0].node.workingCount).toBe(0);
    expect(reads()).toBeGreaterThan(0);
  });
});

describe('workingDeductionPreview', () => {
  it('equals what completion then takes, and names the steps it takes nothing for', async () => {
    const jar = await stocked('Fixture Wort', '10', 'g');
    const spell = await spellBy(B, {
      steps: [
        { ingredientId: jar.ingredientId, quantity: '4', unit: 'g' },
        { name: 'River Water', form: 'Bottled', quantity: '1', unit: 'ml' },
      ],
    });

    const preview = await run<{
      workingDeductionPreview: {
        deductions: { stepId: string; quantity: number; unit: string; shortfall: number }[];
        warnings: { stepId: string; reason: string }[];
      };
    }>(asUser(B), PREVIEW, vars({ spellId: spell }));
    const made = await run<{ recordWorking: { id: string } }>(
      asUser(B),
      RECORD,
      vars({
        spellId: spell,
        input: { workedOn: DAY },
      }),
    );
    const done = await run<{
      completeWorking: {
        working: {
          deductions: { stepId: string; quantity: number; unit: string; shortfall: number }[];
        };
        warnings: { stepId: string; reason: string }[];
      };
    }>(asUser(B), COMPLETE, vars({ id: made.data!.recordWorking.id }));

    expect(preview.errors).toBeUndefined();
    expect(done.errors).toBeUndefined();
    // Why the match means anything: one jar was taken from and one step refused.
    expect(preview.data!.workingDeductionPreview.deductions).toHaveLength(1);
    expect(preview.data!.workingDeductionPreview.warnings).toEqual([
      { stepId: expect.any(String), reason: 'CUSTOM' },
    ]);
    expect(
      preview.data!.workingDeductionPreview.deductions.map(
        ({ stepId, quantity, unit, shortfall }) => ({ stepId, quantity, unit, shortfall }),
      ),
    ).toEqual(done.data!.completeWorking.working.deductions);
    expect(preview.data!.workingDeductionPreview.warnings).toEqual(
      done.data!.completeWorking.warnings,
    );
  });

  it('says what each jar held before the take and its Low mark, from the one batched read', async () => {
    const jar = await stocked('Fixture Wort', '10', 'g', '3');
    const line = { ingredientId: jar.ingredientId, quantity: '4', unit: 'g' as const };
    const one = await spellBy(B, { steps: [line] });
    const two = await spellBy(B, { steps: [line, line] });
    type Preview = {
      workingDeductionPreview: {
        deductions: { before: number; lowStockThreshold: number | null }[];
      };
    };

    for (const spy of Object.values(repository)) spy.mockClear();
    await run<Preview>(asUser(B), PREVIEW, vars({ spellId: one }));
    const readsForOne = reads();
    for (const spy of Object.values(repository)) spy.mockClear();
    const preview = await run<Preview>(asUser(B), PREVIEW, vars({ spellId: two }));

    expect(preview.errors).toBeUndefined();
    // The second line sees what the first left, which is why the two differ.
    expect(preview.data!.workingDeductionPreview.deductions).toEqual([
      expect.objectContaining({ before: 10, lowStockThreshold: 3 }),
      expect.objectContaining({ before: 6, lowStockThreshold: 3 }),
    ]);
    // A second line costs no further read: the stock came in one batch.
    expect(reads()).toBe(readsForOne);
  });

  it('takes nothing from the jars', async () => {
    const jar = await stocked('Fixture Wort', '10', 'g');
    const spell = await spellBy(B, {
      steps: [{ ingredientId: jar.ingredientId, quantity: '4', unit: 'g' }],
    });

    await run(asUser(B), PREVIEW, vars({ spellId: spell }));

    const [row] = await sql`select quantity_on_hand from inventory_items where id = ${jar.jarId}`;
    expect(Number(row.quantity_on_hand)).toBe(10);
  });
});

describe('the writes', () => {
  it('records, updates, completes and deletes a working', async () => {
    const spell = await spellBy(B);

    const made = await run<{
      recordWorking: { id: string; status: string; participants: { userId: string }[] };
    }>(asUser(B), RECORD, vars({ spellId: spell, input: { workedOn: DAY, note: 'First' } }));
    expect(made.errors).toBeUndefined();
    const { id } = made.data!.recordWorking;
    expect(made.data!.recordWorking).toMatchObject({
      status: 'draft',
      participants: [{ userId: B.id }],
    });

    const updated = await run<{ updateWorking: { note: string; workedOn: string } }>(
      asUser(B),
      UPDATE,
      vars({ id, input: { workedOn: '2026-10-02', note: 'Second' } }),
    );
    expect(updated.data!.updateWorking).toMatchObject({ note: 'Second', workedOn: '2026-10-02' });

    const done = await run<{
      completeWorking: { working: { status: string; completedAt: string } };
    }>(asUser(B), COMPLETE, vars({ id }));
    expect(done.data!.completeWorking.working.status).toBe('complete');
    expect(done.data!.completeWorking.working.completedAt).not.toBeNull();

    const deleted = await run<{ deleteWorking: string }>(asUser(B), DELETE, vars({ id }));
    expect(deleted.data!.deleteWorking).toBe(id);
    const [row] = await sql`select deleted_at from spell_workings where id = ${id}`;
    expect(row.deleted_at).not.toBeNull();
  });

  it('answers VALIDATION at the participant that names a member and a name', async () => {
    const spell = await spellBy(B);

    const result = await run(
      asUser(B),
      RECORD,
      vars({
        spellId: spell,
        input: { workedOn: DAY, participants: [{ userId: B.id, name: 'Guest Tester' }] },
      }),
    );

    expect(result.errors?.[0]?.extensions).toMatchObject({
      code: 'VALIDATION',
      fieldErrors: [{ path: ['participants', 0] }],
    });
    expect(await sql`select id from spell_workings`).toHaveLength(0);
  });

  it('answers FORBIDDEN to a viewer, and NOT_FOUND to a spell that is not there', async () => {
    const spell = await spellBy(B);

    const viewer = await run(asUser(C), RECORD, vars({ spellId: spell, input: { workedOn: DAY } }));
    const missing = await run(
      asUser(B),
      RECORD,
      vars({
        spellId: '00000000-0000-4000-8000-000000000000',
        input: { workedOn: DAY },
      }),
    );

    expect(viewer.errors?.[0]?.extensions?.code).toBe('FORBIDDEN');
    expect(missing.errors?.[0]?.extensions?.code).toBe('NOT_FOUND');
  });

  it('carries the narrowing explanation on a complete working made private again', async () => {
    const spell = await spellBy(B);
    const made = await run<{ recordWorking: { id: string } }>(
      asUser(B),
      RECORD,
      vars({
        spellId: spell,
        input: { workedOn: DAY, visibility: 'workspace' },
      }),
    );
    const { id } = made.data!.recordWorking;
    await run(asUser(B), COMPLETE, vars({ id }));

    const result = await run(
      asUser(B),
      UPDATE,
      vars({
        id,
        input: { workedOn: DAY, visibility: 'private' },
      }),
    );

    expect(result.errors?.[0]?.extensions?.code).toBe('FORBIDDEN');
    expect(result.errors?.[0]?.message).toContain('cannot be made private again');
  });
});
