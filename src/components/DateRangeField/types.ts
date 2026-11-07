export interface DayRange {
  from: string;
  to: string;
}

export interface QuickPick {
  label: string;
  range: () => DayRange;
}

export interface DateRangeFieldProps {
  id: string;
  /** The id of the label element, so the button reads "Minted, 1 Oct 2026 to 30 Oct 2026". */
  labelledBy: string;
  label: string;
  from: string;
  to: string;
  onChange: (range: DayRange) => void;
  quickPicks?: QuickPick[];
  min?: string;
  max?: string;
  placeholder?: string;
  /** Whether the range mostly looks back, so the calendar opens on the month before as well. */
  past?: boolean;
  'aria-invalid'?: boolean;
  'aria-describedby'?: string;
}
