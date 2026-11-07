export interface DateFieldProps {
  id: string;
  value: string;
  onChange: (value: string) => void;
  max?: string;
  min?: string;
  disabled?: boolean;
  /** The id of the label element, so the button reads "Date, 4 March 2026". */
  labelledBy: string;
  'aria-invalid'?: boolean;
  'aria-describedby'?: string;
}
