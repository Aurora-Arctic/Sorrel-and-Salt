export interface CardsPageProps {
  // A promise in Next 16: it must be awaited before use.
  searchParams: Promise<CardsSearchParams>;
}

/** The tab's address: at most one cursor, and `?mint` for the form. */
export interface CardsSearchParams {
  after?: string | string[];
  before?: string | string[];
  mint?: string | string[];
}
