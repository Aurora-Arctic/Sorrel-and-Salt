import { randomBytes } from 'node:crypto';
import { describe, expect, it, vi } from 'vitest';
import { newToken } from '@/lib/invitation-token';

// The token is the CSPRNG's bytes as they came, so the spy is the real
// `randomBytes` under watch: a generator that drew from anything else, or
// drew fewer bytes, fails here (claude-docs/db/invitations.md).
vi.mock('node:crypto', async (importOriginal) => {
  const actual = await importOriginal<typeof import('node:crypto')>();
  return { ...actual, randomBytes: vi.fn(actual.randomBytes) };
});

describe('newToken', () => {
  it('is the base64url of at least 128 bits drawn from crypto.randomBytes', () => {
    vi.mocked(randomBytes).mockClear();
    const token = newToken();

    const drawn = vi.mocked(randomBytes).mock.results[0]?.value as Buffer;
    expect(drawn.length * 8).toBeGreaterThanOrEqual(128);
    expect(token).toBe(drawn.toString('base64url'));
    expect(token).toMatch(/^[A-Za-z0-9_-]+$/);
  });
});
