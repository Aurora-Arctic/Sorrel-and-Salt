/** A password control's two kinds: the one an account has, and one being chosen. */
export type PasswordPurpose = 'current' | 'new';

export interface PasswordFieldProps {
  /** The visible label, in title case: "Password", "New Password". */
  label: string;
  value: string;
  onChange: (value: string) => void;
  /** `current` fills from a password manager; `new` offers to save, and shows the strength meter. */
  purpose: PasswordPurpose;
  /** The server's refusal, said under the field. */
  error?: string;
  /** The control's `name`, which a password manager keys the saved entry on. */
  name?: string;
  /** Marks the label and the control required. */
  required?: boolean;
}

/** How hard a password looks to guess, from 0 to 4, and what makes it weak, if anything does. */
export interface PasswordStrength {
  score: 0 | 1 | 2 | 3 | 4;
  warning: string | undefined;
}
