import { emailVerificationSender } from '../lib/email-verification';
import { invitationSender } from '../lib/invitation-mail';
import { passwordSetter } from '../lib/password-setter';
import { supportNotifier } from '../lib/support-mail';
import { sessionStateFromHeaders } from '../lib/request-session';
import { createLoaders } from './loaders';
import type { Context } from './types';

/** Yoga's `context` option, called once per request. */
export async function createContext({ request }: { request: Request }): Promise<Context> {
  const state = await sessionStateFromHeaders(request.headers);
  // A paused session acts as nobody, so a public read answers as signed out and the rest are refused with the pause.
  const session = state.accessPause ? null : state.session;
  return {
    session,
    ...(state.accessPause && { accessPause: state.accessPause }),
    loaders: createLoaders(session),
    emailVerification: emailVerificationSender(request),
    invitations: invitationSender(request),
    passwords: passwordSetter(request),
    support: supportNotifier(request),
    clientIp: request.headers.get('x-vercel-forwarded-for')?.split(',')[0]?.trim() || null,
  };
}
