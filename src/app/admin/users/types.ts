export interface AdminUsersPageProps {
  // A promise in Next 16 (node_modules/next/dist/docs/01-app/03-api-reference/
  // 03-file-conventions/page.md) — must be awaited before use.
  searchParams: Promise<UsersSearchParams>;
}

/** The page's address: the filter, and at most one cursor. */
export interface UsersSearchParams {
  query?: string | string[];
  awaiting?: string | string[];
  after?: string | string[];
  before?: string | string[];
}
