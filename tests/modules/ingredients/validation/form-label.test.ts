import { describe, expect, it } from 'vitest';
import { formLabel } from '@/modules/ingredients/validation/form-label';

describe('formLabel', () => {
  it('shows a stored form in title case', () => {
    expect(formLabel('dried leaf')).toBe('Dried Leaf');
    expect(formLabel('oil of cloves')).toBe('Oil of Cloves');
  });

  it('shows nothing for an empty form', () => {
    expect(formLabel('')).toBe('');
  });
});
