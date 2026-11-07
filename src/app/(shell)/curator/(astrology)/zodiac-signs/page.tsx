import type { Metadata } from 'next';
import { ValuePage } from '../../value-page';
import type { ValueRouteProps } from '../../types';

export const metadata: Metadata = {
  title: 'Zodiac Signs',
};

export default function AdminZodiacSignsPage({ searchParams }: ValueRouteProps) {
  return ValuePage({ kind: 'zodiacSign', searchParams });
}
