import type { auditStampColumns } from '@/modules/identity/schema/users';

export type Stamps = {
  [K in keyof typeof auditStampColumns]: (typeof auditStampColumns)[K]['_']['data'];
};
