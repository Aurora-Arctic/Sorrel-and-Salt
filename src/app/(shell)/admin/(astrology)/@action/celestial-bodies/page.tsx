import { ValueAction } from '../../../value-page';
import type { ValueRouteProps } from '../../../types';

// Add Celestial Body, beside the page's heading while its tab is open.
export default function CelestialBodyAction({ searchParams }: ValueRouteProps) {
  return ValueAction({ kind: 'celestialBody', searchParams });
}
