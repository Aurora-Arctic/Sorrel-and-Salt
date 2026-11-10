import { describe, expect, it } from 'vitest';
import { QUANTITY_FORMAT_MESSAGE, quantityProblem } from '@/lib/quantity-rule';
import { quantityText } from '@/lib/validation';

// The quantity rule without zod, for a client field's check; the schema runs the same function, so the two agree.

describe('quantityProblem', () => {
  it('finds nothing wrong with blank text or a usable amount', () => {
    for (const text of ['', '  ', '0', '2.5', '1,000', '0.001']) {
      expect(quantityProblem(text, 'Amount'), text).toBeUndefined();
    }
  });

  it('refuses unreadable text with the one plain message', () => {
    expect(quantityProblem('abc', 'Amount')).toBe(QUANTITY_FORMAT_MESSAGE);
  });

  it.each(['abc', '-2', '1.2345', '1e3', '9999999999', '1.000,5'])(
    'gives the schema’s own message for %j',
    (text) => {
      const result = quantityText('Amount').safeParse(text);
      expect(result.success).toBe(false);
      expect(quantityProblem(text, 'Amount')).toBe(result.error?.issues[0]?.message);
    },
  );
});
