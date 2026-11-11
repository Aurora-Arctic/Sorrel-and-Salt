'use client';

import { type RefObject, useRef, useState } from 'react';

// The state a More menu keeps while it asks a question in a dialog: which question is asked, the
// failure a refused write leaves behind, and the More the focus goes back to once the dialog closes.

interface AskingMenuOptions {
  /** The More's ref, when the caller shares it with other code (click feedback). */
  trigger?: RefObject<HTMLButtonElement | null>;
  /** Called as a question is asked, to clear what the last one left. */
  onAsk?: () => void;
}

export function useAskingMenu<Question extends string>({
  trigger: shared,
  onAsk,
}: AskingMenuOptions = {}) {
  const [asking, setAsking] = useState<Question>();
  const [alert, setAlert] = useState<string>();
  const own = useRef<HTMLButtonElement | null>(null);
  const trigger = shared ?? own;
  return {
    asking,
    setAsking,
    alert,
    setAlert,
    trigger,
    ask: (what: Question) => {
      setAlert(undefined);
      onAsk?.();
      setAsking(what);
    },
    settle: () => setAsking(undefined),
    // The More while it is still in the page; once the write has taken the card away it is gone, and
    // Modal gives the focus to the page's heading.
    back: () => (trigger.current?.isConnected ? trigger.current : null),
  };
}
