import { ValueAction } from '../../../value-page';
import type { ValueRouteProps } from '../../../types';

export default function CelestialBodyAction({ searchParams }: ValueRouteProps) {
  return ValueAction({ kind: 'celestialBody', searchParams });
}
