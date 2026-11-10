import { describe, expect, it } from 'vitest';
import { labelOf } from '@/lib/options';

const OPTIONS = [
  { value: 'testwort', label: 'Testwort Label' },
  { value: 'fenbloom', label: 'Fenbloom Label' },
] as const;

describe('labelOf', () => {
  it('gives the label of the option holding the value', () => {
    expect(labelOf(OPTIONS, 'fenbloom')).toBe('Fenbloom Label');
  });

  it('gives the value itself when no option holds it, so a value added on the server is never shown blank', () => {
    expect(labelOf(OPTIONS, 'marshglim')).toBe('marshglim');
  });
});
