export interface SupportPageProps {
  searchParams: Promise<{
    support?: string | string[];
    error?: string | string[];
    ref?: string | string[];
    from?: string | string[];
  }>;
}
