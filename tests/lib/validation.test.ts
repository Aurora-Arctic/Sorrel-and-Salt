import { describe, expect, it } from 'vitest';
import { z } from 'zod';
import { ValidationError } from '@/lib/errors';
import {
  curatedValueInput,
  optionalText,
  parseInput,
  requiredRowId,
  requiredText,
} from '@/lib/validation';

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

// The shapes every module's schemas share (MB.209); each schema's own test
// holds it to its messages.
describe('requiredText', () => {
  it('trims, and refuses blank and missing alike with the one message', () => {
    const Text = requiredText('Name it');

    expect(Text.parse('  Testwort ')).toBe('Testwort');
    for (const input of ['  ', undefined, 7]) {
      expect(Text.safeParse(input).error?.issues).toEqual([
        expect.objectContaining({ message: 'Name it' }),
      ]);
    }
  });
});

describe('optionalText', () => {
  it('trims, takes a blank as null, and keeps null and undefined as sent', () => {
    const Text = optionalText();

    expect(Text.parse(' Testwort ')).toBe('Testwort');
    expect(Text.parse('  ')).toBeNull();
    expect(Text.parse(null)).toBeNull();
    expect(Text.parse(undefined)).toBeUndefined();
  });

  it('formats with the format given, and takes what it leaves blank as null', () => {
    const Text = optionalText((text) => text.replace(/-/g, '').trim());

    expect(Text.parse(' a-b ')).toBe('ab');
    expect(Text.parse(' -- ')).toBeNull();
  });
});

describe('curatedValueInput', () => {
  it('takes a name and a description, each refusal saying the noun', () => {
    const Input = curatedValueInput('sign');

    expect(Input.parse({ name: ' Fixtura ', description: ' Invented. ', slug: 'x' })).toEqual({
      name: 'Fixtura',
      description: 'Invented.',
    });
    expect(Input.safeParse({ name: ' ' }).error?.issues).toEqual([
      expect.objectContaining({ path: ['name'], message: 'Give the sign a name' }),
      expect.objectContaining({ path: ['description'], message: 'Describe the sign' }),
    ]);
  });
});

describe('requiredRowId', () => {
  it('takes any id Postgres does, and refuses missing and malformed with its message', () => {
    const Id = requiredRowId('Choose one');

    expect(Id.parse('00000000-0000-0000-0000-000000000003')).toBe(
      '00000000-0000-0000-0000-000000000003',
    );
    for (const input of [undefined, 'greek']) {
      expect(Id.safeParse(input).error?.issues).toEqual([
        expect.objectContaining({ message: 'Choose one' }),
      ]);
    }
  });
});
