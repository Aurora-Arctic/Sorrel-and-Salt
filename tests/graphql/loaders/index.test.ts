import { describe, expect, it, vi } from 'vitest';
import { buildLoaders } from '@/graphql/loaders';
import { defineLoader } from '@/graphql/loaders/define-loader';
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

  it('builds a new instance for every request', () => {
    const { factories } = doubling();

    expect(buildLoaders(factories, A).doubled).not.toBe(buildLoaders(factories, A).doubled);
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
});
