import { ValueAction } from '../../../value-page';
import type { ValueRouteProps } from '../../../types';

// Add Zodiac Sign, beside the page's heading while its tab is open.
export default function ZodiacSignAction({ searchParams }: ValueRouteProps) {
  return ValueAction({ kind: 'zodiacSign', searchParams });
}
