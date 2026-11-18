import 'server-only';
import { getSession, sessionIsVerified } from './request-session';
import { curates } from './site-roles';

/** What a help reader page offers its viewer beyond the text. */
export interface HelpViewerOffers {
  /** The link to Staff Help: a verified curator's or keeper's. */
  staffHelp: boolean;
  /** Edit on an article: a verified keeper's, as only a keeper writes help. */
  edit: boolean;
}

/**
 * Read per request by the help pages, beside their cached reads and never inside one, as the help text is cached for
 * every viewer under the tag `help` and these depend on who is asking (CLAUDE.md rule 6). The edit page itself still
 * refuses anyone but a keeper; this only decides what is drawn.
 */
export async function helpViewerOffers(): Promise<HelpViewerOffers> {
  const session = await getSession();
  if (!session || !(await sessionIsVerified())) return { staffHelp: false, edit: false };
  return { staffHelp: curates(session.role), edit: session.role === 'admin' };
}
