export type PasswordPurpose = 'current' | 'new';

export interface PasswordFieldProps {
  label: string;
  value: string;
  onChange: (value: string) => void;
  purpose: PasswordPurpose;
  error?: string;
  name?: string;
  required?: boolean;
}

export interface PasswordStrength {
  score: 0 | 1 | 2 | 3 | 4;
  warning: string | undefined;
}
