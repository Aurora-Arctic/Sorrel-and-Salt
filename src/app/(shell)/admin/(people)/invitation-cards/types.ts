export interface CardsPageProps {
  // A promise in Next 16: it must be awaited before use.
  searchParams: Promise<CardsSearchParams>;
}

/** The tab's address: at most one cursor, `?mint` for the form, and `?user=<id>` for a user's modal (Card Sign-Ups). */
export interface CardsSearchParams {
  after?: string | string[];
  before?: string | string[];
  mint?: string | string[];
  user?: string | string[];
}
