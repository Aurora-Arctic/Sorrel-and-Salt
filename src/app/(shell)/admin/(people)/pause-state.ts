import 'server-only';
import { cache } from 'react';
import { adminRoleChangePauseState } from '@/modules/identity';

// Whether admin changes are paused and whether this admin may flip that
// (MB.63), cached per request: the People tabs' pages and their actions
// beside the heading each ask, and the request reads it once. Keyed by the
// session, which `requireAdminSession()` hands every caller as one object.
export const readPauseState = cache(adminRoleChangePauseState);
