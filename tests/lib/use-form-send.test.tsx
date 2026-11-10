import { act, renderHook } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { GraphQLClientError } from '@/lib/graphql-client-error';
import { useFormSend } from '@/lib/use-form-send';

describe('useFormSend', () => {
  it('is sending while the write is in flight and answers true when it goes through', async () => {
    const { result } = renderHook(() => useFormSend(['email']));
    let release: () => void = () => undefined;
    let answer: Promise<boolean> | undefined;
    act(() => {
      answer = result.current.send(() => new Promise<void>((resolve) => (release = resolve)));
    });
    expect(result.current.sending).toBe(true);
    await act(async () => {
      release();
      await answer;
    });
    expect(result.current.sending).toBe(false);
    expect(await answer).toBe(true);
    expect(result.current.failure).toEqual({});
  });

  it('keeps the failure, answers false, and clears it on the next send', async () => {
    const { result } = renderHook(() => useFormSend());
    let answer = true;
    await act(async () => {
      answer = await result.current.send(() => Promise.reject(new Error('down')));
    });
    expect(answer).toBe(false);
    expect(result.current.sending).toBe(false);
    expect(result.current.failure.alert).toBeTruthy();
    await act(async () => {
      await result.current.send(() => Promise.resolve());
    });
    expect(result.current.failure).toEqual({});
  });

  it('places a validation refusal for a named field beside that field', async () => {
    const { result } = renderHook(() => useFormSend(['email']));
    const refusal = new GraphQLClientError({
      status: 200,
      errors: [
        {
          message: 'bad',
          extensions: {
            code: 'VALIDATION',
            fieldErrors: [{ path: ['email'], message: 'Enter an address.' }],
          },
        },
      ],
    });
    await act(async () => {
      await result.current.send(() => Promise.reject(refusal));
    });
    expect(result.current.failure.field).toEqual({ name: 'email', message: 'Enter an address.' });
  });
});
