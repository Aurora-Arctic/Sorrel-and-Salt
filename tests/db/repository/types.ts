import type { PageCount } from '@/lib/types';

/** Every page of a filter, followed to the end: the ids in order, and the count each page read. */
export interface Walk {
  ids: string[];
  counts: PageCount[];
}

/** What an invitation test varies beside the role and the default address and token. */
export interface InvitationOverrides {
  email?: string;
  token?: string;
  expiresAt?: Date;
  note?: string;
}
