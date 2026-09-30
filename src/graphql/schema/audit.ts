import { builder } from '../builder';
import type { Stamps } from './types';

// Every audited row surfaces its stamps as `audit: AuditInfo!`, never as flat
// fields on its own type (DESIGN.md §7). The four stamps only: no ordinary
// finder returns a soft-deleted row.

export const AuditInfo = builder.objectRef<Stamps>('AuditInfo').implement({
  fields: (t) => ({
    createdAt: t.expose('createdAt', { type: 'DateTime' }),
    createdBy: t.exposeID('createdBy'),
    updatedAt: t.expose('updatedAt', { type: 'DateTime' }),
    updatedBy: t.exposeID('updatedBy'),
  }),
});
