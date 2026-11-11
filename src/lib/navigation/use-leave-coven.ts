import { COVEN_LANDING_PATH } from '../coven-path';
import { usePendingNavigation } from './use-navigation';

/**
 * Returns a function that sends the viewer to the coven landing once a coven is closed to them. The
 * page is replaced first, then the router refreshes, because a client-side replace does not re-run
 * the layout and the shell's coven switcher would still list the coven.
 */
export function useLeaveCoven(): () => void {
  const { navigate, refresh } = usePendingNavigation();
  return () => {
    navigate(COVEN_LANDING_PATH, { replace: true });
    refresh();
  };
}
