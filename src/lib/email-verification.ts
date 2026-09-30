import { VERIFIED_LANDING } from './account-email';
import { VERIFICATION_LIFETIME_SECONDS, type EmailVerificationSender } from '@/modules/identity';
import { verifyEmailMessage } from '../emails/verify-email';
import type { ProviderId } from './types';

// Where the email page's decisions meet Better Auth: a resend goes through its
// endpoint, and a change mints the change token its /verify-email endpoint
// already honours — under the same secret and the request's own base URL, so
// a preview host gets a link to itself. Handed to the service by the GraphQL
// context, since a service may not import `auth` (claude-docs/auth.md, "The
// email page"). `auth` is imported at call time: the GraphQL route is built
// under NODE_ENV=production in its tests, where Better Auth refuses to start
// without its secrets, and nothing there sends mail.

/** Where a followed link lands: the page that shows the address it has just proved. */
const CALLBACK_URL = VERIFIED_LANDING;

export function emailVerificationSender(request: Request): EmailVerificationSender {
  return {
    async resend(email) {
      const { auth } = await import('./auth');
      await auth.api.sendVerificationEmail({
        body: { email, callbackURL: CALLBACK_URL },
        headers: request.headers,
      });
    },

    async requestChange(current, next) {
      const [{ auth }, { resolveBaseURL }, { createEmailVerificationToken }] = await Promise.all([
        import('./auth'),
        import('better-auth'),
        import('better-auth/api'),
      ]);
      const ctx = await auth.$context;
      // `updateTo` plus this `requestType` is the branch of /verify-email that
      // swaps the address and verifies it in one write.
      const token = await createEmailVerificationToken(
        ctx.secret,
        current,
        next,
        VERIFICATION_LIFETIME_SECONDS,
        { requestType: 'change-email-verification' },
      );
      const base = resolveBaseURL(auth.options.baseURL, '/api/auth', request);
      const url = `${base}/verify-email?token=${token}&callbackURL=${encodeURIComponent(CALLBACK_URL)}`;
      const holder = await ctx.internalAdapter.findUserByEmail(current);
      const accounts = holder ? await ctx.internalAdapter.findAccounts(holder.user.id) : [];
      const { send } = await import('./mail');
      await send(
        await verifyEmailMessage({
          to: next,
          url,
          purpose: 'change',
          providers: accounts.map((account) => account.providerId as ProviderId),
        }),
      );
    },
  };
}
