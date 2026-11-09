import type { ReactElement } from 'react';
import type { ModeSwitchProps } from './types';

/** The foot's switch between signing in and creating an account, under the buttons and under the email form alike. */
const ModeSwitch = ({ mode, onSwitch }: ModeSwitchProps): ReactElement => {
  const signingUp = mode === 'sign-up';
  return (
    <p className="sign-in-panel__switch">
      {signingUp ? 'Already have an account?' : 'New here?'}{' '}
      <button
        type="button"
        className="btn btn--quiet btn--small"
        onClick={() => onSwitch(signingUp ? 'sign-in' : 'sign-up')}
      >
        {signingUp ? 'Sign In Instead' : 'Create an Account'}
      </button>
    </p>
  );
};

export default ModeSwitch;
