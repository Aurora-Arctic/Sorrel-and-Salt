export interface AdminInvitationsPageProps {
  // A promise in Next 16 (node_modules/next/dist/docs/01-app/03-api-reference/
  // 03-file-conventions/page.md) — must be awaited before use.
  searchParams: Promise<InvitationsSearchParams>;
}

/** The tab's address: the invite form open over it, by `?invite`'s presence. */
export interface InvitationsSearchParams {
  invite?: string | string[];
}
