import type { AccountPasskey } from '../../lib/types';

export interface PasskeysProps {
  /** The signed-in user's passkeys, from `accountPasskeys()`. */
  passkeys: readonly AccountPasskey[];
}

export interface PasskeyRowProps {
  passkey: AccountPasskey;
  /** Answers the failure to say in the dialog, or nothing on success. */
  onRename: (name: string) => Promise<string | undefined>;
  /** Resolves once the passkey is gone; a refusal rejects with the sentence to say under Remove. */
  onRemove: () => Promise<void>;
}

export interface RenameFieldsProps {
  /** The passkey's name now, or empty for one never named. */
  name: string;
  onRename: (name: string) => Promise<string | undefined>;
  close: () => void;
}
