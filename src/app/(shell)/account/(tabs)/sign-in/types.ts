export interface SignInPageProps {
  searchParams: Promise<{
    error?: string | string[];
    provider?: string | string[];
  }>;
}
