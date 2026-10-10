import 'server-only';
import { Forbidden } from '../../../lib/errors';
import type { Session } from '../../../lib/session';
import { isSiteAdmin } from './admin-changes';

// CLAUDE.md rule 5's two layers, on the site role rather than a workspace
// role: `assertSiteAdmin` is the check, and the `SiteAdmin` it returns is the
// proof the check ran, which every compendium-tier `AuditWriter` method
// demands — see claude-docs/db/site-admin-proof.md, "The SiteAdmin proof".

// Not exported, so no object literal outside this file satisfies `SiteAdmin`.
declare const brand: unique symbol;

/**
 * Proof that `assertSiteAdmin` found this user a site admin. It names no
 * workspace: an admin curates the compendium and reaches no coven.
 */
export type SiteAdmin = {
  readonly userId: string;
  readonly [brand]: true;
};

/**
 * The site-role check, for everything only a site admin may do: the
 * compendium-tier writes, the admin-curated vocabularies and the admin reads.
 * Reads the session's role and nothing else, which the request read off the
 * user's row. `reason` is what the refusal says, when the caller has a more
 * particular one than the default.
 *
 * @throws {Forbidden} the session's role is not `admin`.
 */
export function assertSiteAdmin(
  session: Session,
  reason = 'Only a site admin may do this',
): SiteAdmin {
  if (!isSiteAdmin(session)) throw new Forbidden(reason);
  return { userId: session.userId } as SiteAdmin;
}
