import { afterEach, describe, expect, it, vi } from 'vitest';
import { createHash } from 'node:crypto';
import { addressCountKey, clientCountKey } from '@/lib/send-count-key';

// The signed-out send limits' keys: one per address however it is written, and keyed by the server secret, so the table cannot
// be checked against a guessed address without it.

afterEach(() => {
  vi.unstubAllEnvs();
});

describe('the send count keys', () => {
  it('give one key for every spelling of an address, holding none of it', () => {
    const key = addressCountKey('visitor@example.test');

    expect(addressCountKey('  Visitor@Example.TEST ')).toBe(key);
    expect(key).toMatch(/^[0-9a-f]{64}$/);
    expect(key).not.toContain('visitor');
  });

  it('change with the secret, so a plain hash of a guessed address does not match', () => {
    vi.stubEnv('BETTER_AUTH_SECRET', 'testwort-secret-one-testwort-secret-one');
    const one = addressCountKey('visitor@example.test');
    vi.stubEnv('BETTER_AUTH_SECRET', 'testwort-secret-two-testwort-secret-two');
    const two = addressCountKey('visitor@example.test');

    expect(one).not.toBe(two);
    expect(one).not.toBe(createHash('sha256').update('visitor@example.test').digest('hex'));
  });

  it('keep an email address and a client address apart, even written alike', () => {
    expect(clientCountKey('visitor@example.test')).not.toBe(
      addressCountKey('visitor@example.test'),
    );
  });
});
