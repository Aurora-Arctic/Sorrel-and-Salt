import { ValueAction } from '../../../value-page';
import type { ValueRouteProps } from '../../../types';

export default function ZodiacSignAction({ searchParams }: ValueRouteProps) {
  return ValueAction({ kind: 'zodiacSign', searchParams });
}
