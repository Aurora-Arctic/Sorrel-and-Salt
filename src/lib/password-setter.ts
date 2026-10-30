import type { PasswordSetter } from '@/modules/identity';
import { withBreachedCheck } from './breached-password';
import { ValidationError } from './errors';
import { mailPasswordChanged } from './password-notice';
import { PASSWORD_CHECK_UNAVAILABLE, newPasswordRefusal } from './password-refusals';
import { requestOrigin } from './request-origin';

// Where the account page's Set Password meets Better Auth, whose set-password endpoint answers only on the
// server. Handed to the service by the GraphQL context, as a service may not import `auth`
// (claude-docs/auth/passwords.md, "Setting a first password"); imported at call time, for the reason
// `requestOrigin` gives.

const ALREADY_SET = 'This account already has a password. Change it instead.';

export function passwordSetter(request: Request): PasswordSetter {
  return {
    async set(newPassword) {
      const [{ auth }, { isAPIError }] = await Promise.all([
        import('./auth'),
        import('better-auth/api'),
      ]);
      try {
        await withBreachedCheck(() =>
          auth.api.setPassword({ body: { newPassword }, headers: request.headers }),
        );
      } catch (error) {
        if (!isAPIError(error)) throw error;
        const failure = { code: error.body?.code, message: error.body?.message ?? error.message };
        const message =
          newPasswordRefusal(failure) ??
          (failure.code === 'PASSWORD_ALREADY_SET' ? ALREADY_SET : undefined) ??
          (error.statusCode === 500 ? PASSWORD_CHECK_UNAVAILABLE : undefined);
        if (!message) throw error;
        throw new ValidationError([{ path: ['newPassword'], message }], message);
      }
      const session = await auth.api.getSession({ headers: request.headers });
      if (session) {
        await mailPasswordChanged(session.user.email, await requestOrigin(request, ''), 'set');
      }
    },
  };
}
