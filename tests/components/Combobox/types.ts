import type { ComboboxProps } from '@/components/Combobox/types';

/** The harness's props: the box's, less the text it holds itself, and what it starts with. */
export type HarnessProps = Partial<Omit<ComboboxProps, 'value' | 'onChange'>> & {
  initial?: string;
};
