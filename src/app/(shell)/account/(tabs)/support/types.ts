export interface SupportListPageProps {
  searchParams: Promise<{
    after?: string | string[];
    before?: string | string[];
    request?: string | string[];
  }>;
}
