export interface ResetPasswordFormProps {
  /**
   * The reset token Better Auth's link carried here, or none when the page has no usable token: a link that
   * was spent, expired or never valid, which the form answers with an offer of a new one.
   */
  token?: string;
}
