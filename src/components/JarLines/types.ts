import type { FormGroupIcon } from '@/modules/vocabulary/schema/form-group-icons';

/** One jar a coven holds, as its line on a card needs it. */
export interface JarLine {
  id: string;
  /** The variant's form as stored; the line writes it through `formLabel`. */
  form: string;
  /** The form group's icon, or `null` for a form with none. */
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
