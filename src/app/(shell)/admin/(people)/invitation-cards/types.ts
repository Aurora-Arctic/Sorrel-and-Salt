export interface CardsPageProps {
  // A promise in Next 16: it must be awaited before use.
  searchParams: Promise<CardsSearchParams>;
}

/** The tab's address: its filter, at most one cursor, and `?mint` for the form. */
export interface CardsSearchParams {
  after?: string | string[];
  before?: string | string[];
  mint?: string | string[];
  batch?: string | string[];
  status?: string | string[];
  mintedFrom?: string | string[];
  mintedTo?: string | string[];
  expiresFrom?: string | string[];
  expiresTo?: string | string[];
}
