import 'server-only';
import { cache } from 'react';
import { adminRoleChangePauseState } from '@/modules/identity';

// Whether admin changes are paused and whether this admin may flip that, cached per request so the
// People tabs and their actions read it once. Keyed by the session, which `requireAdminSession()`
// hands every caller as one object.
export const readPauseState = cache(adminRoleChangePauseState);
