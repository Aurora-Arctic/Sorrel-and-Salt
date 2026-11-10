import type { Metadata } from 'next';
import { pageTitle } from '@/lib/page-metadata';
import { ValuePage } from '../../value-page';
import type { ValueRouteProps } from '../../types';

export const metadata: Metadata = pageTitle('Celestial Bodies');

export default function AdminCelestialBodiesPage({ searchParams }: ValueRouteProps) {
  return ValuePage({ kind: 'celestialBody', searchParams });
}
