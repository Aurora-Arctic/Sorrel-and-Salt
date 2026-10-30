import type { Route } from 'next';
import type { PagePosition, PagerHrefs } from '../../lib/types';

/** Where a card stands now; an accepted card stays accepted whatever became of its date. */
export type CardState = 'pending' | 'accepted' | 'expired' | 'revoked';

/** One card, as `/admin/cards` lists it. It carries no token or hash: the row holds neither. */
export interface CardEntry {
  id: string;
  /** The mint that made it, shared by the whole batch. */
  batchId: string;
  state: CardState;
  expiresAt: Date;
  /** The account that accepted it; null while unaccepted. */
  accountName: string | null;
  /** How many refused opens of the card are on record, over every account and reason. */
  attemptCount: number;
}

/** Why an open of a card link was refused and recorded. */
export type CardAttemptReason = 'revoked' | 'expired' | 'accepted';

/** One account's refused opens of one card for one reason. */
export interface CardAttemptEntry {
  id: string;
  reason: CardAttemptReason;
  attempts: number;
  lastAttemptedAt: Date;
  /** Null once the account is gone. */
  accountName: string | null;
}

/** The page of the list the address shows, by the cursor it turned on; none for the first. */
export interface AdminCardsCursor {
  after?: string;
  before?: string;
}

export interface AdminCardsProps extends Partial<PagerHrefs<Route>> {
  /** This page of the cards, newest first. */
  cards: CardEntry[];
  /** The page shown, which the mint form closes back to; the first when left out. */
  cursor?: AdminCardsCursor;
  /** Where this page stands, the pager's "Page X of Y". */
  position?: PagePosition;
  /** Whether the address opens the mint form, `?mint`. */
  minting?: boolean;
}

export interface MintCardsProps {
  /** The page the tab shows, which the form opens over; the first when left out. */
  cursor?: AdminCardsCursor;
}

export interface MintFormProps {
  /** `?mint` is open: the form shows. */
  open: boolean;
  /** The tab at the page it shows, which the form closes back to. */
  closeHref: Route;
}

/** The form inside its modal, given the modal's own close. */
export interface MintFieldsProps {
  close: () => void;
}

/** One accepted card with the account that arrived by it. */
export interface ArrivalEntry {
  id: string;
  accountName: string;
  accountEmail: string;
  acceptedAt: Date;
  batchId: string;
  /** The covens the account owns now, by name. */
  covens: string[];
}

export interface AdminArrivalsProps extends Partial<PagerHrefs<Route>> {
  /** This page of the arrivals, newest first. */
  arrivals: ArrivalEntry[];
  /** Where this page stands, the pager's "Page X of Y". */
  position?: PagePosition;
}

/** The batches a page of cards shows: each with its cards on the page and how many of them can still be revoked. */
export interface BatchSummary {
  batchId: string;
  cards: number;
  pending: number;
}
