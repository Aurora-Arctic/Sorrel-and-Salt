import { randomBytes } from 'node:crypto';
import { describe, expect, it, vi } from 'vitest';
import { CARD_TOKEN_ALPHABET, newCardToken, newToken } from '@/lib/invitation-token';

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

describe('newCardToken', () => {
  it('is 16 characters of the look-alike-free alphabet', () => {
    for (let i = 0; i < 200; i += 1) expect(newCardToken()).toMatch(/^[2-9A-HJ-NP-Za-km-z]{16}$/);
    expect(CARD_TOKEN_ALPHABET).toHaveLength(57);
    expect(new Set(CARD_TOKEN_ALPHABET).size).toBe(57);
    for (const banned of '0O1lI') expect(CARD_TOKEN_ALPHABET).not.toContain(banned);
  });

  // 256 is not a multiple of 57, so a byte at or past 228 is skipped rather than folded back onto the first symbols.
  it('rejects bytes that would bias the draw and draws again', () => {
    const bytes = (...values: number[]) => Buffer.from(values);
    const mocked = vi.mocked(randomBytes) as unknown as ReturnType<typeof vi.fn>;
    mocked.mockReset();
    mocked
      .mockReturnValueOnce(
        bytes(255, 228, 229, 230, 231, 232, 233, 234, 235, 236, 237, 238, 239, 240, 241, 242),
      )
      .mockReturnValueOnce(
        bytes(0, 56, 227, 57, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16),
      );

    const token = newCardToken();

    expect(token).toBe(
      [0, 56, 227 % 57, 57 % 57, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12]
        .map((i) => CARD_TOKEN_ALPHABET[i])
        .join(''),
    );
    expect(mocked).toHaveBeenCalledTimes(2);
  });
});
