import { describe, expect, it } from 'vitest';
import { matchesLabelOrGroup } from '@/components/Combobox/match';

// How every grouped list narrows as you type: the category picker and the
// facet type-ahead both call this, so each proves only that it does.
describe('matchesLabelOrGroup', () => {
  it.each([
    ['in the label', 'Moon', 'Celestial', 'moo', true],
    ['in the group, though not the label', 'Selene', 'Greek', 'greek', true],
    ['in neither', 'Selene', 'Greek', 'norse', false],
    ['set about with space and in another case', 'Moon', undefined, '  MOON ', true],
    ['blank', 'Moon', undefined, '   ', true],
    ['in a group the row does not have', 'Moon', undefined, 'greek', false],
  ])('matches text %s: %s', (_why, label, group, text, matched) => {
    expect(matchesLabelOrGroup(label, group, text)).toBe(matched);
  });
});
