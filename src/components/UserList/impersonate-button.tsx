'use client';

import type { ReactElement } from 'react';
import ConfirmedAction from './confirmed-action';
import {
  IMPERSONATION_LANDING,
  impersonationQuestion,
  impersonationRefusal,
  sendImpersonation,
} from './impersonation';
import type { ImpersonateButtonProps } from './types';

// The row's Impersonate, asking first, since acting as someone else is the table's weightiest act.
// Better Auth's endpoint is the guard, refusing a non-admin and an admin target. A success swaps
// the session cookie, so the next page is a full load as the user.

const ImpersonateButton = ({ userId, name }: ImpersonateButtonProps): ReactElement => (
  <ConfirmedAction
    label="Impersonate"
    accessibleName={`Impersonate ${name}`}
    openClass="btn btn--quiet btn--small"
    title="Impersonate User"
    question={impersonationQuestion(name)}
    busy="Impersonating"
    confirmClass="btn btn--destructive"
    send={() => sendImpersonation(userId)}
    onSent={() => window.location.assign(IMPERSONATION_LANDING)}
    refusal={impersonationRefusal(name)}
  />
);

export default ImpersonateButton;
