import type { AccountPasskey } from '../../lib/types';

export interface PasskeysProps {
  passkeys: readonly AccountPasskey[];
}

export interface PasskeyRowProps {
  passkey: AccountPasskey;
  onRename: (name: string) => Promise<string | undefined>;
  onRemove: () => Promise<void>;
}

export interface RenameFieldsProps {
  name: string;
  onRename: (name: string) => Promise<string | undefined>;
  close: () => void;
}
