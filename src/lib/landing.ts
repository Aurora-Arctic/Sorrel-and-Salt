import 'server-only';
import type { Route } from 'next';
import { firstCovenSlugOf } from '@/modules/coven';
import type { Session } from './session';
import { covenHome } from './shell-home';
import { postSignInLanding, POST_SIGN_IN_LANDING } from './sign-in';

/**
 * Where a signed-in account belongs when nothing asked for another page: the sign-in callback's landing and every Continue. The role's landing, except a member
 * goes straight into the first coven the switcher lists, as `/coven` would only redirect there. The shell's Your Coven link gets the same answer (`covenHome`).
 */
export async function signedInLanding(session: Session): Promise<Route> {
  const landing = postSignInLanding(session.role);
  if (landing !== POST_SIGN_IN_LANDING) return landing;
  const slug = await firstCovenSlugOf(session);
  return covenHome(slug === undefined ? [] : [{ slug }]);
}
