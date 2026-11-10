import type { SpellStatus, SpellVisibility } from '../types';

// Written out because the table's enums would pull the database schema into the browser; the `satisfies` and the tests in
// `tests/modules/grimoire/validation/` keep each equal to its column. `public` is deferred with the notes subsystem (§13).
export const VISIBILITIES = ['private', 'workspace'] as const satisfies readonly SpellVisibility[];
export const STATUSES = ['draft', 'complete'] as const satisfies readonly SpellStatus[];

export const VISIBILITY_MESSAGE = 'Choose private or coven';
