import { scheduleAccountNotice, type PasswordSetter } from '@/modules/identity';
import { withBreachedCheck } from './breached-password';
import { fieldRefusal } from './errors';
import { PASSWORD_CHECK_UNAVAILABLE, newPasswordRefusal } from './password-refusals';
import { requestOrigin } from './request-origin';
import { isFreshSession } from './session-fresh';

// Where Set Password meets Better Auth, handed to the service by the GraphQL context since a service may not
// import `auth` (claude-docs/auth/passwords.md, "Setting a first password"). Imported at call time, as
// `requestOrigin` explains.

const ALREADY_SET = 'This account already has a password. Change it instead.';

export function passwordSetter(request: Request): PasswordSetter {
  return {
    async sessionIsFresh() {
      const { auth } = await import('./auth');
      const session = await auth.api.getSession({ headers: request.headers });
      if (!session) return false;
      return isFreshSession(
        session.session.createdAt,
        (await auth.$context).sessionConfig.freshAge,
      );
    },
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
        throw fieldRefusal('newPassword', message);
      }
      const session = await auth.api.getSession({ headers: request.headers });
      if (session) {
        await scheduleAccountNotice({
          kind: 'password-changed',
          userId: session.user.id,
          origin: await requestOrigin(request, ''),
          how: 'set',
        });
      }
    },
  };
}
