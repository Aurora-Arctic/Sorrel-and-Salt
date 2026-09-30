export interface EmailFormProps {
  /** The account's address, or '' when the provider shared none. */
  email: string;
  verified: boolean;
  /** The address was just proved by a followed link: show it and the way on, with nothing to edit. */
  confirmed?: boolean;
  /** Where "Continue" goes, and where the links it asks for carry on to; already run through safeReturnPath. */
  next: string;
  /** A readable sentence for a failed verification link, from verifyErrorMessage — never a raw code. */
  error?: string;
  /** Seconds the server will refuse another mail for as of this render, so the countdown starts where it stands. */
  waitSeconds?: number;
  resendDelaySeconds?: number;
}

export interface Failure {
  /** Lands beside the input: a VALIDATION issue pathed to `email`. */
  field?: string;
  /** Lands in the alert region: anything else. */
  alert?: string;
}
