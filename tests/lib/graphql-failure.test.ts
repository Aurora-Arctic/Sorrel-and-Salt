import type { UseFormSetError } from 'react-hook-form';
import { describe, expect, it, vi } from 'vitest';
import { GraphQLClientError } from '@/lib/graphql-client-error';
import {
  GENERIC_FAILURE,
  fieldMessage,
  placeServerIssues,
  readGraphqlFailureCode,
} from '@/lib/graphql-failure';

type Values = { name: string; description: string };

function refusal(
  fieldErrors: { path: (string | number)[]; message: string }[],
): GraphQLClientError {
  return new GraphQLClientError({
    status: 200,
    errors: [{ message: 'Invalid input', extensions: { code: 'VALIDATION', fieldErrors } }],
  });
}

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

describe('fieldMessage', () => {
  it('gives the message only for the input the failure names', () => {
    const failure = { field: { name: 'note', message: 'Too long' } };
    expect(fieldMessage(failure, 'note')).toBe('Too long');
    expect(fieldMessage(failure, 'body')).toBeUndefined();
    expect(fieldMessage({ alert: 'Down' }, 'note')).toBeUndefined();
  });
});

describe('readGraphqlFailureCode', () => {
  it('reads the code of a refused request and nothing from any other failure', () => {
    const refused = new GraphQLClientError({
      status: 200,
      errors: [{ message: 'Gone', extensions: { code: 'NOT_FOUND' } }],
    });
    expect(readGraphqlFailureCode(refused)).toBe('NOT_FOUND');
    expect(readGraphqlFailureCode(new Error('offline'))).toBeUndefined();
  });
});
