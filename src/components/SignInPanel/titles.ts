import type { SignInMode } from './types';

/** Each mode's title, read by the page header here and by the dialog around a panel. */
export const SIGN_IN_TITLES: Record<SignInMode, string> = {
  'sign-in': 'Sign In',
  'sign-up': 'Create an Account',
};

/** The email view's heading in each mode: the form's own on the sign-in page, the dialog's title in a dialog. */
export const EMAIL_VIEW_TITLES: Record<SignInMode, string> = {
  'sign-in': 'Sign In with Email',
  'sign-up': 'Create an Account with Email',
};
