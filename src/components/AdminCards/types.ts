import type { Route } from 'next';
import type { ModalHeading } from '../Modal/types';
import type { PagePosition, PagerHrefs } from '../../lib/types';

export type BatchStatus = 'live' | 'revoked' | 'expired' | 'used-up';

/** No token or hash is in it. */
export interface BatchEntry {
  batchId: string;
  mintedAt: Date;
  expiresAt: Date;
  note: string | null;
  beta: boolean;
  cards: number;
  accepted: number;
  pending: number;
  attempts: number;
  status: BatchStatus;
}

export type CardAttemptReason = 'revoked' | 'expired' | 'accepted';

export interface CardAttemptEntry {
  id: string;
  reason: CardAttemptReason;
  attempts: number;
  firstAttemptedAt: Date;
  lastAttemptedAt: Date;
  /** The card's place in its batch from 1; null for a card minted before places were kept. */
  cardPosition: number | null;
  /** Null once the account is gone. */
  accountId: string | null;
  accountName: string | null;
  accountEmail: string | null;
}

export interface AdminCardsCursor {
  after?: string;
  before?: string;
}

export interface AdminCardsProps extends Partial<PagerHrefs<Route>> {
  batches: BatchEntry[];
  cursor?: AdminCardsCursor;
  position?: PagePosition;
  filter?: CardsFilter;
  minting?: boolean;
}

export interface MintCardsProps {
  filter?: CardsFilter;
  cursor?: AdminCardsCursor;
}

export interface MintFormProps {
  open: boolean;
  closeHref: Route;
}

export interface MintFieldsProps {
  close: () => void;
}

export interface ArrivalEntry {
  id: string;
  accountName: string;
  accountEmail: string;
  acceptedAt: Date;
  batchId: string;
  beta: boolean;
  covens: string[];
  /** Where the account's name opens its user modal, as the Users list does; null once the account is gone. */
  account: { openHref: Route; heading: ModalHeading } | null;
}

export interface AdminArrivalsProps extends Partial<PagerHrefs<Route>> {
  arrivals: ArrivalEntry[];
  position?: PagePosition;
  filter?: ArrivalsFilter;
}

/** The batch filter the address holds, every part text and blank for none: a day is `YYYY-MM-DD`, a status one of `BatchStatus`. */
export interface CardsFilter {
  batch: string;
  status: BatchStatus | '';
  mintedFrom: string;
  mintedTo: string;
  expiresFrom: string;
  expiresTo: string;
}

export interface ArrivalsFilter {
  query: string;
}

export interface CardsFilterProps {
  filter: CardsFilter;
}

export interface ArrivalsFilterProps {
  filter: ArrivalsFilter;
}

export interface ArrivalsActionsProps {
  filter?: ArrivalsFilter;
}
