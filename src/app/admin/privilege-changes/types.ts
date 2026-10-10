export interface AdminPrivilegeChangesPageProps {
  // A promise in Next 16 (node_modules/next/dist/docs/01-app/03-api-reference/
  // 03-file-conventions/page.md) — must be awaited before use.
  searchParams: Promise<PrivilegeChangesSearchParams>;
}

/** The page's address: the filter, and at most one cursor. */
export interface PrivilegeChangesSearchParams {
  query?: string | string[];
  privilege?: string | string[];
  after?: string | string[];
  before?: string | string[];
}
