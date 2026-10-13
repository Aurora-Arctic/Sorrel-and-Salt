'use client';

import { createContext, type ReactElement, useContext, useMemo, useState } from 'react';
import Notice from '../Notice';
import type { ActionFailureProps, ActionFailureReport } from './types';

// Where a refused action is said: once, above the controls it wraps, rather
// than beside the button that was pressed, where a narrow cell or a phone's
// card would wrap it (MB.119, from the coven index's and the member list's
// copies). A control reports through `useActionFailure()`. Outside a wrapper
// the hook gives null rather than a do-nothing report, so a control knows to
// say its refusal itself instead of dropping it
// (claude-docs/components/action-failure.md).

const ActionFailureContext = createContext<ActionFailureReport | null>(null);

export const useActionFailure = (): ActionFailureReport | null => useContext(ActionFailureContext);

const ActionFailure = ({ children }: ActionFailureProps): ReactElement => {
  const [message, setMessage] = useState<string>();
  const value = useMemo(() => ({ report: setMessage }), []);
  return (
    <ActionFailureContext value={value}>
      {message && <Notice kind="error">{message}</Notice>}
      {children}
    </ActionFailureContext>
  );
};

export default ActionFailure;
