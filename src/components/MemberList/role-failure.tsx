'use client';

import { createContext, type ReactElement, useContext, useMemo, useState } from 'react';
import Notice from '../Notice';
import type { RoleFailureProps } from './types';

// Where a refused Promote or Demote is said (M6.13): above the table, naming
// the member, rather than beside one row's buttons where a narrow column would
// wrap it. The page wraps the list in it; the role controls report to it
// (claude-docs/components/member-list.md).

const RoleFailureContext = createContext<{ report: (message: string | undefined) => void }>({
  report: () => {},
});

export const useRoleFailure = () => useContext(RoleFailureContext);

const RoleFailure = ({ children }: RoleFailureProps): ReactElement => {
  const [message, setMessage] = useState<string>();
  const value = useMemo(() => ({ report: setMessage }), []);
  return (
    <RoleFailureContext value={value}>
      {message && <Notice kind="error">{message}</Notice>}
      {children}
    </RoleFailureContext>
  );
};

export default RoleFailure;
