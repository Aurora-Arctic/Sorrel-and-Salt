'use client';

import type { ReactElement } from 'react';
import { impersonateUser } from '../../lib/auth-client';
import ConfirmedAction from './confirmed-action';
import type { ImpersonateButtonProps } from './types';

// The row's Impersonate (MB.53), asking first as every other row action does
// (MB.115, on the owner's call): acting as someone else is the table's one
// dangerous control, so the modal says what it means and how it ends. Better
// Auth's endpoint is the guard: it refuses a non-admin and an admin target
// whatever this shows. A success swaps the session cookie, so the next page
// is a full load as the user, the confirm busy until it opens.

const LANDING = '/';

const ImpersonateButton = ({ userId, name }: ImpersonateButtonProps): ReactElement => (
  <ConfirmedAction
    label="Impersonate"
    accessibleName={`Impersonate ${name}`}
    openClass="btn btn--small btn--destructive"
    title="Impersonate User"
    question={
      <>
        Impersonate <strong>{name}</strong>? You will see the site as they do, and act as them,
        until you press Stop Impersonating at the top of the page.
      </>
    }
    busy="Impersonating"
    confirmClass="btn btn--destructive"
    send={async () => {
      // Better Auth answers a refusal rather than throwing it.
      const { error } = await impersonateUser({ userId });
      if (error) throw error;
    }}
    onSent={() => window.location.assign(LANDING)}
    refusal={`You couldn't impersonate ${name}. Please try again.`}
  />
);

export default ImpersonateButton;
