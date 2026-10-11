import { listHref } from '../../lib/list-href';

// The Invitations tab's addresses (MB.115): the tab, and the tab with the
// invite form open over it, by `?invite`'s presence, as a value page's `?new`.

export const INVITATIONS_HREF = listHref('/admin/invitations');

export const INVITE_HREF = listHref('/admin/invitations', { invite: true });
