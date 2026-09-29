import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { PageRequest } from '@/lib/pagination';
import { listIngredientFormValues } from '@/modules/vocabulary';

// `ingredientFormValues`'s service: the curated vocabulary, one page at a
// time, with no session to check — the read is public (MB.80). The finder
// owns which rows count as curated (tests/db/repository/vocabularies.test.ts).

const repository = vi.hoisted(() => ({ findIngredientFormValues: vi.fn() }));
vi.mock('@/db/repository', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@/db/repository')>();
  repository.findIngredientFormValues.mockImplementation(actual.findIngredientFormValues);
  return { ...actual, ...repository };
});

beforeEach(() => {
  repository.findIngredientFormValues.mockClear();
});

describe('listIngredientFormValues', () => {
  it('hands the page request to the finder unchanged and answers its page', async () => {
    const page: PageRequest = { limit: 26, inverted: false };

    const entries = await listIngredientFormValues(page);

    expect(repository.findIngredientFormValues).toHaveBeenCalledWith(page);
    // The seed's first page: the request's limit is the page plus one.
    expect(entries).toHaveLength(26);
    expect(entries[0].node).toMatchObject({
      name: expect.any(String),
      groupId: expect.any(String),
    });
  });
});
