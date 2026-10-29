import type { Route } from 'next';

export interface EmailFormProps {
  /** The account's address, or '' when the provider shared none. */
  email: string;
  verified: boolean;
  /** The address was just proved by a followed link: show it and the way on, with nothing to edit. */
  confirmed?: boolean;
  /** Where the account was going, already run through safeReturnPath: Continue goes there, and the links it asks for carry it on. */
  next?: string;
  /** Where Continue goes with no `next`: the landing for the account's role (`postSignInLanding`). */
  landing: Route;
  /** A readable sentence for a failed verification link, from verifyErrorMessage — never a raw code. */
  error?: string;
  /** Seconds the server will refuse another mail for as of this render, so the countdown starts where it stands. */
  waitSeconds?: number;
  /** The account page's path, offered as a secondary Continue to Account button to a verified account on the standalone page. */
  accountPath?: string;
  /** Inside the account page's Email section: no page heading, which the section gives, and never the confirmed view, which stays the email page's. */
  embedded?: boolean;
}
