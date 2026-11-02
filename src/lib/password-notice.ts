import { send } from './mail';
import { passwordChangedMessage } from '../emails/password-changed';
import type { PasswordChange } from '../emails/types';

/**
 * Tells `email` its account's password was just replaced, linking to `/forgot-password` under `origin` for a
 * holder who made no change. `send` never throws and refuses a placeholder address, so a notice never fails the change.
 */
export async function mailPasswordChanged(
  email: string,
  origin: string,
  how: PasswordChange,
): Promise<void> {
  await send(await passwordChangedMessage({ to: email, url: `${origin}/forgot-password`, how }));
}
