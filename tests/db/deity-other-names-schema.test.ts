import { beforeAll, describe, expect, it } from 'vitest';
import postgres from 'postgres';
import { failureOf, useTestDatabase } from '../support/db/database';
import { FIXTURE_USERS } from '@/db/seed/standard';

// What `deity_other_names` rows may hold: a name that is not blank, once per deity whatever its case.
// partial-unique-indexes.test.ts proves a soft-deleted row reserves nothing; this file proves the index folds case and is keyed per deity.

const AUTHOR = FIXTURE_USERS.A.id;
const UNIQUE_INDEX = 'deity_other_names_unique';

let sql: ReturnType<typeof postgres>;
useTestDatabase((client) => (sql = client));

// Two invented deities of one invented tradition.
let TESTARA: string;
let MOCKARA: string;

async function insertVocabularyRow(table: string, row: Record<string, unknown>): Promise<string> {
  const token = crypto.randomUUID().slice(0, 8);
  const [inserted] = await sql`
    insert into ${sql(table)} ${sql({
      slug: `fixture-${token}`,
      description: 'A row kept only by fixtures.',
      created_by: AUTHOR,
      updated_by: AUTHOR,
      ...row,
    } as never)}
    returning id
  `;
  return inserted.id as string;
}

const addOtherName = async (deityId: string, name: string): Promise<string> => {
  const [inserted] = await sql`
    insert into deity_other_names (deity_id, name, created_by, updated_by)
    values (${deityId}, ${name}, ${AUTHOR}, ${AUTHOR})
    returning id
  `;
  return inserted.id as string;
};

/** What a write met: the constraint that refused it, or `admitted`. */
const outcomeOf = (work: Promise<unknown>) =>
  work.then(
    () => 'admitted',
    (error: postgres.PostgresError) => error.constraint_name ?? error.message,
  );

beforeAll(async () => {
  const tradition = await insertVocabularyRow('deity_traditions', { name: 'Testfolk' });
  TESTARA = await insertVocabularyRow('deities', { name: 'Testara', tradition_id: tradition });
  MOCKARA = await insertVocabularyRow('deities', { name: 'Mockara', tradition_id: tradition });
});

describe('deity_other_names', () => {
  it('refuses a blank or space-only name', async () => {
    for (const blank of ['', '   ']) {
      const error = await failureOf(addOtherName(TESTARA, blank));

      // 23514 is check_violation, named: the CHECK refused it, not something earlier.
      expect(error.code).toBe('23514');
      expect(error.constraint_name).toBe('deity_other_names_name_not_blank');
    }
    // Why it could have passed: a name with letters in it is admitted.
    expect(await outcomeOf(addOtherName(TESTARA, 'Testarion'))).toBe('admitted');
  });

  it('refuses a repeat on one deity in any case', async () => {
    await addOtherName(TESTARA, 'Testa the Elder');

    for (const repeat of ['Testa the Elder', 'testa the elder', 'TESTA THE ELDER']) {
      const error = await failureOf(addOtherName(TESTARA, repeat));

      // 23505 is unique_violation, named: this index refused it.
      expect(error.code).toBe('23505');
      expect(error.constraint_name).toBe(UNIQUE_INDEX);
    }
    // Keyed per deity: another deity may hold the same name at this layer.
    expect(await outcomeOf(addOtherName(MOCKARA, 'Testa the Elder'))).toBe('admitted');
  });
});
