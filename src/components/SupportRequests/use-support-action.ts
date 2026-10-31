'use client';

import { useState } from 'react';
import { readGraphqlFailure } from '../../lib/graphql-failure';
import { usePendingNavigation } from '../../lib/navigation';
import type { Failure } from '../../lib/types';

/**
 * One write from the detail: busy while it is in flight, then the page is read again so the request
 * shows its new state, or the failure is kept for the caller to say. `field` names the one input a
 * validation refusal belongs beside.
 */
export function useSupportAction(field?: string) {
  const { refresh } = usePendingNavigation();
  const [busy, setBusy] = useState(false);
  const [failure, setFailure] = useState<Failure>({});

  async function run(send: () => Promise<unknown>): Promise<boolean> {
    setBusy(true);
    setFailure({});
    try {
      await send();
      setBusy(false);
      refresh();
      return true;
    } catch (error) {
      setBusy(false);
      setFailure(readGraphqlFailure(error, field ? [field] : []));
      return false;
    }
  }

  return { busy, failure, run };
}
