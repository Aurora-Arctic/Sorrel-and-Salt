import { ValueAction } from '../../../value-page';
import type { ValueRouteProps } from '../../../types';

// Add Celestial Body, beside the page's heading while its tab is open (MB.115).
export default function PlanetAction({ searchParams }: ValueRouteProps) {
  return ValueAction({ kind: 'planet', searchParams });
}
