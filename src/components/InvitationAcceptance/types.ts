/** What `/invite/[token]` knows of the link for this visitor, read on the server. */
export type InvitationAcceptanceProps =
  /** No session: nothing of the invitation is read until one holds it. */
  | { status: 'signed-out'; signInHref: string }
  /** The service's reason, in its words; `emailHref` for a matching address not yet verified. */
  | { status: 'refused'; message: string; emailHref?: string }
  /** This session may accept: what the invitation grants, and where accepting lands. */
  | { status: 'acceptable'; token: string; tier: 'site'; landing: string };
