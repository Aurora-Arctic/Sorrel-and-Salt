export interface SignInPageProps {
  searchParams: Promise<{
    next?: string | string[];
    error?: string | string[];
    mode?: string | string[];
  }>;
}
