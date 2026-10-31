export interface SupportPageProps {
  // A promise in Next 16 (node_modules/next/dist/docs/01-app/03-api-reference/
  // 03-file-conventions/page.md) — must be awaited before use.
  searchParams: Promise<SupportSearchParams>;
}

/** The page's address: its filter (`about`, `status`, `error`), at most one cursor, and `?request=<id>` for one opened. */
export interface SupportSearchParams {
  about?: string | string[];
  status?: string | string[];
  error?: string | string[];
  after?: string | string[];
  before?: string | string[];
  request?: string | string[];
}
