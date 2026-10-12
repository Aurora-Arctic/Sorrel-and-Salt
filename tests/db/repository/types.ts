import type { PageCount } from '@/lib/types';

/** Every page of a filter, followed to the end: the ids in order, and the count each page read. */
export interface Walk {
  ids: string[];
  counts: PageCount[];
}

/** What an invitation test varies beside the address, the role and the default token. */
export interface InvitationOverrides {
  token?: string;
  expiresAt?: Date;
  note?: string;
}
