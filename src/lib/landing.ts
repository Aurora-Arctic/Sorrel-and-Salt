import 'server-only';
import type { Route } from 'next';
import { firstCovenSlugOf } from '@/modules/coven';
import type { Session } from './session';
import { covenHome } from './shell-home';
import { postSignInLanding, POST_SIGN_IN_LANDING } from './sign-in';

/** A member goes straight into the first coven the switcher lists, as `/coven` would only redirect there; the same answer as `covenHome`. */
export async function signedInLanding(session: Session): Promise<Route> {
  const landing = postSignInLanding(session.role);
  if (landing !== POST_SIGN_IN_LANDING) return landing;
  const slug = await firstCovenSlugOf(session);
  return covenHome(slug === undefined ? [] : [{ slug, paused: null }]);
}
