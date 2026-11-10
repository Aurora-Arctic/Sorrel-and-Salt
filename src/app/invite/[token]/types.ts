import type { SITE_INVITATION_PARAM } from '@/lib/invitation-link';

export interface InvitePageProps {
  params: Promise<{ token: string }>;
  searchParams: Promise<
    { error?: string | string[] } & Partial<Record<typeof SITE_INVITATION_PARAM, string | string[]>>
  >;
}
