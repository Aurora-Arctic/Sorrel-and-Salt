import type { auditStampColumns } from '@/modules/identity/schema/users';
import { builder } from '../builder';

// Every audited row surfaces its stamps as `audit: AuditInfo!`, never as flat
// fields on its own type (DESIGN.md §7). The four stamps only: no finder
// returns a soft-deleted row, and the join tables carry no `deleted_at`.

type Stamps = {
  [K in keyof typeof auditStampColumns]: (typeof auditStampColumns)[K]['_']['data'];
};

export const AuditInfo = builder.objectRef<Stamps>('AuditInfo').implement({
  fields: (t) => ({
    createdAt: t.expose('createdAt', { type: 'DateTime' }),
    createdBy: t.exposeID('createdBy'),
    updatedAt: t.expose('updatedAt', { type: 'DateTime' }),
    updatedBy: t.exposeID('updatedBy'),
  }),
});
