'use client';

import { usePathname } from 'next/navigation';
import { covenSlugOf } from './coven-path';

/** The slug of the coven the address is in; a coven's skeleton reads it to draw its own links. */
export function useCovenSlug(): string {
  return covenSlugOf(usePathname()) ?? '';
}
