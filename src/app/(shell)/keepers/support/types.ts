export interface SupportPageProps {
  searchParams: Promise<SupportSearchParams>;
}

export interface SupportSearchParams {
  about?: string | string[];
  view?: string | string[];
  error?: string | string[];
  sender?: string | string[];
  after?: string | string[];
  before?: string | string[];
  request?: string | string[];
  user?: string | string[];
}
