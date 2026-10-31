import { beforeEach, describe, expect, it } from 'vitest';
import {
  clearSignInFailures,
  lockPasswordSignIn,
  readSignInFailure,
  recordSignInFailure,
} from '@/db/repository';
import { A, B } from '../../support/as-user';
import { sql, useRawClient } from '../../support/db/probe-tables';

useRawClient();

const DAY = 24 * 60 * 60_000;
const NOW = new Date('2026-10-30T12:00:00Z');
/** One failure at `at`, counting on from any failure within the day before it. */
const fail = (userId: string, at = NOW) =>
  recordSignInFailure(userId, at, new Date(at.getTime() - DAY));

// The per-account counter of failed password sign-ins (claude-docs/db/write-path.md): a write outside `withAudit`, as a failed sign-in has no session to audit.

beforeEach(async () => {
  await sql`delete from sign_in_failures`;
});

describe('sign_in_failures', () => {
  it('reads nothing for an account that has not failed', async () => {
    expect(await readSignInFailure(A.id)).toBeNull();
  });

  it('counts each failure from one, keeping the first failure time', async () => {
    const first = await fail(A.id);
    const second = await fail(A.id);

    expect(first.count).toBe(1);
    expect(second.count).toBe(2);
    expect(second.firstFailedAt).toEqual(first.firstFailedAt);
    expect(second.lockedUntil).toBeNull();
  });

  it('starts the count over at one when the last failure came before the quiet period, keeping it within it', async () => {
    await fail(A.id, NOW);
    const within = await fail(A.id, new Date(NOW.getTime() + DAY - 1_000));
    expect(within.count).toBe(2);

    const after = await fail(A.id, new Date(within.lastFailedAt.getTime() + DAY + 1_000));
    expect(after.count).toBe(1);
    expect(after.firstFailedAt).toEqual(after.lastFailedAt);
  });

  it('counts one account without touching another', async () => {
    await fail(A.id);
    await fail(A.id);

    expect(await readSignInFailure(B.id)).toBeNull();
    expect((await fail(B.id)).count).toBe(1);
    expect((await readSignInFailure(A.id))?.count).toBe(2);
  });

  it('locks until a time, keeping the count', async () => {
    await fail(A.id);
    const until = new Date(Date.now() + 60_000);

    await lockPasswordSignIn(A.id, until);
    expect(await readSignInFailure(A.id)).toMatchObject({ count: 1, lockedUntil: until });
  });

  it('clears the row, and a later failure counts from one again', async () => {
    await fail(A.id);
    await fail(A.id);

    await clearSignInFailures(A.id);

    expect(await readSignInFailure(A.id)).toBeNull();
    expect((await fail(A.id)).count).toBe(1);
  });
});
