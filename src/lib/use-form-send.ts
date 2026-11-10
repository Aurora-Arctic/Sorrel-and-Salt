'use client';

import { useState } from 'react';
import { readGraphqlFailure } from './graphql-failure';
import type { Failure } from './types';

/**
 * A form's one write: `sending` while it is in flight, then `send` answers whether it went through, or the failure is kept for the form to show.
 * `fields` names the inputs a validation refusal can sit beside.
 */
export function useFormSend(fields: readonly string[] = []) {
  const [sending, setSending] = useState(false);
  const [failure, setFailure] = useState<Failure>({});

  async function send(call: () => Promise<unknown>): Promise<boolean> {
    setSending(true);
    setFailure({});
    try {
      await call();
      setSending(false);
      return true;
    } catch (error) {
      setSending(false);
      setFailure(readGraphqlFailure(error, fields));
      return false;
    }
  }

  return { sending, failure, setFailure, send };
}
