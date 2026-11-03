import 'server-only';
import { cache } from 'react';
import { adminRoleChangePauseState } from '@/modules/identity';

// Whether keeper changes are paused and whether this keeper may flip that, cached per request so the
// People tabs and their actions read it once. Keyed by the session, which `requireAdminSession()`
// hands every caller as one object.
export const readPauseState = cache(adminRoleChangePauseState);
