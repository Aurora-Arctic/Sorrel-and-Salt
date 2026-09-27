import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { Forbidden, InvalidCursor, NotFound, ValidationError } from '@/lib/errors';
import { fromRoot } from '../support/paths';

// A refusal asserted by message is a test of today's wording, and passes
// against a service that stopped checking. Assert the type.

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
    // `workspace → private` is rejected with an explaining error, so the
    // message is a parameter; a bare refusal stays one word.
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
  // Separate types because a route decides differently: /coven/[slug]
  // answers 404 to a non-member, /admin a styled refusal.
  // claude-docs/auth.md, "The service-level session, and the three errors".
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
    // The guard on the guard: the inner expectation is under test, so this
    // asserts that *it* rejects.
    await expect(
      expect(Promise.reject(new NotFound('No such spell'))).rejects.toThrow(Forbidden),
    ).rejects.toThrow();
  });
});

describe('a denied call rejects rather than returning empty', () => {
  // The silent no-op: an unauthorized read answered with an empty list, or a
  // write with success, both look like success.
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

describe('InvalidCursor', () => {
  it('is an Error that names itself', () => {
    const error = new InvalidCursor();

    expect(error).toBeInstanceOf(Error);
    expect(error.name).toBe('InvalidCursor');
    expect(error.message).toBe('Invalid cursor');
  });
});

describe('ValidationError', () => {
  const issues = [
    { path: ['canonicalName'], message: 'A botanical name is required' },
    { path: ['folkNames', 2], message: 'A folk name cannot be blank' },
  ];

  it('is an Error that names itself', () => {
    const error = new ValidationError(issues);

    expect(error).toBeInstanceOf(Error);
    expect(error.name).toBe('ValidationError');
    expect(error.stack).toBeTruthy();
  });

  it('carries its issues, paths and messages as given', () => {
    expect(new ValidationError(issues).issues).toEqual(issues);
  });

  it('carries a default message, and takes a specific one', () => {
    expect(new ValidationError(issues).message).toBe('Invalid input');
    expect(new ValidationError(issues, 'That ingredient already exists').message).toBe(
      'That ingredient already exists',
    );
  });

  it('is neither refusal, and neither refusal is one', () => {
    const error = new ValidationError(issues);

    expect(error).not.toBeInstanceOf(Forbidden);
    expect(error).not.toBeInstanceOf(NotFound);
    expect(new Forbidden()).not.toBeInstanceOf(ValidationError);
    expect(new NotFound()).not.toBeInstanceOf(ValidationError);
  });

  // It carries issues rather than producing them, so a seed or a script can
  // throw one without src/lib/ depending on the schema library.
  it('imports nothing from Zod', () => {
    const source = readFileSync(fromRoot('src/lib/errors.ts'), 'utf8');

    // Why this could pass vacuously: the file is the one that declares the type.
    expect(source).toContain('class ValidationError');
    expect(source).not.toMatch(/from\s+['"]zod/);
    expect(source).not.toMatch(/import\s*\(\s*['"]zod/);
  });
});
