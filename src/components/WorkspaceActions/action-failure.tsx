'use client';

import { createContext, type ReactElement, useContext, useMemo, useState } from 'react';
import Notice from '../Notice';
import type { ActionFailureProps } from './types';

// Where a refused Leave or Delete is said on the coven index page (M6.15):
// under the "Your Membership" heading and above the buttons, rather than
// beside the button that was pressed. The page wraps both buttons in it and
// they report to it. A button rendered outside it has no context and shows
// its refusal beside itself (claude-docs/components/leave-workspace-button.md).

const ActionFailureContext = createContext<{
  report: (message: string | undefined) => void;
} | null>(null);

export const useActionFailure = () => useContext(ActionFailureContext);

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
