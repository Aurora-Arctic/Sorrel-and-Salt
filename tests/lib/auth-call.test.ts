import { describe, expect, it } from 'vitest';
import { settled } from '@/lib/auth-call';

describe('settled', () => {
  it('passes a Better Auth answer through, refusal or success', async () => {
    const refusal = { data: null, error: { status: 401, code: 'INVALID_PASSWORD' } };
    await expect(settled(Promise.resolve(refusal))).resolves.toBe(refusal);
    await expect(settled(Promise.resolve({ data: { ok: true }, error: null }))).resolves.toEqual({
      data: { ok: true },
      error: null,
    });
  });

  it('turns a dropped connection into an empty error that is still truthy', async () => {
    const answer = await settled(Promise.reject(new Error('network')));
    expect(answer).toEqual({ data: null, error: {} });
    expect(Boolean(answer.error)).toBe(true);
  });
});
