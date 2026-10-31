import type { Route } from 'next';
import type { ModalHeading } from '../Modal/types';
import type { PagePosition, PagerHrefs } from '../../lib/types';

/** Where a batch stands: live while a card is pending, else used up, expired or revoked. */
export type BatchStatus = 'live' | 'revoked' | 'expired' | 'used-up';

/** One batch, as `/admin/invitation-cards` lists it: the mint, with its cards counted. No token or hash is in it. */
export interface BatchEntry {
  batchId: string;
  mintedAt: Date;
  expiresAt: Date;
  /** How many cards the mint made. */
  cards: number;
  /** How many of them have been accepted. */
  accepted: number;
  /** How many can still be accepted, and so revoked. */
  pending: number;
  /** How many refused opens of its cards are on record, over every card, account and reason. */
  attempts: number;
  status: BatchStatus;
}

/** Why an open of a card link was refused and recorded. */
export type CardAttemptReason = 'revoked' | 'expired' | 'accepted';

/** One account's refused opens of one card of a batch for one reason. */
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

/** The page of the list the address shows, by the cursor it turned on; none for the first. */
export interface AdminCardsCursor {
  after?: string;
  before?: string;
}

export interface AdminCardsProps extends Partial<PagerHrefs<Route>> {
  /** This page of the batches, newest first. */
  batches: BatchEntry[];
  /** The page shown, which the mint form closes back to; the first when left out. */
  cursor?: AdminCardsCursor;
  /** Where this page stands, the pager's "Page X of Y". */
  position?: PagePosition;
  /** The filter the address holds; none when left out. */
  filter?: CardsFilter;
  /** Whether the address opens the mint form, `?mint`. */
  minting?: boolean;
}

export interface MintCardsProps {
  /** The filter the form opens over, which the tab keeps. */
  filter?: CardsFilter;
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
  /** Where the account's name opens its user modal, as the Users list does; null once the account is gone. */
  account: { openHref: Route; heading: ModalHeading } | null;
}

export interface AdminArrivalsProps extends Partial<PagerHrefs<Route>> {
  /** This page of the arrivals, newest first. */
  arrivals: ArrivalEntry[];
  /** Where this page stands, the pager's "Page X of Y". */
  position?: PagePosition;
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

export interface CardsFilterProps {
  filter: CardsFilter;
}
