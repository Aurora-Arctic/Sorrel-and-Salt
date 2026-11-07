export interface AccountPageProps {
  searchParams: Promise<{
    after?: string | string[];
    before?: string | string[];
  }>;
}
