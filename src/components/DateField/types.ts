export interface DateFieldProps {
  id: string;
  /** The day, `YYYY-MM-DD`. */
  value: string;
  onChange: (value: string) => void;
  /** The last day that may be picked, `YYYY-MM-DD`. */
  max?: string;
  disabled?: boolean;
  /** The id of the label element, so the button reads "Date, 4 March 2026". */
  labelledBy: string;
  'aria-invalid'?: boolean;
  'aria-describedby'?: string;
}
