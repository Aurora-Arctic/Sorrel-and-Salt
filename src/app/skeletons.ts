import type { ComponentType } from 'react';
import type { SkeletonHost } from '../lib/navigation/skeleton-for';

/**
 * What each page draws while it is on its way, by the address pattern the folders under `src/app`
 * name it with. `host` is the body that draws it: the shell's `main`, a coven's body or an admin
 * area's body. Each skeleton sits in `skeleton.tsx` beside its page or a layout above it.
 */
export const skeletons: Record<string, { host: SkeletonHost; Skeleton: ComponentType }> = {};
