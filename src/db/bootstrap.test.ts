import { describe, expect, it } from 'vitest';
import { BOOTSTRAP_USER_ID } from './bootstrap';

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

describe('BOOTSTRAP_USER_ID', () => {
  it('is a fixed, valid UUID literal', () => {
    expect(BOOTSTRAP_USER_ID).toMatch(UUID_RE);
  });
});
