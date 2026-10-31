import { describe, expect, it } from 'vitest';
import { redactPath } from '@/modules/support';

describe('redactPath', () => {
  it('keeps the coven segment, so a reviewer can tell which coven the page was', () => {
    expect(redactPath('/coven/moonlit-hollow/grimoire')).toBe('/coven/moonlit-hollow/grimoire');
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
