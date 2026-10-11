'use client';

import { type ReactElement, useState } from 'react';
import { signOut } from '../../lib/auth-client';
import { GENERIC_FAILURE } from '../../lib/graphql-failure';
import Notice from '../Notice';
import './index.scss';

// Sign Out, beside the account page's heading (MB.63, on the owner's call):
// Better Auth's own sign-out at `/api/auth/*`, the one path outside GraphQL,
// which carries the session and no application data
// (claude-docs/auth/graphql-only-exception.md). A success is a full load of
// `/`, so nothing the signed-in page held survives it
// (claude-docs/components/sign-out-button.md).

const LANDING = '/';

const SignOutButton = (): ReactElement => {
  const [pending, setPending] = useState(false);
  const [failed, setFailed] = useState(false);

  async function signOutNow() {
    setPending(true);
    setFailed(false);
    // A refusal answers `error`; a dropped connection throws. Either says so.
    const { error } = await signOut().catch((thrown: unknown) => ({ error: thrown }));
    if (error) {
      setPending(false);
      setFailed(true);
      return;
    }
    window.location.assign(LANDING);
  }

  return (
    <div className="sign-out-button">
      <button
        className="btn"
        type="button"
        disabled={pending}
        aria-busy={pending || undefined}
        onClick={() => void signOutNow()}
      >
        {pending && <span className="spinner" aria-hidden="true" />}
        {pending ? 'Signing Out' : 'Sign Out'}
      </button>
      {/* The shared fallback sentence, though this call is Better Auth's and
          not GraphQL's: it has no more to say about why than a lost request. */}
      {failed && <Notice kind="error">{GENERIC_FAILURE}</Notice>}
    </div>
  );
};

export default SignOutButton;
