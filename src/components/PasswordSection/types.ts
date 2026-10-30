export interface PasswordSectionProps {
  /**
   * Whether the account holds a password: it changes one, asked for the current one, or, signed in with
   * a provider alone, sets a first one without it.
   */
  hasPassword: boolean;
}
