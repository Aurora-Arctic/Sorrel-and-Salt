import type { ReactElement } from 'react';
import { BackChevron } from '../IngredientEntry/back-chevron';
import type { SignInHeader, SignInLedes, SignInMode, SignInView } from './types';

// The panel's head, worked out once for the sign-in page and the dialog around a panel alike: each draws
// this result in its own slots (claude-docs/components/sign-in-panel.md, "The head").

const SIGN_IN_TITLES: Record<SignInMode, string> = {
  'sign-in': 'Sign In',
  'sign-up': 'Create an Account',
};

const EMAIL_VIEW_TITLES: Record<SignInMode, string> = {
  'sign-in': 'Sign In with Email',
  'sign-up': 'Create an Account with Email',
};

const BACK_LABELS: Record<SignInMode, string> = {
  'sign-in': 'Back to Sign-In Options',
  'sign-up': 'Back to Create Account Options',
};

const CODE_TITLE = 'Enter Your Code';

export function signInHeader({
  mode,
  view,
  lastUsedPassword,
  ledes,
}: {
  mode: SignInMode;
  view: SignInView;
  /** Whether this browser last signed in with a password. */
  lastUsedPassword: boolean;
  ledes?: SignInLedes;
}): SignInHeader {
  const titles = view === 'email' ? EMAIL_VIEW_TITLES : SIGN_IN_TITLES;
  return {
    title: view === 'code' ? CODE_TITLE : titles[mode],
    back: view === 'email',
    backLabel: BACK_LABELS[mode],
    lastUsed: view === 'email' && mode === 'sign-in' && lastUsedPassword,
    lede: ledes?.[mode],
    focusTitle: view === 'email',
  };
}

/** Back from the email form to the buttons, above the title. */
export const SignInBack = ({
  label,
  onBack,
}: {
  label: string;
  onBack: () => void;
}): ReactElement => (
  <button type="button" className="back-link sign-in-panel__back" onClick={onBack}>
    <BackChevron />
    {label}
  </button>
);

export const LastUsedMark = (): ReactElement => (
  <span className="badge badge--last-used">Last Used</span>
);
