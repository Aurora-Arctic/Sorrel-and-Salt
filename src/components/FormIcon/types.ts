import type { FormGroupIcon } from '@/modules/vocabulary/schema/form-group-icons';

export interface FormIconProps {
  /**
   * The form group's icon name, or `null` for a form with none: an uncurated
   * form, or one whose group has no icon. Either draws the generic spoon, as
   * does a name the component does not know.
   */
  name: FormGroupIcon | null;
  /** A layout class from the caller, added after the icon's own. */
  className?: string;
}
