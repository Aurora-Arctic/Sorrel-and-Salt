import { emailVerificationSender } from '../lib/email-verification';
import { invitationSender } from '../lib/invitation-mail';
import { passwordSetter } from '../lib/password-setter';
import { pauseNotifier } from '../lib/pause-mail';
import { documentMailingNotifier } from '../lib/document-mailing-mail';
import { anonymousMinter } from '../lib/anonymous-minter';
import { supportNotifier } from '../lib/support-mail';
import { sessionStateFromHeaders } from '../lib/request-session';
import { createLoaders } from './loaders';
import { isSupportOperation, type OperationParams } from './paused-operations';
import type { Context } from './types';

/** Yoga's `context` option, called once per request. */
export async function createContext({
  request,
  params,
  setCookies = [],
}: {
  request: Request;
  params?: OperationParams;
  /** Where a minted anonymous session's cookie is collected, for the route to put on the response. */
  setCookies?: string[];
}): Promise<Context> {
  const state = await sessionStateFromHeaders(request.headers);
  // A paused session acts as itself for the signed-in support form alone; elsewhere it acts as nobody, so a public read
  // answers as signed out and the rest are refused with the pause.
  const paused = state.accessPause && !isSupportOperation(params) ? state.accessPause : undefined;
  // An anonymous sender's session acts for the support operations, which carry the one extra field that mints it, and for
  // nothing else; there it reads as signed out, with no pause.
  const session =
    paused || (state.anonymous && !isSupportOperation(params, true)) ? null : state.session;
  return {
    session,
    ...(paused && { accessPause: paused }),
    loaders: createLoaders(session),
    emailVerification: emailVerificationSender(request),
    invitations: invitationSender(request),
    passwords: passwordSetter(request),
    support: supportNotifier(request),
    pauses: pauseNotifier(request),
    documents: documentMailingNotifier(request),
    anonymous: anonymousMinter(request, setCookies),
    clientIp: request.headers.get('x-vercel-forwarded-for')?.split(',')[0]?.trim() || null,
  };
}
