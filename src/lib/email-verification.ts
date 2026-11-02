import { after } from 'next/server';
import { verifiedLanding } from './account-email';
import {
  scheduleAccountNotice,
  scheduleSecretLinkMail,
  type EmailVerificationSender,
} from '@/modules/identity';
import { requestOrigin } from './request-origin';
import { safeReturnPath } from './sign-in';

// Where the email page's decisions meet Better Auth: a resend goes through its endpoint, and a change goes to the secret-link
// job, which signs the token its /verify-email endpoint honours under the request's own base URL, so a preview host links to
// itself. Handed to the service by the GraphQL context, as a service may not import `auth`
// (claude-docs/auth/admin-bootstrap.md, "The email page"); imported at call time, for the reason `requestOrigin` gives.

export function emailVerificationSender(request: Request): EmailVerificationSender {
  return {
    async resend(email, next) {
      const { auth } = await import('./auth');
      await auth.api.sendVerificationEmail({
        body: { email, callbackURL: verifiedLanding(next) },
        headers: request.headers,
      });
    },

    async sessionIsFresh(seconds) {
      const { auth } = await import('./auth');
      const result = await auth.api.getSession({ headers: request.headers });
      return !!result && Date.now() - new Date(result.session.createdAt).getTime() < seconds * 1000;
    },

    defer(task) {
      after(task);
    },

    async notifyChangeRequested(userId) {
      await scheduleAccountNotice({
        kind: 'change-requested',
        userId,
        origin: await requestOrigin(request, ''),
      });
    },

    async requestChange(userId, next) {
      // Guarded before the run holds it, so the run never carries a path that leaves the site.
      await scheduleSecretLinkMail({
        kind: 'change',
        userId,
        authBase: await requestOrigin(request, '/api/auth'),
        next: safeReturnPath(next) ?? null,
      });
    },
  };
}
