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

// The row's Impersonate, asking first as every other row action does:
// acting as someone else is the table's one
// dangerous control, so the modal says what it means and how it ends. Better
// Auth's endpoint is the guard: it refuses a non-admin and an admin target
// whatever this shows. A success swaps the session cookie, so the next page
// is a full load as the user, the confirm busy until it opens.

const ImpersonateButton = ({ userId, name }: ImpersonateButtonProps): ReactElement => (
  <ConfirmedAction
    label="Impersonate"
    accessibleName={`Impersonate ${name}`}
    openClass="btn btn--small btn--destructive"
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
