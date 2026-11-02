import { describe, expect, it } from 'vitest';
import { issueLabel } from '@/components/SupportRequests/issue-link';

describe('issueLabel', () => {
  it('writes an issue address as repository and number', () => {
    expect(issueLabel('https://github.com/Aurora-Arctic/Sorrel-and-Salt/issues/1448')).toBe(
      'Aurora-Arctic/Sorrel-and-Salt#1448',
    );
  });

  it('gives back what it cannot read as an address', () => {
    expect(issueLabel('not an address')).toBe('not an address');
  });
});
