import { describe, expect, it } from 'vitest';
import { z } from 'zod';
import { ValidationError } from '@/lib/errors';
import {
  CalendarDay,
  curatedValueInput,
  optionalText,
  parseInput,
  quantity,
  quantityText,
  requiredRowId,
  requiredText,
} from '@/lib/validation';
import { MAX_QUANTITY } from '@/modules/ingredients/schema/quantities';

const Layer = z.object({
  name: z.string().trim().min(1, 'Name is required'),
  tags: z.array(z.string().min(1, 'A tag cannot be blank')),
});

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

  it('throws ValidationError rather than a ZodError', () => {
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

describe('CalendarDay', () => {
  it('takes a day as YYYY-MM-DD, and refuses anything else with the one message', () => {
    expect(CalendarDay.parse('2026-10-06')).toBe('2026-10-06');
    for (const input of ['06/10/2026', '2026-13-01', '2026-10-06T12:00']) {
      expect(CalendarDay.safeParse(input).error?.issues).toEqual([
        expect.objectContaining({ message: 'Give the day as YYYY-MM-DD' }),
      ]);
    }
  });
});

describe('quantity', () => {
  const rule = quantity('Quantity');
  const refused = (value: unknown) => {
    const result = rule.safeParse(value);
    return result.success ? null : result.error.issues.map((issue) => issue.message);
  };

  it('accepts an amount from zero to the most a column holds, with up to three decimals', () => {
    for (const value of [0, 2.5, 0.001, 12.345, MAX_QUANTITY]) {
      expect(rule.safeParse(value).success, String(value)).toBe(true);
    }
  });
  it('refuses a value that is not a number with the one plain message', () => {
    expect(refused(Number.NaN)).toEqual(['Enter an amount as a number, like 2.5']);
    expect(refused('2')).toEqual(['Enter an amount as a number, like 2.5']);
  });
  it('refuses a negative, naming the field', () => {
    expect(refused(-1)).toEqual(['Quantity cannot be negative']);
  });
  it('refuses more than three decimals', () => {
    expect(refused(0.1234)).toEqual(['Quantity can have up to three decimal places']);
  });
  it('refuses more than the most a column holds', () => {
    expect(refused(MAX_QUANTITY + 1)?.[0]).toMatch(/^Quantity is too large/);
  });
});

describe('quantityText', () => {
  const rule = quantityText('Low Stock At');
  it('reads typed text through the same rule, blank as no amount', () => {
    expect(rule.parse('2,5')).toBe(2.5);
    expect(rule.parse('')).toBeNull();
  });
  it('refuses unreadable and out-of-range text with the rule’s messages', () => {
    const message = (text: string) => {
      const result = rule.safeParse(text);
      return result.success ? null : result.error.issues[0]?.message;
    };
    expect(message('abc')).toBe('Enter an amount as a number, like 2.5');
    expect(message('-1')).toBe('Low Stock At cannot be negative');
    expect(message('1.2345')).toBe('Low Stock At can have up to three decimal places');
  });
});
