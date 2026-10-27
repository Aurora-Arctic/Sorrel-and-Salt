import { describe, expect, it, vi } from 'vitest';
import { buildLoaders } from '@/graphql/loaders';
import { defineLoader, defineSignedInLoader } from '@/graphql/loaders/define-loader';
import { Forbidden } from '@/lib/errors';
import type { Session } from '@/lib/session';

const A: Session = { userId: 'user-a', role: 'user' };
const B: Session = { userId: 'user-b', role: 'user' };

function doubling() {
  const batch = vi.fn(async (_session: Session | null, keys: readonly number[]) =>
    keys.map((key) => key * 2),
  );
  return { batch, factories: { doubled: defineLoader(batch) } };
}

describe('per-request loaders', () => {
  it('batches the loads one request makes into one call', async () => {
    const { batch, factories } = doubling();
    const { doubled } = buildLoaders(factories, A);

    await expect(Promise.all([doubled.load(1), doubled.load(2)])).resolves.toEqual([2, 4]);
    expect(batch).toHaveBeenCalledTimes(1);
    expect(batch).toHaveBeenCalledWith(A, [1, 2]);
  });

  // What a module-level loader would get wrong: its cache outlives the
  // request, so the second reader is served the first reader's answer.
  it("never serves one request's cached answer to another", async () => {
    const { batch, factories } = doubling();

    await buildLoaders(factories, A).doubled.load(1);
    await buildLoaders(factories, B).doubled.load(1);

    expect(batch).toHaveBeenCalledTimes(2);
    expect(batch).toHaveBeenLastCalledWith(B, [1]);
  });

  // The one proof of the signed-out refusal for every loader built on
  // defineSignedInLoader: each per-loader test proves only its own batch.
  it('answers every key Forbidden for a signed-out request, never calling the service', async () => {
    const batch = vi.fn(async (_session: Session, keys: readonly number[]) =>
      keys.map((key) => key * 2),
    );
    const doubled = buildLoaders({ doubled: defineSignedInLoader(batch) }, null).doubled;

    const answers = await Promise.allSettled([doubled.load(1), doubled.load(2)]);

    expect(
      answers.map((answer) => answer.status === 'rejected' && answer.reason instanceof Forbidden),
    ).toEqual([true, true]);
    expect(batch).not.toHaveBeenCalled();
    // The precondition: a signed-in request reaches the same batch.
    await expect(
      buildLoaders({ doubled: defineSignedInLoader(batch) }, A).doubled.load(1),
    ).resolves.toBe(2);
  });
});
