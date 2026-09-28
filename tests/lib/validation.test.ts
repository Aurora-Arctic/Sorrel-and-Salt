import { describe, expect, it } from 'vitest';
import { z } from 'zod';
import { ValidationError } from '@/lib/errors';
import { parseInput } from '@/lib/validation';

const Layer = z.object({
  name: z.string().trim().min(1, 'Name is required'),
  tags: z.array(z.string().min(1, 'A tag cannot be blank')),
});

// A refinement with no path is the one issue about the input as a whole.
const Pair = z
  .object({ low: z.number(), high: z.number() })
  .refine(({ low, high }) => low <= high, 'Low must not exceed high');

function thrown(run: () => unknown): unknown {
  try {
    run();
  } catch (error) {
    return error;
  }
  throw new Error('expected a throw');
}

describe('parseInput', () => {
  it("returns the schema's output, transforms applied", () => {
    expect(parseInput(Layer, { name: '  Testwort  ', tags: [] })).toEqual({
      name: 'Testwort',
      tags: [],
    });
  });

  it('throws ValidationError, the type MB.43 maps, rather than a ZodError', () => {
    const error = thrown(() => parseInput(Layer, { name: '', tags: [] }));

    expect(error).toBeInstanceOf(ValidationError);
    expect(error).not.toBeInstanceOf(z.ZodError);
  });

  it('carries one issue per Zod issue, each with its path and message', () => {
    const input = { name: ' ', tags: ['ok', '', ''] };
    // The precondition: Zod itself reports three, so a count of three is the
    // adapter keeping each rather than collapsing them.
    expect(Layer.safeParse(input).error?.issues).toHaveLength(3);

    const error = thrown(() => parseInput(Layer, input)) as ValidationError;

    expect(error.issues).toEqual([
      { path: ['name'], message: 'Name is required' },
      { path: ['tags', 1], message: 'A tag cannot be blank' },
      { path: ['tags', 2], message: 'A tag cannot be blank' },
    ]);
  });

  it('keeps an empty path empty, for an issue about no one field', () => {
    const error = thrown(() => parseInput(Pair, { low: 2, high: 1 })) as ValidationError;

    expect(error.issues).toEqual([{ path: [], message: 'Low must not exceed high' }]);
  });
});
