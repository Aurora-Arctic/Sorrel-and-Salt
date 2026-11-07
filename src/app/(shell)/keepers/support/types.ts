export interface SupportPageProps {
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
