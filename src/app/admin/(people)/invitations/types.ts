export interface AdminInvitationsPageProps {
  // A promise in Next 16 (node_modules/next/dist/docs/01-app/03-api-reference/
  // 03-file-conventions/page.md) — must be awaited before use.
  searchParams: Promise<InvitationsSearchParams>;
}

/**
 * The tab's address: its filter, `email` and the `expiring` flag (MB.115),
 * and the invite form open over it, by `?invite`'s presence.
 */
export interface InvitationsSearchParams {
  email?: string | string[];
  expiring?: string | string[];
  invite?: string | string[];
}
