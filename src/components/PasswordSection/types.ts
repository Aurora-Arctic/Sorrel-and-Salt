export interface PasswordSectionProps {
  /**
   * Whether the account holds a password: it changes one, asked for the current one, or, signed in with
   * a provider alone, sets a first one without it.
   */
  hasPassword: boolean;
  /** Whether two-factor is on; offered only once the account holds a password, as it guards password sign-ins alone. */
  twoFactorEnabled?: boolean;
}

export interface TwoFactorSettingsProps {
  /** Whether two-factor is on for the account as the page loads. */
  enabled: boolean;
}
