import type { Metadata } from 'next';
import { ValuePage } from '../../value-page';
import type { ValueRouteProps } from '../../types';

export const metadata: Metadata = {
  title: 'Zodiac Signs',
};

// The curated zodiac signs, in the page shape every curated value shares.
export default function AdminZodiacSignsPage({ searchParams }: ValueRouteProps) {
  return ValuePage({ kind: 'zodiacSign', searchParams });
}
