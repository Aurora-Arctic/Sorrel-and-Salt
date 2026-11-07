import type { FormGroupIcon } from '@/modules/vocabulary/schema/form-group-icons';

export interface JarLine {
  id: string;
  form: string;
  icon: FormGroupIcon | null;
  /** On hand: `null` is held but not measured, `0` is out. */
  quantity: number | null;
  unit: string | null;
  /** The low-stock threshold, `null` or 0 for none. */
  threshold: number | null;
}

export interface JarLinesProps {
  jars: readonly JarLine[];
}
