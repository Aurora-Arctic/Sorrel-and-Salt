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

// The per-account counter of failed password sign-ins (claude-docs/db/write-path.md): a write outside `withAudit`, as a failed sign-in has no session to audit.

beforeEach(async () => {
  await sql`delete from sign_in_failures`;
});

describe('sign_in_failures', () => {
  it('reads nothing for an account that has not failed', async () => {
    expect(await readSignInFailure(A.id)).toBeNull();
  });

  it('counts each failure from one, keeping the first failure time', async () => {
    const first = await recordSignInFailure(A.id);
    const second = await recordSignInFailure(A.id);

    expect(first.count).toBe(1);
    expect(second.count).toBe(2);
    expect(second.firstFailedAt).toEqual(first.firstFailedAt);
    expect(second.lockedUntil).toBeNull();
  });

  it('counts one account without touching another', async () => {
    await recordSignInFailure(A.id);
    await recordSignInFailure(A.id);

    expect(await readSignInFailure(B.id)).toBeNull();
    expect((await recordSignInFailure(B.id)).count).toBe(1);
    expect((await readSignInFailure(A.id))?.count).toBe(2);
  });

  it('locks until a time, keeping the count', async () => {
    await recordSignInFailure(A.id);
    const until = new Date(Date.now() + 60_000);

    await lockPasswordSignIn(A.id, until);
    expect(await readSignInFailure(A.id)).toMatchObject({ count: 1, lockedUntil: until });
  });

  it('clears the row, and a later failure counts from one again', async () => {
    await recordSignInFailure(A.id);
    await recordSignInFailure(A.id);

    await clearSignInFailures(A.id);

    expect(await readSignInFailure(A.id)).toBeNull();
    expect((await recordSignInFailure(A.id)).count).toBe(1);
  });
});
