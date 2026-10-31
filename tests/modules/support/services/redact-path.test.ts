import { describe, expect, it } from 'vitest';
import { redactPath } from '@/modules/support';

describe('redactPath', () => {
  it('replaces the segment after /coven/ and keeps the screen', () => {
    expect(redactPath('/coven/moonlit-hollow/grimoire')).toBe('/coven/[coven]/grimoire');
  });

  it('replaces an invitation token and drops the query string and fragment', () => {
    expect(redactPath('/invite/abc123?x=1#top')).toBe('/invite/[token]');
  });

  it('leaves a public path alone', () => {
    expect(redactPath('/compendium/ingredients/mugwort')).toBe('/compendium/ingredients/mugwort');
  });

  it('stores nothing as an empty string', () => {
    expect(redactPath(undefined)).toBe('');
    expect(redactPath('  ')).toBe('');
  });
});
