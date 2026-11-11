import { cappedCount, cappedWords } from '../FacetPanel/capped-count';
import { plural } from '@/lib/text';
// What the account menu says about a count of support requests, in the button's name and in the panel.

export function countText(count: number, what: string): string {
  return `${cappedWords(count)} ${plural(count, 'request', 'requests')} ${what}`;
}

export function supportTip(
  count: number,
  tipWhat: string,
): { shown: number | string; tip: string } {
  const shown = cappedCount(count);
  return { shown, tip: `${shown} Support ${plural(count, 'Request', 'Requests')} ${tipWhat}` };
}

/** What the button and the panel both show: a count counts only for a verified account, which can reach what it leads to. */
export function accountCounts({
  verified,
  pendingInvitations,
  assignedSupport,
  waitingSupport,
}: {
  verified: boolean;
  pendingInvitations: number;
  assignedSupport: number;
  waitingSupport: number;
}): { pending: boolean; staffCount: number; senderCount: number; invitations: string } {
  return {
    pending: verified && pendingInvitations > 0,
    staffCount: verified ? assignedSupport : 0,
    senderCount: verified ? waitingSupport : 0,
    invitations: `${pendingInvitations} Coven ${plural(pendingInvitations, 'Invitation', 'Invitations')}`,
  };
}
