import type { ComboboxProps } from '@/components/Combobox/types';

export type HarnessProps = Partial<Omit<ComboboxProps, 'value' | 'onChange'>> & {
  initial?: string;
};
