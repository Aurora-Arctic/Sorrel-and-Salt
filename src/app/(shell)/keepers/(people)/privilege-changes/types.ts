export interface AdminPrivilegeChangesPageProps {
  searchParams: Promise<PrivilegeChangesSearchParams>;
}

export interface PrivilegeChangesSearchParams {
  query?: string | string[];
  privilege?: string | string[];
  after?: string | string[];
  before?: string | string[];
}
