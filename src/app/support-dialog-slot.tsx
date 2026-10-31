import SupportDialog from '../components/SupportDialog';
import type { SupportDialogState } from '../components/SupportDialog/types';
import { getSession, sessionIsVerified } from '../lib/request-session';
import { getMySupportTimeoutEnd } from '../modules/support';

// The Support dialog's one place, in the root layout, with what this visitor may do in it: write
// signed out, confirm an address first, wait out a time-out, or write.
export default async function SupportDialogSlot() {
  const session = await getSession();
  let state: SupportDialogState;
  if (!session) state = { kind: 'signed-out' };
  else if (!(await sessionIsVerified())) state = { kind: 'unverified' };
  else {
    const until = await getMySupportTimeoutEnd(session);
    state = until ? { kind: 'timed-out', until } : { kind: 'form' };
  }
  return <SupportDialog state={state} />;
}
