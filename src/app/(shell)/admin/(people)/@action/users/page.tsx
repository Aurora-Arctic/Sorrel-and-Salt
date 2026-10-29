import { PauseControl } from '../../../../../../components/UserList';
import { requireAdminSession } from '../../../../../../lib/request-session';
import { readPauseState } from '../../pause-state';

// The switch on admin changes, beside the page's heading while Users is open.
// Keyed by the state, so the refresh after a flip mounts a fresh switch rather than keeping this
// one's busy state.
export default async function UsersAction() {
  const session = await requireAdminSession();
  const adminChanges = await readPauseState(session);
  return <PauseControl key={String(adminChanges.paused)} {...adminChanges} />;
}
