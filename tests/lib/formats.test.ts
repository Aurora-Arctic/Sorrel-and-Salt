import { describe, expect, it } from 'vitest';
import { optionalText, requiredText } from '@/lib/validation';
import { tidy, withScheme } from '@/lib/formats';

describe('tidy', () => {
  it('trims the ends and collapses runs of white space to one space', () => {
    expect(tidy('  Salt   of\t the  earth  ')).toBe('Salt of the earth');
  });
  it('leaves already tidy text as it is', () => {
    expect(tidy('Salt')).toBe('Salt');
  });
});

describe('withScheme', () => {
  it('adds https to a bare host and leaves a full address alone', () => {
    expect(withScheme('example.com/a')).toBe('https://example.com/a');
    expect(withScheme('http://example.com')).toBe('http://example.com');
  });
});

describe('the server schemas store what the form showed', () => {
  it('requiredText collapses inner runs of spaces as the form does', () => {
    expect(requiredText('Give a name').parse('  Salt   wort ')).toBe('Salt wort');
  });
  it('optionalText collapses inner runs of spaces and turns a blank into null', () => {
    expect(optionalText().parse('  Salt   wort ')).toBe('Salt wort');
    expect(optionalText().parse('   ')).toBeNull();
  });
});
