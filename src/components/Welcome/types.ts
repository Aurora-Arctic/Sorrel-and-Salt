export interface WelcomeProps {
  /**
   * Where Continue goes for a signed-in visitor: the landing for their role
   * (`postSignInLanding`), which the page reads from `getSession()`. Absent
   * while signed out, when the way in is Sign In.
   */
  landing?: string;
}
