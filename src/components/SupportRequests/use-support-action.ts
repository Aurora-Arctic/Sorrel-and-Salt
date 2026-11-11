'use client';

import { createContext, useContext } from 'react';
import { usePendingNavigation } from '../../lib/navigation';
import { useFormSend } from '../../lib/use-form-send';

export const AnnounceContext = createContext<(message: string) => void>(() => undefined);

/**
 * One write from the detail: busy while it is in flight, then the page is read again so the request
 * shows its new state and `done` is announced, or the failure is kept for the caller to say. `field` names the one input a
 * validation refusal belongs beside.
 */
export function useSupportAction(field?: string) {
  const announce = useContext(AnnounceContext);
  const { refresh } = usePendingNavigation();
  const { sending, failure, send } = useFormSend(field ? [field] : []);

  async function run(call: () => Promise<unknown>, done: string): Promise<boolean> {
    const sent = await send(call);
    if (sent) {
      announce(done);
      refresh();
    }
    return sent;
  }

  return { busy: sending, failure, run };
}
