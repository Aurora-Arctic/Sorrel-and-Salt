import { ValueAction } from '../../../value-page';
import type { ValueRouteProps } from '../../../types';

// Add Deity, beside the page's heading while its tab is open (MB.115).
export default function DeityAction({ searchParams }: ValueRouteProps) {
  return ValueAction({ kind: 'deity', searchParams });
}
