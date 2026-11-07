export interface EmailPageProps {
  searchParams: Promise<{
    next?: string | string[];
    error?: string | string[];
    verified?: string | string[];
  }>;
}
