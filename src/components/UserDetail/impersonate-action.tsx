'use client';

import { type ReactElement, useState } from 'react';
import { ConfirmQuestion } from '../Modal';
import Notice from '../Notice';
import {
  IMPERSONATION_LANDING,
  impersonationQuestion,
  impersonationRefusal,
  sendImpersonation,
} from '../UserList/impersonation';
import type { UserDetailUser } from './types';

// Impersonate inside the user's modal, asking over the modal's body through ConfirmQuestion, since
// ConfirmedAction would open a second modal. The endpoint is the guard. A success swaps the session
// cookie, so the next page is a full load as the user.

const ImpersonateAction = ({ user }: { user: UserDetailUser }): ReactElement => {
  const [asked, setAsked] = useState(false);
  const [busy, setBusy] = useState(false);
  const [failure, setFailure] = useState<string>();

  return (
    <>
      {failure && <Notice kind="error">{failure}</Notice>}
      <div className="user-detail__actions">
        <button
          type="button"
          className="btn btn--destructive"
          aria-label={`Impersonate ${user.name}`}
          onClick={() => {
            setFailure(undefined);
            setAsked(true);
          }}
        >
          Impersonate
        </button>
      </div>
      <ConfirmQuestion
        asked={asked}
        question={impersonationQuestion(user.name)}
        confirmLabel="Impersonate"
        busyLabel="Impersonating"
        tone="destructive"
        keepLabel="Cancel"
        busy={busy}
        onConfirm={async () => {
          setBusy(true);
          try {
            await sendImpersonation(user.id);
          } catch (error) {
            setBusy(false);
            throw error;
          }
          // Left busy: the page is replaced by the load below.
          window.location.assign(IMPERSONATION_LANDING);
        }}
        onKeep={() => setAsked(false)}
        onRefused={() => {
          setAsked(false);
          setFailure(impersonationRefusal(user.name));
        }}
      />
    </>
  );
};

export default ImpersonateAction;
