import { describe, expect, it } from 'vitest';
import { Forbidden, NotFound } from '@/lib/errors';

// M1.26 — the error type every service throws when it refuses a call, and the
// one it throws when there is nothing to refuse access to.
//
// The point of the pair is that a test can assert on the *type*. A refusal
// asserted by message string ("Forbidden", "forbidden", "not allowed") is a
// test of today's wording, and it passes just as happily against a service
// that stopped checking and started returning nothing.

describe('Forbidden', () => {
  it('is an Error, so it throws, catches and stacks like one', () => {
    const error = new Forbidden();

    expect(error).toBeInstanceOf(Error);
    expect(error.stack).toBeTruthy();
  });

  it('names itself, so a log line says which refusal this was', () => {
    expect(new Forbidden().name).toBe('Forbidden');
  });

  it('carries a default message, and takes an explaining one', () => {
    // DESIGN.md §5's one-way widen, and §11's test for it: `workspace →
    // private` is "rejected with an explaining error, not a bare Forbidden" —
    // so the message has to be a parameter,
    // not a constant, while a refusal with nothing to add stays one word.
    expect(new Forbidden().message).toBe('Forbidden');
    expect(new Forbidden('Widening a spell is a gift; narrowing is a retraction.').message).toBe(
      'Widening a spell is a gift; narrowing is a retraction.',
    );
  });
});

describe('NotFound', () => {
  it('is an Error that names itself', () => {
    const error = new NotFound();

    expect(error).toBeInstanceOf(Error);
    expect(error.name).toBe('NotFound');
  });

  it('carries a default message, and takes a specific one', () => {
    expect(new NotFound().message).toBe('Not found');
    expect(new NotFound('No such spell').message).toBe('No such spell');
  });
});

describe('telling the two apart', () => {
  // They are separate types because they answer separate questions, and
  // CLAUDE.md's domain invariants turn on the difference: `/coven/[slug]`
  // answers 404 to a non-member because workspace existence is private, while
  // `/admin` answers a styled refusal to a signed-in non-admin because
  // everybody already knows that path. A service says which of the two
  // happened; deciding what the browser is told is the route's job, and it
  // cannot make that decision from one error type.
  it('a Forbidden is not a NotFound, and a NotFound is not a Forbidden', () => {
    expect(new Forbidden()).not.toBeInstanceOf(NotFound);
    expect(new NotFound()).not.toBeInstanceOf(Forbidden);
  });

  it('keeps them apart in a catch block', () => {
    const caught: string[] = [];

    for (const error of [new Forbidden(), new NotFound()]) {
      try {
        throw error;
      } catch (thrown) {
        caught.push(thrown instanceof Forbidden ? 'refused' : 'absent');
      }
    }

    expect(caught).toEqual(['refused', 'absent']);
  });

  it('will not let a NotFound satisfy an assertion written for a Forbidden', async () => {
    // The guard on the guard: `rejects.toThrow(Forbidden)` is only worth
    // writing if it can fail. The inner expectation is the one under test, so
    // this asserts that *it* rejects.
    await expect(
      expect(Promise.reject(new NotFound('No such spell'))).rejects.toThrow(Forbidden),
    ).rejects.toThrow();
  });
});

describe('a denied call rejects rather than returning empty', () => {
  // The bug this pair exists to catch is the silent no-op: a service that
  // checks nothing and answers an unauthorized read with an empty list, or an
  // unauthorized write with a success. Both look like success to a caller.
  it('is satisfied by a service that throws', async () => {
    const denied = async (): Promise<string[]> => {
      throw new Forbidden('D is not a member of W');
    };

    await expect(denied()).rejects.toThrow(Forbidden);
  });

  it('is not satisfied by a service that resolves to an empty list', async () => {
    const silentNoOp = async (): Promise<string[]> => [];

    await expect(expect(silentNoOp()).rejects.toThrow(Forbidden)).rejects.toThrow();
  });

  it('is not satisfied by a service that resolves to a success value', async () => {
    const silentSuccess = async (): Promise<{ ok: boolean }> => ({ ok: true });

    await expect(expect(silentSuccess()).rejects.toThrow(Forbidden)).rejects.toThrow();
  });
});
