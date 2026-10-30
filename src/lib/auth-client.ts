'use client';

import { createAuthClient } from 'better-auth/react';
import { adminClient, lastLoginMethodClient, twoFactorClient } from 'better-auth/client/plugins';
import { passkeyClient } from '@better-auth/passkey/client';
import { apiPath } from './api-path';
import { LAST_USED_PROVIDER_COOKIE } from './sign-in';

// No baseURL: the client infers the current origin, which the app and /api/auth share. Better Auth's client assigns `window.location.href` for the OAuth hop,
// so component tests mock this module. `adminClient` is for the two impersonation calls alone: its other methods name endpoints never mounted, and where
// impersonation is off the two answer 404 (claude-docs/auth/impersonation.md).
export const authClient = createAuthClient({
  basePath: apiPath('/api/auth'),
  plugins: [
    lastLoginMethodClient({ cookieName: LAST_USED_PROVIDER_COOKIE }),
    adminClient(),
    passkeyClient(),
    // No redirect option: the password form reads `twoFactorRedirect` from its own answer and shows the code step in place.
    twoFactorClient(),
  ],
});

export const { signIn, signOut, linkSocial, unlinkAccount, getLastUsedLoginMethod, useSession } =
  authClient;
export const { impersonateUser, stopImpersonating } = authClient.admin;

// Email and password sign-up; its sign-in is `signIn.email` above.
export const { signUp } = authClient;

// Asking for a reset link, following it, and changing a password from a session; setting a first password
// is the `setPassword` mutation, as Better Auth's endpoint for it answers only on the server.
export const { requestPasswordReset, resetPassword, changePassword } = authClient;
export const { passkey } = authClient;

// Turning two-factor on and off from the account page, and the code step of a password sign-in.
export const { twoFactor } = authClient;
