export interface SupportPageProps {
  // A promise in Next 16 (node_modules/next/dist/docs/01-app/03-api-reference/
  // 03-file-conventions/page.md) — must be awaited before use.
  searchParams: Promise<SupportSearchParams>;
}

/** The page's address: its filter (`view`, `about`, `error`), at most one cursor, and `?request=<id>` for one opened. */
export interface SupportSearchParams {
  about?: string | string[];
  view?: string | string[];
  error?: string | string[];
  sender?: string | string[];
  after?: string | string[];
  before?: string | string[];
  request?: string | string[];
  /** The id of the user whose modal is open, over the request when one is. */
  user?: string | string[];
}
