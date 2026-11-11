import { describe, expect, it } from 'vitest';
import { UNTITLED_SPELL, spellNameOf } from '@/components/SpellCard/untitled';

describe('spellNameOf', () => {
  it('gives the title, trimmed', () => {
    expect(spellNameOf('  Testwort Draught ')).toBe('Testwort Draught');
  });

  it.each([null, undefined, '', '   '])('gives the untitled name for %j', (title) => {
    expect(spellNameOf(title)).toBe(UNTITLED_SPELL);
  });
});
