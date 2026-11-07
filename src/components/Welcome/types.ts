import type { Route } from 'next';

export interface WelcomeProps {
  /** The landing for their role (`postSignInLanding`); absent while signed out. */
  landing?: Route;
}
