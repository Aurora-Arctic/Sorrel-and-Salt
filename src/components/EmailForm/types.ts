import type { Route } from 'next';

export interface EmailFormProps {
  email: string;
  verified: boolean;
  confirmed?: boolean;
  next?: string;
  landing: Route;
  /** A readable sentence for a failed verification link, from verifyErrorMessage — never a raw code. */
  error?: string;
  /** Seconds the server will refuse another mail for as of this render, so the countdown starts where it stands. */
  waitSeconds?: number;
  accountPath?: string;
  /** Inside the account page's Email section: no page heading, which the section gives, and never the confirmed view, which stays the email page's. */
  embedded?: boolean;
}
