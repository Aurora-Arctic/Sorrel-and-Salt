import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import postgres from 'postgres';
import { start } from 'workflow/api';
import { SYSTEM_ACTOR_ID } from '@/lib/system-actor';
import { auditedWriteWorkflow } from './fixtures/audited-write';

// A real run of a test-only workflow (tests/workflows/fixtures/), not a production job: it shows what
// the SDK's run does with a step that writes through `withAudit` as the System actor.

let sql: ReturnType<typeof postgres>;

beforeAll(async () => {
  sql = postgres(process.env.DATABASE_URL as string, { onnotice: () => {} });
  await sql`
    create table workflow_probe_notes (
      id uuid primary key default gen_random_uuid(),
      title text not null,
      done boolean not null default false,
      created_at timestamp not null default now(),
      created_by uuid not null,
      updated_at timestamp not null default now(),
      updated_by uuid not null,
      deleted_at timestamp,
      deleted_by uuid
    )
  `;
});

afterAll(async () => {
  await sql`drop table if exists workflow_probe_notes`;
  await sql.end();
});

async function newNote(): Promise<string> {
  const [{ id }] = await sql`
    insert into workflow_probe_notes (title, created_by, updated_by)
    values ('Testwort', ${SYSTEM_ACTOR_ID}, '11111111-1111-1111-1111-111111111111')
    returning id
  `;
  return id as string;
}

const note = (id: string) =>
  sql`select done, updated_by, updated_at from workflow_probe_notes where id = ${id}`.then(
    (rows) => rows[0],
  );

describe('a test-only workflow run', () => {
  it('writes its step through withAudit as the System actor', async () => {
    const id = await newNote();
    expect((await note(id)).done).toBe(false);
    expect((await note(id)).updated_by).not.toBe(SYSTEM_ACTOR_ID);

    const run = await start(auditedWriteWorkflow, [id]);

    expect(await run.returnValue).toBe(true);
    const after = await note(id);
    expect(after.done).toBe(true);
    expect(after.updated_by).toBe(SYSTEM_ACTOR_ID);
  });

  it('changes nothing when a second run repeats a step that already succeeded', async () => {
    const id = await newNote();
    expect(await (await start(auditedWriteWorkflow, [id])).returnValue).toBe(true);
    const first = await note(id);
    expect(first.done).toBe(true);

    const again = await start(auditedWriteWorkflow, [id]);

    expect(await again.returnValue).toBe(false);
    expect(await note(id)).toEqual(first);
  });
});
