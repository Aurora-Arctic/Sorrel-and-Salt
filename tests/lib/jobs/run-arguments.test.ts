import { describe, expect, it } from 'vitest';
import { RunArgumentRefused, assertRunArguments } from '@/lib/jobs/run-arguments';
import { ORIGIN } from '../../support/constants';

// A job's arguments are kept in its event log, so only ids, a kind, the site origin, a lock length and a return path pass.

const ID = '0b6f3c1e-8f3a-4d6e-9a43-3d7f4d2a9c11';
const OTHER = '7d1c2b3a-4e5f-4a6b-8c7d-9e0f1a2b3c4d';

describe('assertRunArguments', () => {
  it.each([
    ['no arguments', []],
    ['an id', [ID]],
    ['an id and an origin', [ID, 'https://sorrelandsalt.example']],
    ['an id and no origin', [ID, null]],
    ['a support status mail', [{ kind: 'received', requestId: ID, origin: ORIGIN }]],
    ['a password notice', [{ kind: 'password-changed', userId: ID, origin: ORIGIN, how: 'reset' }]],
    [
      'a change link',
      [
        {
          kind: 'change',
          userId: ID,
          authBase: `${ORIGIN}/api/auth`,
          next: '/account/support?request=' + OTHER,
        },
      ],
    ],
    [
      'a change link with no return path',
      [{ kind: 'change', userId: ID, authBase: `${ORIGIN}/api/auth`, next: null }],
    ],
    [
      'a lockout',
      [{ kind: 'lockout', userId: ID, authBase: 'https://a.example/api/auth', minutes: 15 }],
    ],
    [
      'an invitation',
      [{ kind: 'coven-invitation', invitationId: ID, origin: 'https://a.example' }],
    ],
  ])('passes %s', (_, args) => {
    expect(() => assertRunArguments(args)).not.toThrow();
  });

  it.each([
    ['an address', [ID, 'reader@example.test']],
    ['an address in an object', [{ kind: 'received', requestId: ID, to: 'reader@example.test' }]],
    ['a subject', [{ kind: 'received', requestId: ID, subject: 'The jar will not open' }]],
    ['a body under an allowed key', [{ kind: 'The jar will not open', requestId: ID }]],
    ['a token', [{ kind: 'reset', userId: ID, token: 'e1f0c6a9b2d34f5a8b7c6d5e4f3a2b1c' }]],
    [
      'a link carrying a token',
      [{ kind: 'reset', userId: ID, authBase: 'https://a.example/reset?token=abc' }],
    ],
    [
      'a link with credentials',
      [{ kind: 'reset', userId: ID, authBase: 'https://user:pass@a.example' }],
    ],
    [
      'a return path naming an address',
      [{ kind: 'change', userId: ID, next: '/invite?to=reader@example.test' }],
    ],
    ['a return path to another site', [{ kind: 'change', userId: ID, next: '//evil.example/' }]],
    [
      'a whole message',
      [{ to: 'reader@example.test', subject: 'Hi', text: 'Hello', html: '<p>Hello</p>' }],
    ],
    ['a date', [ID, new Date()]],
    ['a non-finite number', [{ kind: 'lockout', userId: ID, minutes: Number.NaN }]],
  ])('refuses %s', (_, args) => {
    expect(() => assertRunArguments(args as unknown[])).toThrow(RunArgumentRefused);
  });

  it('names the path to a refused value but never the value itself', () => {
    let message = '';
    try {
      assertRunArguments([{ kind: 'received', to: 'reader@example.test' }]);
    } catch (error) {
      message = (error as Error).message;
    }
    // Precondition: it was refused, so the message is the refusal's.
    expect(message).toContain('[0].to');
    expect(message).not.toContain('reader@example.test');
  });
});
