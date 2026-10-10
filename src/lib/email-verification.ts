import { verifiedLanding } from './account-email';
import { VERIFICATION_LIFETIME_SECONDS, type EmailVerificationSender } from '@/modules/identity';
import { verifyEmailMessage } from '../emails/verify-email';
import { requestOrigin } from './request-origin';

// Where the email page's decisions meet Better Auth: a resend goes through its
// endpoint, and a change mints the change token its /verify-email endpoint
// already honours — under the same secret and the request's own base URL, so
// a preview host gets a link to itself. Handed to the service by the GraphQL
// context, since a service may not import `auth` (claude-docs/auth/admin-bootstrap.md, "The
// email page"). `auth` is imported at call time, for the reason
// `requestOrigin` gives. Either link lands on the page that shows the
// address it has just proved, with the way on.

export function emailVerificationSender(request: Request): EmailVerificationSender {
  return {
    async resend(email, next) {
      const { auth } = await import('./auth');
      await auth.api.sendVerificationEmail({
        body: { email, callbackURL: verifiedLanding(next) },
        headers: request.headers,
      });
    },

    async requestChange(current, address, next) {
      const [{ auth, linkedProviderIds }, { createEmailVerificationToken }] = await Promise.all([
        import('./auth'),
        import('better-auth/api'),
      ]);
      const ctx = await auth.$context;
      // `updateTo` plus this `requestType` is the branch of /verify-email that
      // swaps the address and verifies it in one write.
      const token = await createEmailVerificationToken(
        ctx.secret,
        current,
        address,
        VERIFICATION_LIFETIME_SECONDS,
        { requestType: 'change-email-verification' },
      );
      const base = await requestOrigin(request, '/api/auth');
      const url = `${base}/verify-email?token=${token}&callbackURL=${encodeURIComponent(verifiedLanding(next))}`;
      const holder = await ctx.internalAdapter.findUserByEmail(current);
      const providers = holder ? await linkedProviderIds(ctx, holder.user.id) : [];
      const { send } = await import('./mail');
      await send(await verifyEmailMessage({ to: address, url, purpose: 'change', providers }));
    },
  };
}
