// The marker a site invitation's mailed link carries (claude-docs/components/invitation-acceptance.md).

/** The query key the invitation page reads the marker from. */
export const SITE_INVITATION_PARAM = 'for';
const SITE_INVITATION_VALUE = 'site';

/** The path an invitation's mail links to: a site invitation's carries the marker, a coven's none. */
export function invitationLinkPath(token: string, site: boolean): string {
  const path = `/invite/${encodeURIComponent(token)}`;
  return site ? `${path}?${SITE_INVITATION_PARAM}=${SITE_INVITATION_VALUE}` : path;
}

/** The marker as the page received it; Next hands a repeated key over as an array, which is no marker. */
export function isSiteInvitationMarker(value: string | string[] | undefined): boolean {
  return value === SITE_INVITATION_VALUE;
}
