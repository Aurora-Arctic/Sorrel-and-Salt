export interface AdminPrivilegeChangesPageProps {
  searchParams: Promise<PrivilegeChangesSearchParams>;
}

/** The page's address: the filter, and at most one cursor. */
export interface PrivilegeChangesSearchParams {
  query?: string | string[];
  privilege?: string | string[];
  after?: string | string[];
  before?: string | string[];
}
