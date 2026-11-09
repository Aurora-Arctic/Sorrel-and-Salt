import type { Metadata } from 'next';
import { pageTitle } from '@/lib/page-metadata';
import { ValuePage } from '../../value-page';
import type { ValueRouteProps } from '../../types';

export const metadata: Metadata = pageTitle('Zodiac Signs');

export default function AdminZodiacSignsPage({ searchParams }: ValueRouteProps) {
  return ValuePage({ kind: 'zodiacSign', searchParams });
}
