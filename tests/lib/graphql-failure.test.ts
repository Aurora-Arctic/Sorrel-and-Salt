import type { UseFormSetError } from 'react-hook-form';
import { describe, expect, it, vi } from 'vitest';
import { GraphQLClientError } from '@/lib/graphql-client-error';
import { GENERIC_FAILURE, placeServerIssues } from '@/lib/graphql-failure';

// The admin forms' reading of a refused save: every field issue beside its field, everything
// else in one alert, the form choosing which paths are its fields.

type Values = { name: string; description: string };

/** A VALIDATION refusal carrying these issues, as the server sends one. */
function refusal(
  fieldErrors: { path: (string | number)[]; message: string }[],
): GraphQLClientError {
  return new GraphQLClientError({
    status: 200,
    errors: [{ message: 'Invalid input', extensions: { code: 'VALIDATION', fieldErrors } }],
  });
}

/** The flat forms' reading: a field for a one-segment path it shows. */
const flat = ({ path }: { path: (string | number)[] }) =>
  path.length === 1 && (path[0] === 'name' || path[0] === 'description')
    ? (path[0] as keyof Values)
    : undefined;

describe('placeServerIssues', () => {
  it('sets each field issue beside its field and joins the rest into the root', () => {
    const setError = vi.fn<UseFormSetError<Values>>();

    const placed = placeServerIssues(
      refusal([
        { path: ['name'], message: 'NAME' },
        { path: ['slug'], message: 'ELSEWHERE' },
        { path: ['description'], message: 'DESCRIPTION' },
        { path: ['name', 0], message: 'DEEPER' },
      ]),
      setError,
      flat,
    );

    expect(placed).toBe(true);
    expect(setError.mock.calls).toEqual([
      ['name', { type: 'server', message: 'NAME' }],
      ['description', { type: 'server', message: 'DESCRIPTION' }],
      ['root', { type: 'server', message: 'ELSEWHERE DEEPER' }],
    ]);
  });

  it('shows a root message once however many issues state it', () => {
    const setError = vi.fn<UseFormSetError<Values>>();

    placeServerIssues(
      refusal([
        { path: ['slug'], message: 'SAME' },
        { path: ['slug', 0], message: 'SAME' },
        { path: ['slug', 1], message: 'OTHER' },
      ]),
      setError,
      flat,
    );

    expect(setError.mock.calls).toEqual([['root', { type: 'server', message: 'SAME OTHER' }]]);
  });

  it('puts a failure with no issues of its own in the root', () => {
    const setError = vi.fn<UseFormSetError<Values>>();

    expect(placeServerIssues(new Error('offline'), setError, flat)).toBe(true);
    expect(setError.mock.calls).toEqual([['root', { type: 'server', message: GENERIC_FAILURE }]]);
  });

  it('places nowhere an issue the form takes up itself', () => {
    const setError = vi.fn<UseFormSetError<Values>>();

    const placed = placeServerIssues(
      refusal([{ path: ['redirect'], message: 'ASK' }]),
      setError,
      () => false,
    );

    expect(placed).toBe(false);
    expect(setError).not.toHaveBeenCalled();
  });
});
