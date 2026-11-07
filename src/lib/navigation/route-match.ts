import { skeletons } from '../../app/skeletons';
import { matchPattern, type RouteMatch } from './match-pattern';

export type { RouteMatch };

const PATTERNS = Object.keys(skeletons);

/** Which registered page an address opens, or null when none does. */
export function matchRoute(href: string): RouteMatch | null {
  return matchPattern(PATTERNS, href);
}
