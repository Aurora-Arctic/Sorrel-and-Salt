import { readFileSync } from 'node:fs';
import { describe, expect, inject, it } from 'vitest';

// The sentences every sign-in, password and two-factor form shares are written once, in src/lib/auth-messages.ts
// and src/lib/password-refusals.ts, so a rewording reaches every screen.

const SENTENCES: readonly [sentence: string, home: string][] = [
  ['Use at least 15 characters.', 'src/lib/password-refusals.ts'],
  ['Use 128 characters or fewer.', 'src/lib/password-refusals.ts'],
  ['Too many attempts. Please wait a minute, then try again.', 'src/lib/auth-messages.ts'],
  ["That code isn't right. Please try again.", 'src/lib/auth-messages.ts'],
  ["That email address and password don't match an account.", 'src/lib/auth-messages.ts'],
];

describe('the shared auth sentences', () => {
  it.each(SENTENCES)('"%s" is written in %s and nowhere else in src/', (sentence, home) => {
    const files = inject('repoFiles').filter((file) => /^src\/.*\.(ts|tsx)$/.test(file));

    // Precondition: the scan reached src/ and the sentence is in its home to begin with.
    expect(files.length).toBeGreaterThan(500);
    expect(readFileSync(home, 'utf8')).toContain(sentence);

    const writers = files.filter((file) => readFileSync(file, 'utf8').includes(sentence));
    expect(writers).toEqual([home]);
  });
});
