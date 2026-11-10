import { describe, expect, it } from 'vitest';
import { formatPhoneNumber, isPhoneNumber } from '@/lib/phone-number';

describe('formatPhoneNumber', () => {
  it('shows a US number in US form, however it was typed', () => {
    expect(formatPhoneNumber('2025550123')).toBe('(202) 555-0123');
    expect(formatPhoneNumber('202.555.0123')).toBe('(202) 555-0123');
    expect(formatPhoneNumber('(202) 555-0123')).toBe('(202) 555-0123');
  });
  it('formats a number typed with a plus for its own country', () => {
    expect(formatPhoneNumber('+44 7700 900123')).toBe('+44 7700 900123');
    expect(formatPhoneNumber('+447700900123')).toBe('+44 7700 900123');
  });
  it('leaves text with a letter as typed, so no character is dropped silently', () => {
    expect(formatPhoneNumber('202 555 0123 ext 5')).toBe('202 555 0123 ext 5');
  });
});

describe('isPhoneNumber', () => {
  it('accepts a real US number and a real foreign number', () => {
    expect(isPhoneNumber('(202) 555-0123')).toBe(true);
    expect(isPhoneNumber('+44 7911 123456')).toBe(true);
  });
  it('refuses a short number, a US number with no area code and words', () => {
    expect(isPhoneNumber('555-0123')).toBe(false);
    expect(isPhoneNumber('(202) 555')).toBe(false);
    expect(isPhoneNumber('call me')).toBe(false);
  });
});
