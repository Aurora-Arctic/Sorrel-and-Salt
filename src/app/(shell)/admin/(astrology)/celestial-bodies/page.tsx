import type { Metadata } from 'next';
import { ValuePage } from '../../value-page';
import type { ValueRouteProps } from '../../types';

export const metadata: Metadata = {
  title: 'Celestial Bodies',
};

// The curated celestial bodies, in the page shape every curated value shares.
export default function AdminCelestialBodiesPage({ searchParams }: ValueRouteProps) {
  return ValuePage({ kind: 'celestialBody', searchParams });
}
