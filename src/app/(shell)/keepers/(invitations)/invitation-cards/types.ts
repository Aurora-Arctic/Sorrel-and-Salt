export interface CardsPageProps {
  searchParams: Promise<CardsSearchParams>;
}

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

export interface ArrivalsPageProps {
  searchParams: Promise<ArrivalsSearchParams>;
}

export interface ArrivalsSearchParams {
  after?: string | string[];
  before?: string | string[];
  query?: string | string[];
  user?: string | string[];
}
